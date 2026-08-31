import { runUnifiedScrapingPipeline } from '@/app/lib/scrapers/unifiedPipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos máximo na Vercel

export async function GET(request) {
    try {
        const result = await runUnifiedScrapingPipeline('CRON_VERCEL (02:00 UTC)');
        return Response.json({ success: result.success, message: 'Scraping unificado e Base de Dados atualizada', ...result }, { status: result.success ? 200 : 500 });
    } catch(e) {
        if (e.code === 'SCRAPER_ALREADY_RUNNING') return Response.json({ success: true, skipped: true, message: 'Já existe uma sincronização em curso.' });
        console.error('Erro geral no cron de scraping:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

