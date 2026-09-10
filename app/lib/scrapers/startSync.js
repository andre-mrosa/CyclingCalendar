import { randomUUID } from 'node:crypto';
import { start, getRun } from 'workflow/api';
import { calendarSyncWorkflow } from '../../workflows/calendarSync.js';
import { prisma } from '../db.js';
import { logInfo, logError, withScraperLogContext } from '../logger.js';
import { withScraperLock } from './runLock.js';
import { getPipelineStages } from './unifiedPipeline.js';

export async function startCalendarSync({ scope = 'manual', fullHistorical = false, resume = false, triggeredBy = 'ADMIN_MANUAL' } = {}) {
    return withScraperLock(async () => {
        const previous = await prisma.systemLog.findFirst({
            where: { source: 'SCRAPER', message: 'Workflow de sincronização agendado.' },
            orderBy: { createdAt: 'desc' }
        });
        if (previous) {
            const details = JSON.parse(previous.details);
            const status = await getRun(details.workflowId).status;
            if (status === 'pending' || status === 'running') {
                throw Object.assign(new Error('Já existe uma sincronização em curso.'), { code: 'SCRAPER_ALREADY_RUNNING' });
            }
        }
        const startedAt = new Date().toISOString();
        const currentYear = new Date().getFullYear();
        let years = [currentYear, currentYear + 1, ...(fullHistorical ? [currentYear - 1, currentYear - 2] : [])].map(String);
        let pipelineStage;
        let resumedFrom;
        if (resume) {
            // Only resume a persisted transition of the most recently started run.
            const latest = await prisma.systemLog.findFirst({ where: { source: 'SCRAPER', message: { startsWith: 'Iniciada sincronização' } }, orderBy: { createdAt: 'desc' } });
            const previousRunId = latest && JSON.parse(latest.details).runId;
            const checkpoint = previousRunId && await prisma.systemLog.findFirst({
                where: { source: 'SCRAPER', AND: [
                    { details: { contains: previousRunId } },
                    { details: { contains: '"event": "pipeline-stage-done"' } }
                ] }, orderBy: { createdAt: 'desc' }
            });
            const saved = checkpoint && JSON.parse(checkpoint.details);
            if (!saved?.nextStage) throw new Error('Não existe uma etapa pendente confirmada para retomar.');
            years = saved.yearsScraped;
            scope = saved.scope;
            fullHistorical = saved.mode === 'FULL_HISTORICAL';
            pipelineStage = saved.nextStage;
            resumedFrom = previousRunId;
        }
        if (!['daily', 'weekly', 'manual'].includes(scope) || !Array.isArray(years) ||
            !years.every(year => /^\d{4}$/.test(year)) ||
            (pipelineStage && !getPipelineStages(scope, years).includes(pipelineStage))) throw new Error('Plano de sincronização inválido.');
        const runId = randomUUID();
        const input = { scope, fullHistorical, years, runId, triggeredBy, pipelineStage, startedAt, resumedFrom };
        const queued = await withScraperLogContext({ runId }, () => logInfo('SCRAPER',
            `Iniciada sincronização ${scope} (${years.join(', ')}) via ${triggeredBy}${resumedFrom ? ` — retoma em ${pipelineStage}` : ''}...`,
            { event: 'run-start', status: 'queued', ...input }));
        if (!queued?.id) throw new Error('Não foi possível registar o arranque.');
        try {
            const workflow = await start(calendarSyncWorkflow, [input]);
            await withScraperLogContext({ runId }, () => logInfo('SCRAPER', 'Workflow de sincronização agendado.',
                { event: 'workflow-queued', workflowId: workflow.runId }));
            return { success: true, accepted: true, runId, years, startedAt, resumedFrom, pipelineStage };
        } catch (error) {
            await withScraperLogContext({ runId }, () => logError('SCRAPER', `Falha crítica ao agendar sincronização: ${error.message}`,
                { event: 'run-complete', status: 'error', error: error.message, completedAt: new Date().toISOString() }));
            throw error;
        }
    });
}
