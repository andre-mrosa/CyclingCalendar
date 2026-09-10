import { RetryableError } from 'workflow';

export async function executeCalendarStage(options) {
    'use step';
    const { runUnifiedScrapingPipeline } = await import('../lib/scrapers/unifiedPipeline.js');
    try {
        return await runUnifiedScrapingPipeline(options.triggeredBy, options);
    } catch (error) {
        if (error.code === 'SCRAPER_ALREADY_RUNNING') {
            throw new RetryableError('Outra etapa ainda detém a reserva.', { retryAfter: '16m' });
        }
        throw error;
    }
}

executeCalendarStage.maxRetries = 2;

export async function recordCalendarFailure(runId, pipelineStage, error) {
    'use step';
    const { logError, withScraperLogContext } = await import('../lib/logger.js');
    await withScraperLogContext({ runId }, () => logError('SCRAPER',
        `Falha crítica na sincronização na etapa ${pipelineStage || 'inicial'}: ${error}`,
        { event: 'run-complete', status: 'error', pipelineStage, error,
            completedAt: new Date().toISOString() }));
}
