import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';

// A tokenised lease works with transaction-pooled PostgreSQL connections too.
// Reuse the operational table so existing deployments need no schema migration.
// Log cleanup must never delete this row. Route execution is capped at 5 minutes;
// the 15-minute lease also protects requests whose worker dies unexpectedly.
export const SCRAPER_LEASE_ID = 'operational-scraper-lease';
export const SCRAPER_LEASE_MS = 15 * 60 * 1000;

export async function withScraperLock(work, { db = prisma, now = () => new Date(), heartbeatMs = 30000 } = {}) {
    const token = randomUUID();
    const startedAt = now();
    const data = { id: SCRAPER_LEASE_ID, source: 'SYSTEM', level: 'INFO', message: 'Reserva operacional da sincronização', details: token, createdAt: startedAt };
    let acquired = false;
    try {
        await db.systemLog.create({ data });
        acquired = true;
    } catch (error) {
        if (error.code !== 'P2002') throw error;
        const result = await db.systemLog.updateMany({
            where: { id: SCRAPER_LEASE_ID, createdAt: { lt: new Date(startedAt.getTime() - SCRAPER_LEASE_MS) } },
            data: { details: token, createdAt: startedAt },
        });
        acquired = result.count === 1;
    }
    if (!acquired) {
        const error = new Error('Já existe uma sincronização em curso. Acompanhe a execução atual no painel.');
        error.code = 'SCRAPER_ALREADY_RUNNING';
        error.retryAfter = 30;
        throw error;
    }
    let heartbeat = Promise.resolve();
    const timer = setInterval(() => {
        heartbeat = heartbeat.then(() => db.systemLog.updateMany({
            where: { id: SCRAPER_LEASE_ID, details: token }, data: { createdAt: now() },
        })).catch(error => console.error('Não foi possível renovar a reserva do scraper:', error.code || error.name));
    }, heartbeatMs);
    timer.unref?.();
    try {
        return await work();
    } finally {
        clearInterval(timer);
        await heartbeat;
        // Never release a lease subsequently acquired by another worker.
        await db.systemLog.deleteMany({ where: { id: SCRAPER_LEASE_ID, details: token } });
    }
}
