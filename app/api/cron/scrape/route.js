import { scrapeCabreira } from '@/app/lib/scrapers/cabreira';
import { scrapeFPC, incrementalDeepScrapeFPC } from '@/app/lib/scrapers/fpc';

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const authHeader = request.headers.get('authorization');
        
        // Em produção deveríamos ter:
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ success: false }, { status: 401 });
        
        const year = new Date().getFullYear().toString();
        const nextYear = (new Date().getFullYear() + 1).toString();
        
        // 1. Scraping Cabreira
        await scrapeCabreira(year);
        await scrapeCabreira(nextYear);
        
        // 2. Scraping FPC
        await scrapeFPC(year);
        await scrapeFPC(nextYear);
        
        // 3. Incremental Deep Scraping FPC (Batch de 5 para evitar bloqueios)
        await incrementalDeepScrapeFPC();

        return Response.json({ success: true, message: 'Scraping concluído e Base de Dados atualizada' });
    } catch(e) {
        console.error('Erro geral no cron de scraping:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
