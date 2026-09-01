import { randomUUID } from 'node:crypto';
import { scrapeFPC, incrementalDeepScrapeFPC } from './fpc.js';
import { scrapeCabreira } from './cabreira.js';
import { scrapeStopAndGo } from './stopandgo.js';
import { scrapeClassificacoes } from './classificacoes.js';
import { prisma } from '../db.js';
import { isSameEvent } from '../merging/eventMatcher.js';
import { mergeEventRecords } from '../merging/eventMerger.js';
import { logInfo, logError, withScraperLogContext } from '../logger.js';
import { translateAllPendingEvents } from '../translationService.js';
import { withScraperLock } from './runLock.js';

const VALID_SCOPES = new Set(['daily', 'weekly', 'manual']);

export function getPipelineStages(scope, years) {
    const fpcStages = years.map(year => `fpc-${year}`);
    if (scope === 'daily') return ['cabreira', 'stopandgo', 'classificacoes', 'finalize'];
    if (scope === 'weekly') return [...fpcStages, 'deepScrape', 'finalize'];
    return [...fpcStages, 'cabreira', 'stopandgo', 'classificacoes', 'deepScrape', 'finalize'];
}

// Acquire the lease before logging a start. Callback/lock errors reach the route.
export function runUnifiedScrapingPipeline(triggeredBy = 'CRON', options = {}) {
    const runId = options.runId || randomUUID();
    return withScraperLock(() => withScraperLogContext({ runId },
        () => runPipeline(triggeredBy, { ...options, runId })));
}

/**
 * Trigger the next pipeline stage via an internal HTTP request.
 * The fetch fires a new serverless invocation; we wait briefly to ensure
 * the HTTP request reaches the network stack, then return without waiting
 * for the new invocation to finish (it runs independently).
 */
export async function triggerNextStage(result) {
    if (!result?.nextStage) return;
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000');
    const params = new URLSearchParams({
        stage: result.nextStage,
        runId: result.runId,
        years: result.years.join(','),
        scope: result.scope,
        attempt: String(result.nextAttempt || 1),
        hadErrors: String(Boolean(result.hadErrors)),
        triggeredBy: result.triggeredBy || 'CRON',
        ...(result.fullHistorical != null ? { historical: String(result.fullHistorical) } : {})
    });
    const continueUrl = `${baseUrl}/api/cron/scrape?${params}`;
    // Fire and don't wait for completion — the new invocation runs independently.
    // The 500ms pause ensures the HTTP request reaches Vercel's routing layer.
    const headers = process.env.CRON_SECRET
        ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
        : undefined;
    fetch(continueUrl, { headers }).catch(err => console.error('Erro ao continuar pipeline:', err));
    await new Promise(resolve => setTimeout(resolve, 500));
}

async function runPipeline(triggeredBy, options) {
    const { runId } = options;
    const startTime = Date.now();
    const now = new Date(startTime);
    const currentYear = now.getFullYear();
    const historical = options.fullHistorical !== undefined
        ? Boolean(options.fullHistorical) : now.getDay() === 0 || now.getDate() === 1;
    const years = options.years
        ? (Array.isArray(options.years) ? options.years : [])
        : [currentYear, currentYear + 1, ...(historical ? [currentYear - 1, currentYear - 2] : [])].map(String);

    const scope = VALID_SCOPES.has(options.scope) ? options.scope : 'manual';
    const pipelineStages = getPipelineStages(scope, years);
    const pipelineStage = options.pipelineStage || pipelineStages[0];
    if (!pipelineStages.includes(pipelineStage)) throw new Error(`Etapa inválida para a sincronização ${scope}`);
    const attempt = Math.min(Math.max(Number(options.attempt) || 1, 1), 3);

    const isFirstStage = pipelineStage === pipelineStages[0];
    const isLastStage = pipelineStage === 'finalize';

    const stats = {
        mode: historical ? 'FULL_HISTORICAL' : 'DAILY_ACTIVE',
        pipelineStage,
        scope,
        sourcesScraped: scope === 'daily'
            ? ['Cabreira', 'Stop and Go', 'Classificações.net']
            : scope === 'weekly' ? ['FPC'] : ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net'],
        yearsScraped: years, fpcEvents: {}, deepScrapedFpc: null, mergedEvents: null,
        sources: {}, steps: {}, errors: []
    };
    const observeError = ({ sourceId, stepId, year, message }) => {
        const target = sourceId ? stats.sources[sourceId] : stats.steps[stepId];
        if (target) {
            target.status = 'error';
            target.message = message.slice(0, 1000);
        }
        const error = `${sourceId || stepId || 'pipeline'}${year ? ` ${year}` : ''}: ${message}`.slice(0, 600);
        // Keep the final JSON summary within SystemLog's details limit.
        if (!stats.errors.includes(error) && stats.errors.length < 50) stats.errors.push(error);
    };

    return withScraperLogContext({ onError: observeError }, async () => {
        if (isFirstStage && !options.startLogged) {
            await logInfo('SCRAPER', `Iniciada sincronização ${scope} [${historical ? 'Auditoria Histórica' : 'Sincronização Rápida Ativa'} (${years.join(', ')})] via ${triggeredBy}...`,
                { event: 'run-start', scope, years, startedAt: now.toISOString() });
        } else if (!isFirstStage) {
            await logInfo('SCRAPER', `Continuação da sincronização: etapa ${pipelineStage}`,
                { event: 'pipeline-stage-resume', pipelineStage, years });
        }

        // Metrics count settled save operations, not distinct database inventory.
        async function stage(id, name, source, work) {
            const started = Date.now();
            const target = { status: 'running', count: null, duration: null, message: 'Em curso' };
            if (source) target.metrics = { processed: 0, created: 0, updated: 0, merged: 0, quarantined: 0 };
            (source ? stats.sources : stats.steps)[id] = target;
            return withScraperLogContext(source ? { sourceId: id, stepId: null } : { sourceId: null, stepId: id }, async () => {
                const snapshot = (event) => ({ event, ...(source ? { sourceId: id } : { stepId: id }), ...target });
                await logInfo('SCRAPER', `${name}: início.`, snapshot('stage-start'));
                const onResult = async ({ action }) => {
                    if (!Object.hasOwn(target.metrics, action) || action === 'processed') return;
                    target.metrics[action]++;
                    target.metrics.processed++;
                    target.count = target.metrics.processed;
                    if (target.count % 25 === 0) await logInfo('SCRAPER', `${name}: ${target.count} provas processadas.`, snapshot('stage-progress'));
                };
                try {
                    const count = await work({ onResult }, target);
                    target.count = source ? target.metrics.processed : (Number.isFinite(count) ? count : null);
                    if (target.status !== 'error') {
                        target.status = 'done';
                        target.message = target.count === null ? 'Concluído; contagem indisponível' : `${target.count} ${source ? 'processados (não necessariamente novos)' : 'processados'}`;
                    }
                } catch (error) {
                    await logError('SCRAPER', `${name}: ${error.message}`, error);
                }
                target.duration = `${((Date.now() - started) / 1000).toFixed(1)}s`;
                await logInfo('SCRAPER', `${name}: ${target.status === 'error' ? 'concluído com erros' : 'concluído'} em ${target.duration}.`, snapshot('stage-complete'));
            });
        }

        try {
            switch (pipelineStage) {
                case 'cabreira':
                    await stage('cabreira', 'Cabreira', true, saveOptions => scrapeCabreira(null, saveOptions));
                    break;
                case 'stopandgo':
                    await stage('stopandgo', 'Stop and Go', true, saveOptions => scrapeStopAndGo({ years, ...saveOptions }));
                    break;
                case 'classificacoes':
                    await stage('classificacoes', 'Classificações.net', false, () => scrapeClassificacoes({ years }));
                    break;
                case 'deepScrape':
                    await stage('deepScrape', 'Deep Scraping FPC', false, async () => {
                        const count = await incrementalDeepScrapeFPC(historical ? 20 : 10);
                        stats.deepScrapedFpc = count;
                        return count;
                    });
                    break;
                case 'finalize':
                    await stage('unification', 'Unificação', false, async () => {
                        const allEvents = await prisma.event.findMany({ orderBy: { sortDate: 'asc' } });
                        const mergedMap = new Set();
                        let mergedCount = 0;
                        for (let i = 0; i < allEvents.length; i++) {
                            const primary = allEvents[i];
                            if (mergedMap.has(primary.id)) continue;
                            for (let j = i + 1; j < allEvents.length; j++) {
                                const secondary = allEvents[j];
                                if (mergedMap.has(secondary.id)) continue;
                                if (isSameEvent(primary, secondary)) {
                                    const mergedData = mergeEventRecords(primary, secondary);
                                    await prisma.$transaction(async tx => {
                                        await tx.event.update({ where: { id: primary.id }, data: mergedData });
                                        // Move languages missing on the retained event;
                                        // fill empty fields for languages it already has.
                                        const translations = await tx.eventTranslation.findMany({ where: { eventId: secondary.id } });
                                        for (const translation of translations) {
                                            const where = { eventId_language: { eventId: primary.id, language: translation.language } };
                                            const existing = await tx.eventTranslation.findUnique({ where });
                                            if (!existing) {
                                                await tx.eventTranslation.update({ where: { id: translation.id }, data: { eventId: primary.id } });
                                            } else {
                                                const fill = {};
                                                for (const field of ['title', 'details', 'description', 'programa']) {
                                                    if (!existing[field] && translation[field]) fill[field] = translation[field];
                                                }
                                                if (Object.keys(fill).length) await tx.eventTranslation.update({ where, data: fill });
                                            }
                                        }
                                        await tx.event.delete({ where: { id: secondary.id } });
                                    });
                                    mergedMap.add(secondary.id);
                                    mergedCount++;
                                    Object.assign(primary, mergedData);
                                }
                            }
                        }
                        stats.mergedEvents = mergedCount;
                        return mergedCount;
                    });
                    await stage('translation', 'Tradução', false, async () => {
                        const result = await translateAllPendingEvents('en', 100);
                        stats.translations = result ? { ...result, ...(result.error ? { error: String(result.error).slice(0, 1000) } : {}) } : null;
                        if (result?.success === false) throw new Error(result.error || 'Falha na tradução');
                        return result?.translatedCount;
                    });
                    break;
                default: {
                    const year = pipelineStage.match(/^fpc-(\d{4})$/)?.[1];
                    if (!year) throw new Error(`Etapa desconhecida: ${pipelineStage}`);
                    await withScraperLogContext({ year }, () => stage('fpc', `FPC ${year}`, true, async (saveOptions, target) => {
                        await scrapeFPC(year, saveOptions);
                        stats.fpcEvents[year] = target.metrics.processed;
                        await logInfo('SCRAPER', `FPC ${year}: ${stats.fpcEvents[year]} eventos processados.`, {
                            event: 'source-year-complete', status: 'done',
                            processed: stats.fpcEvents[year], metrics: { ...target.metrics }
                        });
                    }));
                }
            }

            const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
            const failed = stats.errors.length > 0;
            const retrying = failed && attempt < 3;
            const stageIndex = pipelineStages.indexOf(pipelineStage);
            const nextStage = retrying
                ? pipelineStage
                : (stageIndex < pipelineStages.length - 1 ? pipelineStages[stageIndex + 1] : null);
            const hadErrors = Boolean(options.hadErrors) || (failed && !retrying);

            if (isLastStage && !retrying) {
                const status = hadErrors || failed ? 'partial' : 'success';
                await logInfo('SCRAPER', `Sincronização global concluída em ${durationSeconds}s.`, {
                    ...stats, event: 'run-complete', status, durationSeconds,
                    startedAt: now.toISOString(), completedAt: new Date().toISOString()
                });
            } else {
                await logInfo('SCRAPER', `Etapa ${pipelineStage} concluída em ${durationSeconds}s.`,
                    { ...stats, event: 'pipeline-stage-done', pipelineStage, nextStage, durationSeconds });
            }

            return {
                success: isLastStage ? !(hadErrors || failed) : true,
                stats, durationSeconds, nextStage, runId, years,
                scope, attempt, nextAttempt: retrying ? attempt + 1 : 1,
                hadErrors, triggeredBy, fullHistorical: historical
            };
        } catch (error) {
            const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
            await logError('SCRAPER', `Falha crítica na sincronização (etapa ${pipelineStage}): ${error.message}`, {
                ...stats, event: 'run-complete', status: 'error', error: error.message,
                startedAt: now.toISOString(), completedAt: new Date().toISOString(),
                durationSeconds
            });
            throw error;
        }
    });
}
