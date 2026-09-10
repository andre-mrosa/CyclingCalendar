import { executeCalendarStage, recordCalendarFailure } from './calendarSteps.js';

// The workflow persists each result before scheduling the next step through
// Vercel Queues. It never calls our own HTTP endpoint recursively.
export async function calendarSyncWorkflow(input) {
    'use workflow';
    let options = { ...input, startLogged: true, durable: true };
    try {
        for (let invocation = 0; invocation < 36; invocation++) {
            const result = await executeCalendarStage(options);
            if (!result.nextStage) return { success: result.success, runId: input.runId };
            options = {
                ...options, pipelineStage: result.nextStage, years: result.years,
                attempt: result.nextAttempt, hadErrors: result.hadErrors,
                fullHistorical: result.fullHistorical
            };
        }
        throw new Error('Limite de etapas da sincronização excedido.');
    } catch (error) {
        await recordCalendarFailure(input.runId, options.pipelineStage, String(error.message || error));
        throw error;
    }
}
