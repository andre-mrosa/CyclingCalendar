import { incrementalDeepScrapeFPC } from '@/app/lib/scrapers/fpc';
import { prisma } from '@/app/lib/db';

export async function GET(request) {
    try {
        let totalProcessed = 0;
        let lastResult = -1;

        // Force reset the cache for recent and future FPC events
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        await prisma.event.updateMany({
            where: { 
                source: 'FPC',
                sortDate: { gte: threeMonthsAgo }
            },
            data: { programa: null }
        });

        // Loop até o scraper não ter mais nada para processar (limite máximo de segurança: 100 vezes)
        for (let i = 0; i < 100; i++) {
            lastResult = await incrementalDeepScrapeFPC();
            if (lastResult === 0) break; // Acabaram-se os eventos
            totalProcessed += lastResult || 0;
            
            // Pausa de 1 segundo entre lotes
            await new Promise(r => setTimeout(r, 1000));
        }

        return Response.json({ success: true, totalProcessed });
    } catch(e) {
        return Response.json({ success: false, error: e.message });
    }
}
