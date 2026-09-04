import { prisma } from '../../lib/db';
import { downloadAndParseGpx } from '../../lib/scrapers/assetDownloader';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { programa: { contains: '.gpx' } },
                    { extraLinks: { contains: '.gpx' } }
                ]
            }
        });

        const results = [];

        for (const ev of events) {
            const text = `${ev.programa || ''} ${ev.extraLinks || ''}`;
            const match = text.match(/https?:\/\/[^\s"'<>]+\.gpx/i);
            if (!match) continue;

            const gpxUrl = match[0];
            const gpxResult = await downloadAndParseGpx(gpxUrl, ev.id);

            if (gpxResult && gpxResult.gpxData) {
                const updateData = {
                    gpxData: JSON.stringify(gpxResult.gpxData)
                };

                // Substituir url externa pela local no programa se existir
                if (ev.programa && ev.programa.includes(gpxUrl)) {
                    updateData.programa = ev.programa.replaceAll(gpxUrl, gpxResult.localGpxUrl);
                }

                // Substituir url externa nos extraLinks se existir
                if (ev.extraLinks && ev.extraLinks.includes(gpxUrl)) {
                    updateData.extraLinks = ev.extraLinks.replaceAll(gpxUrl, gpxResult.localGpxUrl);
                }

                await prisma.event.update({
                    where: { id: ev.id },
                    data: updateData
                });

                results.push({
                    id: ev.id,
                    title: ev.title,
                    distanceKm: gpxResult.gpxData.distanceKm,
                    elevationGain: gpxResult.gpxData.elevationGain,
                    localFile: gpxResult.localGpxUrl
                });
            }
        }

        return NextResponse.json({
            success: true,
            totalFound: events.length,
            syncedCount: results.length,
            results
        });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
