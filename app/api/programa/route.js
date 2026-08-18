import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { deepScrapeFPC } from '@/app/lib/scrapers/fpc';
import { deepScrapeCabreira } from '@/app/lib/scrapers/cabreira';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const eventId = searchParams.get('id'); // Passado pelo EventModal

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        let programaHtml = null;

        if (targetUrl.includes('fpciclismo.pt')) {
            programaHtml = await deepScrapeFPC(targetUrl);
        } else if (targetUrl.includes('cabreirasolutions.com')) {
            programaHtml = await deepScrapeCabreira(targetUrl);
        }

        // Se encontrou dados e nos enviaram um ID, guardamos na BD para a próxima ser instantâneo!
        if (eventId && programaHtml) {
            try {
                await prisma.event.update({
                    where: { id: eventId },
                    data: { programa: programaHtml }
                });
            } catch (dbErr) {
                console.error('Falha ao guardar cache do programa na BD:', dbErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            programa: programaHtml,
            additionalLinks: [] // Links agora vão formatados diretamente no HTML
        });

    } catch (error) {
        console.error('Error extracting programa:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
