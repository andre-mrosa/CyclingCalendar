import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { deepScrapeFPC } from '@/app/lib/scrapers/fpc';

export async function GET(request) {
    try {
        const events = await prisma.event.findMany({
            where: { 
                source: 'FPC',
                link: { contains: 'fpciclismo.pt' }
            }
        });
        
        let processedCount = 0;
        for (const ev of events) {
            try {
                const programaHtml = await deepScrapeFPC(ev.link);
                await prisma.event.update({ 
                    where: { id: ev.id }, 
                    data: { programa: programaHtml || '<p>Detalhes de programa indisponíveis na página da FPC.</p>' } 
                });
                processedCount++;
            } catch (err) {
                console.error('Erro a processar evento ' + ev.id + ':', err);
                await prisma.event.update({ 
                    where: { id: ev.id }, 
                    data: { programa: '<p>Erro ao extrair detalhes na página da FPC.</p>' } 
                });
            }
            // Sleep to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return NextResponse.json({ success: true, processedCount });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
