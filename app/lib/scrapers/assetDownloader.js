import fs from 'fs';
import path from 'path';
import { parseGpxElevation } from '../../utils/gpxParser.js';

/**
 * Downloads an external asset (image, poster, gpx) to local storage.
 * Saves to public/media/events/[eventId]/[filename]
 * Returns the local public URL path: /media/events/[eventId]/[filename]
 */
export async function downloadEventAsset(url, eventId, preferredFilename = null, customReferer = null) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return null;
    }

    try {
        const cleanEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetDir = path.join(process.cwd(), 'public', 'media', 'events', cleanEventId);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const parsedUrl = new URL(url);
        let ext = path.extname(parsedUrl.pathname);
        if (!ext || ext.length > 5) {
            ext = '.png';
        }

        const filename = preferredFilename 
            ? (preferredFilename.includes('.') ? preferredFilename : `${preferredFilename}${ext}`)
            : `asset_${Date.now()}${ext}`;

        const filePath = path.join(targetDir, filename);
        const publicUrl = `/media/events/${cleanEventId}/${filename}`;

        // If already downloaded and has content, return existing
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
            return publicUrl;
        }

        const originReferer = customReferer || `${parsedUrl.protocol}//${parsedUrl.host}/`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': originReferer,
                'Accept': 'image/*,application/*,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) {
            console.warn(`[assetDownloader] Failed to fetch ${url} (HTTP ${res.status})`);
            return null;
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        // Avoid saving hotlink error images if file is unexpectedly small
        if (buffer.length < 500) {
            console.warn(`[assetDownloader] Asset too small (${buffer.length} bytes), skipping ${url}`);
            return null;
        }

        fs.writeFileSync(filePath, buffer);
        console.log(`[assetDownloader] Saved ${url} -> ${publicUrl} (${buffer.length} bytes)`);
        return publicUrl;
    } catch (err) {
        console.error(`[assetDownloader] Error downloading ${url}:`, err.message);
        return null;
    }
}

/**
 * Downloads and parses an official GPX file.
 * Saves local track.gpx and extracts elevation points & D+ stats.
 * Returns { localGpxUrl, gpxData }
 */
export async function downloadAndParseGpx(gpxUrl, eventId) {
    if (!gpxUrl || typeof gpxUrl !== 'string' || !gpxUrl.startsWith('http')) {
        return null;
    }

    try {
        const cleanEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetDir = path.join(process.cwd(), 'public', 'media', 'events', cleanEventId);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, 'track.gpx');
        const publicUrl = `/media/events/${cleanEventId}/track.gpx`;

        let xmlText = '';

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
            xmlText = fs.readFileSync(filePath, 'utf8');
        } else {
            const res = await fetch(gpxUrl, {
                headers: {
                    'User-Agent': 'CyclingCalendar/2.0 (GPX Importer)'
                },
                signal: AbortSignal.timeout(20000)
            });

            if (!res.ok) {
                console.warn(`[assetDownloader] Failed to fetch GPX ${gpxUrl} (HTTP ${res.status})`);
                return null;
            }

            xmlText = await res.text();
            if (xmlText.length < 200 || !xmlText.includes('<gpx')) {
                console.warn(`[assetDownloader] Invalid GPX content from ${gpxUrl}`);
                return null;
            }

            fs.writeFileSync(filePath, xmlText, 'utf8');
            console.log(`[assetDownloader] Saved GPX to ${publicUrl} (${xmlText.length} chars)`);
        }

        const elevationData = parseGpxElevation(xmlText);
        return {
            localGpxUrl: publicUrl,
            gpxData: elevationData
        };
    } catch (err) {
        console.error(`[assetDownloader] Error downloading/parsing GPX ${gpxUrl}:`, err.message);
        return null;
    }
}
