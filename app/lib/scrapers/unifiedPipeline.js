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

// Acquire the lease before logging a start. Callback/lock errors reach the route.
export function runUnifiedScrapingPipeline(triggeredBy = 'CRON', options = {}) {
    return withScraperLock(() => withScraperLogContext({ runId: randomUUID() },
        () => runPipeline(triggeredBy, options)));
}

async function runPipeline(triggeredBy, options) {
    const startTime = Date.now();
    const now = new Date(startTime);
    const currentYear = now.getFullYear();
    const historical = options.fullHistorical !== undefined
        ? Boolean(options.fullHistorical) : now.getDay() === 0 || now.getDate() === 1;
    const years = [currentYear, currentYear + 1, ...(historical ? [currentYear - 1, currentYear - 2] : [])].map(String);
    const stats = {
        mode: historical ? 'FULL_HISTORICAL' : 'DAILY_ACTIVE',
        sourcesScraped: ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net'],
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
        await logInfo('SCRAPER', `Iniciada sincronização global [${historical ? 'Auditoria Histórica' : 'Sincronização Rápida Ativa'} (${years.join(', ')})] via ${triggeredBy}...`,
            { event: 'run-start', years, startedAt: now.toISOString() });

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
            await Promise.all([
                stage('fpc', 'FPC', true, async (saveOptions, target) => {
                    for (const year of years) {
                        await withScraperLogContext({ year }, async () => {
                            const before = target.metrics.processed;
                            let failed = false;
                            try { await scrapeFPC(year, saveOptions); }
                            catch (error) {
                                failed = true;
                                await logError('SCRAPER', `FPC ${year}: ${error.message}`, error);
                            }
                            stats.fpcEvents[year] = target.metrics.processed - before;
                            await logInfo('SCRAPER', `FPC ${year}: ${stats.fpcEvents[year]} eventos processados.`, {
                                event: 'source-year-complete', status: failed ? 'error' : 'done',
                                processed: stats.fpcEvents[year], metrics: { ...target.metrics }
                            });
                        });
                    }
                }),
                stage('cabreira', 'Cabreira', true, saveOptions => scrapeCabreira(null, saveOptions)),
                stage('stopandgo', 'Stop and Go', true, saveOptions => scrapeStopAndGo({ years, ...saveOptions }))
            ]);

            await stage('classificacoes', 'Classificações.net', false, () => scrapeClassificacoes({ years }));
            await stage('deepScrape', 'Deep Scraping FPC', false, async () => {
                let total = 0;
                for (let batch = 0; batch < (historical ? 2 : 1); batch++) {
                    const count = await incrementalDeepScrapeFPC(10);
                    total += count;
                    if (count === 0) break;
                }
                stats.deepScrapedFpc = total;
                return total;
            });
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

            const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
            const status = stats.errors.length ? 'partial' : 'success';
            await logInfo('SCRAPER', `Sincronização global concluída em ${durationSeconds}s.`, {
                ...stats, event: 'run-complete', status, durationSeconds,
                startedAt: now.toISOString(), completedAt: new Date().toISOString()
            });
            return { success: status === 'success', stats, durationSeconds };
        } catch (error) {
            await logError('SCRAPER', `Falha crítica na sincronização: ${error.message}`, {
                ...stats, event: 'run-complete', status: 'error', error: error.message,
                startedAt: now.toISOString(), completedAt: new Date().toISOString(),
                durationSeconds: Number(((Date.now() - startTime) / 1000).toFixed(1))
            });
            throw error;
        }
    });
}
