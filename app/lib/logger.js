import { prisma } from './db.js';

/**
 * Registar um log no sistema (PostgreSQL via Prisma)
 * @param {Object} params
 * @param {'INFO' | 'WARN' | 'ERROR'} [params.level='INFO'] Nível de severidade
 * @param {'SCRAPER' | 'CALENDAR' | 'API' | 'AUTH' | 'CRON' | 'SYSTEM'} [params.source='SYSTEM'] Origem do evento
 * @param {string} params.message Mensagem curta e descritiva
 * @param {any} [params.details=null] Detalhes técnicos, objeto JSON ou stack trace
 * @param {string} [params.userId=null] ID do utilizador (Clerk) se aplicável
 * @param {string} [params.userEmail=null] Email do utilizador se aplicável
 */
export async function logSystem({
    level = 'INFO',
    source = 'SYSTEM',
    message,
    details = null,
    userId = null,
    userEmail = null
}) {
    try {
        if (!message) return;

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

        // Output no console do servidor para dev/debugging
        const prefix = `[${new Date().toISOString()}] [${level}] [${source}]`;
        if (level === 'ERROR') {
            console.error(`${prefix} ${message}`, detailsString ? `\n${detailsString}` : '');
        } else if (level === 'WARN') {
            console.warn(`${prefix} ${message}`);
        } else {
            console.log(`${prefix} ${message}`);
        }

        // Gravação assíncrona na base de dados
        await prisma.systemLog.create({
            data: {
                level: level.toUpperCase(),
                source: source.toUpperCase(),
                message: message.substring(0, 1000),
                details: detailsString ? detailsString.substring(0, 50000) : null,
                userId: userId || null,
                userEmail: userEmail || null
            }
        });
    } catch (err) {
        // Fallback para nunca rebentar com a operação principal
        console.error('Falha crítica ao gravar log no sistema:', err);
    }
}

export const logInfo = (source, message, details, user) => logSystem({
    level: 'INFO',
    source,
    message,
    details,
    userId: user?.id,
    userEmail: user?.email
});

export const logWarn = (source, message, details, user) => logSystem({
    level: 'WARN',
    source,
    message,
    details,
    userId: user?.id,
    userEmail: user?.email
});

export const logError = (source, message, details, user) => logSystem({
    level: 'ERROR',
    source,
    message,
    details,
    userId: user?.id,
    userEmail: user?.email
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
