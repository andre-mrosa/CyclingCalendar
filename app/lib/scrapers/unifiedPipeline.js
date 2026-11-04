import { randomUUID } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { scrapeFPC } from './fpc.js';
import { scrapeCabreira } from './cabreira.js';
import { scrapeStopAndGo } from './stopandgo.js';
import { scrapeRecordePessoal } from './recordepessoal.js';
import { scrapeApedalar } from './apedalar.js';
import { validateCalendarTranslations } from '../validateCalendarTranslations.js';
import { prisma } from '../db.js';
import { logInfo, logError, withScraperLogContext } from '../logger.js';
import { withScraperLock } from './runLock.js';
import {recordSourceQuality} from '../sourceQuality.js';
import {cleanTrustData} from '../trustRetention.js';

const VALID_SCOPES = new Set(['daily', 'weekly', 'manual', 'stopandgo']);

export function getPipelineStages(scope, years) {
    if (scope === 'stopandgo') return ['stopandgo', 'finalize'];
    const fpcStages = years.map(year => `fpc-${year}`);
    if (scope === 'daily') return [...fpcStages, 'cabreira', 'stopandgo', 'recordepessoal', 'apedalar', 'translation', 'finalize'];
    if (scope === 'weekly') return [...fpcStages, 'translation', 'finalize'];
    return [...fpcStages, 'cabreira', 'stopandgo', 'recordepessoal', 'apedalar', 'translation', 'finalize'];
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
    const years = options.years || [currentYear.toString(), (currentYear + 1).toString()];
    if (!Array.isArray(years) || !years.length || !years.every(year=>/^\d{4}$/.test(year))) throw new Error('Épocas de sincronização inválidas');

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
        sourcesScraped: scope === 'stopandgo' ? ['Stop and Go'] : scope === 'weekly' ? ['FPC'] : ['FPC', 'Cabreira', 'Stop and Go', 'Recorde Pessoal', 'Apedalar'],
        yearsScraped: years, fpcEvents: {}, deepScrapedFpc: null, mergedEvents: null,
        sources: {}, steps: {}, errors: []
    };
    let sourceContinuation = null, sourceRetryAt = null;
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
            if(id==='stopandgo' && options.sourceContinuation?.metrics) {
                target.metrics={...target.metrics,...options.sourceContinuation.metrics};
                if(options.sourceContinuation.hadErrors) {
                    target.status='error'; target.message=options.sourceContinuation.errorMessage||'Uma página não foi lida num bloco anterior.';
                }
            }
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
                    const count = await work({ onResult, onCoverage:coverage=>{target.coverage=coverage;} }, target);
                    target.count = source ? target.metrics.processed : (Number.isFinite(count) ? count : null);
                    if(id==='stopandgo' && count?.continuation) {
                        sourceContinuation={...count.continuation,metrics:{...target.metrics},hadErrors:target.status==='error',errorMessage:target.status==='error'?target.message:null,startedAt:options.sourceContinuation?.startedAt||new Date(started).toISOString(),durationSeconds:(options.sourceContinuation?.durationSeconds||0)+(Date.now()-started)/1000};
                        target.message=`Recolha em curso: ${count.continuation.nextIndex} de ${count.continuation.urls.length} páginas verificadas. A continuar no próximo bloco.`;
                    } else if (target.status !== 'error') {
                        target.status = 'done';
                        target.message = target.count === null ? 'Concluído; contagem indisponível' : `${target.count} ${source ? 'processados (não necessariamente novos)' : 'processados'}`;
                    }
                } catch (error) {
                    if (error.retryable === false) target.retryable = false;
                    if (id==='stopandgo' && error.status===429 && Number.isFinite(Date.parse(error.retryAt))) {
                        sourceRetryAt=error.retryAt; target.retryAt=error.retryAt;
                    }
                    await logError('SCRAPER', `${name}: ${error.message}`, error);
                }
                target.duration = `${((Date.now() - started) / 1000+(id==='stopandgo'?options.sourceContinuation?.durationSeconds||0:0)).toFixed(1)}s`;
                if(source&&!sourceContinuation&&prisma.sourceQualitySnapshot){
                    try {await recordSourceQuality({db:prisma,source:{fpc:'FPC',cabreira:'Cabreira',stopandgo:'Stop and Go',recordepessoal:'Recorde Pessoal',apedalar:'Apedalar'}[id]||name,year:id==='fpc'?years.find(year=>pipelineStage==='fpc-'+year):null,runId,startedAt:new Date(id==='stopandgo'&&options.sourceContinuation?.startedAt||started),partial:target.status==='error',coverage:target.coverage});}
                    catch {await logInfo('SCRAPER',`${name}: controlo de qualidade indisponível.`,{event:'quality-unavailable',sourceId:id});}
                }
                await logInfo('SCRAPER', sourceContinuation?`${name}: a continuar no próximo bloco.`:`${name}: ${target.status === 'error' ? 'concluído com erros' : 'concluído'} em ${target.duration}.`, snapshot(sourceContinuation?'stage-progress':'stage-complete'));
            });
        }

        try {
            switch (pipelineStage) {
                case 'cabreira':
                    await stage('cabreira', 'Cabreira', true, saveOptions => scrapeCabreira(null, saveOptions));
                    break;
                case 'stopandgo':
                    await stage('stopandgo', 'Stop and Go', true, saveOptions => scrapeStopAndGo({years,...saveOptions,progress:options.sourceContinuation}));
                    break;
                case 'recordepessoal':
                    await stage('recordepessoal', 'Recorde Pessoal', true, saveOptions => scrapeRecordePessoal({ years, ...saveOptions }));
                    break;
                case 'apedalar':
                    await stage('apedalar', 'Apedalar', true, saveOptions => scrapeApedalar(prisma, years, { ...saveOptions }));
                    break;
                case 'translation':
                    await stage('translation', 'Validação dos idiomas da interface', false, async () => {
                        stats.translations = validateCalendarTranslations();
                        return stats.translations.validatedLanguages;
                    });
                    break;
                case 'finalize':
                    await stage('finalize', 'Recolha mínima concluída', false, async () => {
                        if(prisma.organizerSubmission&&prisma.sourceQualitySnapshot&&prisma.searchAlertRun)await cleanTrustData(prisma);
                        revalidateTag('calendar-events', { expire:0 });
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
            const failed = stats.errors.length > 0 || Object.values(stats.sources).some(target=>target.status==='error');
            // Do not refetch an entire partially processed source for one failed
            // page, or retry an explicit access refusal in the same run.
            const sourceStates = Object.values(stats.sources);
            const retrying = !sourceContinuation && failed && attempt < 3 && !sourceStates.some(target =>
                target.retryable === false || target.metrics.processed > 0 || target.coverage?.discovered > 0);
            const stageIndex = pipelineStages.indexOf(pipelineStage);
            const nextStage = sourceContinuation ? pipelineStage : retrying
                ? pipelineStage
                : (stageIndex < pipelineStages.length - 1 ? pipelineStages[stageIndex + 1] : null);
            const hadErrors = Boolean(options.hadErrors) || (failed && !retrying);

            if (isLastStage && !retrying) {
                const status = hadErrors || failed ? 'partial' : 'success';
                const runStart = options.startedAt && Number.isFinite(Date.parse(options.startedAt)) ? new Date(options.startedAt) : now;
                const totalSeconds = Number(((Date.now() - runStart.getTime()) / 1000).toFixed(1));
                await logInfo('SCRAPER', `Sincronização global concluída em ${totalSeconds}s.`, {
                    ...stats, event: 'run-complete', status, durationSeconds:totalSeconds,
                    startedAt: runStart.toISOString(), completedAt: new Date().toISOString()
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
                hadErrors, triggeredBy, fullHistorical: historical, sourceContinuation, sourceRetryAt
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
