import { randomUUID } from 'node:crypto';
import { scrapeFPC } from './fpc.js';
import { scrapeCabreira } from './cabreira.js';
import { scrapeStopAndGo } from './stopandgo.js';
import { scrapeRecordePessoal } from './recordepessoal.js';
import { scrapeApedalar } from './apedalar.js';
import { scrapeClassificacoes } from './classificacoes.js';
import { prisma } from '../db.js';
import { logInfo, logError, withScraperLogContext } from '../logger.js';
import { withScraperLock } from './runLock.js';

const VALID_SCOPES = new Set(['daily', 'weekly', 'manual']);

export function getPipelineStages(scope, years) {
    const fpcStages = years.map(year => `fpc-${year}`);
    if (scope === 'daily') return ['cabreira', 'stopandgo', 'recordepessoal', 'apedalar', 'classificacoes', 'finalize'];
    if (scope === 'weekly') return [...fpcStages, 'finalize'];
    return [...fpcStages, 'cabreira', 'stopandgo', 'recordepessoal', 'apedalar', 'classificacoes', 'finalize'];
}

// Acquire the lease before logging a start. Callback/lock errors reach the route.
export function runUnifiedScrapingPipeline(triggeredBy = 'CRON', options = {}) {
    const runId = options.runId || randomUUID();
    return withScraperLock(() => withScraperLogContext({ runId },
        () => runPipeline(triggeredBy, { ...options, runId })));
}

async function runPipeline(triggeredBy, options) {
    const { runId } = options;
    const startTime = Date.now();
    const now = new Date(startTime);
    const currentYear = now.getFullYear();
    // By owner request, we only process current and future events to save resources
    const historical = false; 
    const years = [currentYear.toString(), (currentYear + 1).toString()];

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
              ? ['Cabreira', 'Recorde Pessoal', 'Apedalar', 'Classificações.net']
              : scope === 'weekly' ? ['FPC'] : ['FPC', 'Cabreira', 'Recorde Pessoal', 'Apedalar', 'Classificações.net'],
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
                    await stage('stopandgo', 'Stop and Go', true, saveOptions => scrapeStopAndGo(saveOptions));
                    break;
                case 'recordepessoal':
                    await stage('recordepessoal', 'Recorde Pessoal', true, saveOptions => scrapeRecordePessoal({ years, ...saveOptions }));
                    break;
                case 'apedalar':
                    await stage('apedalar', 'Apedalar', true, saveOptions => scrapeApedalar(prisma, years[0], { ...saveOptions }));
                    break;
                case 'classificacoes':
                    await stage('classificacoes', 'Classificações.net', false, () => scrapeClassificacoes({ years }));
                    break;
                case 'finalize':
                    await stage('finalize', 'Recolha mínima concluída', false, async () => {
                        return prisma.event.count();
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
                    { ...stats, event: 'pipeline-stage-done', pipelineStage, nextStage, durationSeconds,
                        nextAttempt: retrying ? attempt + 1 : 1, hadErrors });
            }

            return {
                success: isLastStage ? !(hadErrors || failed) : true,
                stats, durationSeconds, nextStage, runId, years,
                scope, attempt, nextAttempt: retrying ? attempt + 1 : 1,
                hadErrors, triggeredBy, fullHistorical: historical
            };
        } catch (error) {
            const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
            await logError('SCRAPER', `${options.durable ? "Falha na tentativa" : "Falha crítica na sincronização"} (etapa ${pipelineStage}): ${error.message}`, {
                ...stats, event: options.durable ? 'stage-failure' : 'run-complete', status: 'error', error: error.message,
                startedAt: now.toISOString(), completedAt: new Date().toISOString(),
                durationSeconds
            });
            throw error;
        }
    });
}
