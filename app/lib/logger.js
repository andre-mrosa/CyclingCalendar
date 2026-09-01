import { prisma } from './db.js';
import { AsyncLocalStorage } from 'node:async_hooks';

const scraperLogContext = new AsyncLocalStorage();

// Context follows concurrent async work without leaking across runs or sources.
export function withScraperLogContext(context, work) {
    return scraperLogContext.run({ ...scraperLogContext.getStore(), ...context }, work);
}

// Origens estritamente operacionais do programa permitidas na base de dados
const ALLOWED_SYSTEM_SOURCES = new Set(['SCRAPER', 'CRON', 'SYSTEM', 'API', 'WEATHER']);

/**
 * Registar um log no sistema (PostgreSQL via Prisma)
 * Focado estritamente no funcionamento do programa e scrapers (sem spam de utilizadores)
 * @param {Object} params
 * @param {'INFO' | 'WARN' | 'ERROR'} [params.level='INFO'] Nível de severidade
 * @param {'SCRAPER' | 'CRON' | 'SYSTEM' | 'API' | 'WEATHER'} [params.source='SYSTEM'] Origem do evento
 * @param {string} params.message Mensagem curta e descritiva
 * @param {any} [params.details=null] Detalhes técnicos, objeto JSON ou stack trace
 */
export async function logSystem({
    level = 'INFO',
    source = 'SYSTEM',
    message,
    details = null
}) {
    try {
        if (!message) return;

        const upperSource = (source || 'SYSTEM').toUpperCase();
        const context = scraperLogContext.getStore();
        if (context && level.toUpperCase() === 'ERROR') {
            context.onError?.({ sourceId: context.sourceId, stepId: context.stepId, year: context.year, message });
        }
        
        // Ignorar logs de utilizadores individuais ou ações de navegação para evitar spam
        if (!ALLOWED_SYSTEM_SOURCES.has(upperSource) && level !== 'ERROR') {
            return;
        }

        if (context?.runId) {
            const payload = details instanceof Error
                ? { error: details.message, stack: details.stack }
                : details && typeof details === 'object' ? details : { detail: details };
            details = {
                ...payload,
                runId: context.runId,
                ...(context.sourceId ? { sourceId: context.sourceId } : {}),
                ...(context.stepId ? { stepId: context.stepId } : {}),
                ...(context.year != null ? { year: String(context.year) } : {})
            };
        }

        let detailsString = null;
        if (details) {
            if (typeof details === 'string') {
                detailsString = details;
            } else if (details instanceof Error) {
                detailsString = `${details.message}\n\nStack:\n${details.stack || ''}`;
            } else {
                try {
                    detailsString = JSON.stringify(details, null, 2);
                } catch {
                    detailsString = String(details);
                }
            }
        }
        // Slicing a JSON string can remove its runId or make it unparsable.
        // Oversized diagnostic payloads retain a valid scoped envelope.
        if (context?.runId && detailsString?.length > 50000) {
            detailsString = JSON.stringify({
                runId: context.runId, sourceId: context.sourceId, stepId: context.stepId, year: context.year,
                event: details.event, status: details.status, detailsTruncated: true,
                detail: detailsString.slice(0, 8000)
            });
        }

        // Output no console do servidor para dev/debugging
        const prefix = `[${new Date().toISOString()}] [${level}] [${upperSource}]`;
        if (level === 'ERROR') {
            console.error(`${prefix} ${message}`, detailsString ? `\n${detailsString}` : '');
        } else if (level === 'WARN') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }

        // Gravação assíncrona na base de dados
        return await prisma.systemLog.create({
            data: {
                level: level.toUpperCase(),
                source: upperSource,
                message: message.substring(0, 1000),
                details: detailsString ? detailsString.substring(0, 50000) : null
            }
        });
    } catch (err) {
        console.error('Falha ao gravar log no sistema:', err);
    }
}

export const logInfo = (source, message, details) => logSystem({
    level: 'INFO',
    source,
    message,
    details
});

export const logWarn = (source, message, details) => logSystem({
    level: 'WARN',
    source,
    message,
    details
});

export const logError = (source, message, details) => logSystem({
    level: 'ERROR',
    source,
    message,
    details
});

/**
 * Limpar logs com mais de X dias
 * @param {number} daysToKeep 
 */
export async function cleanOldLogs(daysToKeep = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await prisma.systemLog.deleteMany({
            where: {
                id: { not: 'operational-scraper-lease' },
                createdAt: {
                    lt: cutoffDate
                }
            }
        });
        return result.count;
    } catch (e) {
        console.error('Erro ao limpar logs antigos:', e);
        return 0;
    }
}
