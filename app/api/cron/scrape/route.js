import { runUnifiedScrapingPipeline, triggerNextStage } from '@/app/lib/scrapers/unifiedPipeline';
import { logError, withScraperLogContext } from '@/app/lib/logger';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos máximo na Vercel

export async function GET(request) {
    try {
        if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return Response.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const pipelineStage = searchParams.get('stage') || undefined;
        const scope = searchParams.get('scope') || 'daily';
        const runId = searchParams.get('runId') || undefined;
        const yearsParam = searchParams.get('years');
        const years = yearsParam ? yearsParam.split(',') : undefined;
        const triggeredBy = searchParams.get('triggeredBy') || 'CRON_VERCEL (02:00 UTC)';
        const fullHistorical = searchParams.has('historical') ? searchParams.get('historical') === 'true' : undefined;
        const attempt = Number(searchParams.get('attempt')) || 1;
        const hadErrors = searchParams.get('hadErrors') === 'true';

        const result = await runUnifiedScrapingPipeline(triggeredBy, {
            pipelineStage, scope, runId, years, fullHistorical, attempt, hadErrors
        });

        // Respond as soon as this bounded stage ends. `after` keeps the
        // continuation request alive without making all stages share the same
        // serverless execution limit.
        if (result.nextStage) after(async () => {
            try {
                await triggerNextStage(result);
            } catch (error) {
                await withScraperLogContext({ runId: result.runId }, () => logError(
                    'SCRAPER',
                    `Falha crítica na sincronização ao iniciar a etapa ${result.nextStage}: ${error.message}`,
                    { event: 'run-complete', status: 'error', pipelineStage: result.nextStage,
                        error: error.message, completedAt: new Date().toISOString() }
                ));
                console.error('Erro ao continuar pipeline:', error);
            }
        });

        return Response.json({
            success: result.success,
            message: result.nextStage
                ? `Etapa ${pipelineStage || result.stats.pipelineStage} concluída. Continuação para ${result.nextStage} iniciada.`
                : 'Sincronização global concluída.',
            ...result
        }, { status: result.success ? 200 : 500 });
    } catch(e) {
        if (e.code === 'SCRAPER_ALREADY_RUNNING') return Response.json({ success: true, skipped: true, message: 'Já existe uma sincronização em curso.' });
        console.error('Erro geral no cron de scraping:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
