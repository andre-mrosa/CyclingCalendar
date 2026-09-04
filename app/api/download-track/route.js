import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const url = searchParams.get('url');
    const title = searchParams.get('title') || 'track';

    const safeTitle = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    const downloadFilename = `${safeTitle || 'track'}.gpx`;

    // 1. Tentar ler ficheiro local existente no servidor por eventId
    if (eventId) {
        const cleanEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const localPath = path.join(process.cwd(), 'public', 'media', 'events', cleanEventId, 'track.gpx');
        if (fs.existsSync(localPath)) {
            const fileBuffer = fs.readFileSync(localPath);
            return new Response(fileBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/gpx+xml; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${downloadFilename}"`,
                    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
                }
            });
        }
    }

    // 2. Se for um caminho local direto (/media/events/...)
    if (url && url.startsWith('/media/events/')) {
        const relativePath = url.replace(/^\//, '');
        const localPath = path.join(process.cwd(), 'public', relativePath);
        if (fs.existsSync(localPath)) {
            const fileBuffer = fs.readFileSync(localPath);
            return new Response(fileBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/gpx+xml; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${downloadFilename}"`,
                    'Cache-Control': 'public, max-age=86400'
                }
            });
        }
    }

    // 3. Se for uma URL remota real (.gpx)
    if (url && url.startsWith('http') && /\.gpx/i.test(url)) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'CyclingCalendar/2.0 (GPX Downloader)'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                return new Response(arrayBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/gpx+xml; charset=utf-8',
                        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
                        'Cache-Control': 'public, max-age=86400'
                    }
                });
            }
        } catch (e) {
            console.error('[download-track] Error fetching remote GPX:', e.message);
        }
    }

    return new Response('Track GPX não disponível para download imediato.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}
