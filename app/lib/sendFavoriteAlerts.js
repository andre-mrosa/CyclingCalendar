import { randomUUID } from 'node:crypto';
import { planFavoriteAlerts, alertEmail, verifiedEmail } from '../utils/favoriteAlerts.js';
import { favoriteAlertEvents } from './favoriteAlertEvents.js';

// Persist the exact email before sending. Retries reuse both payload and key.
export async function deliverFavoriteAlert({ db, users, send, jsonNull, row, now = new Date() }) {
    const leaseUntil = new Date(now.getTime() + 10 * 60 * 1000);
    const claimed = await db.favoriteAlert.updateMany({ where: { userId: row.userId, enabled: true, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil } });
    if (!claimed.count) return 'busy';
    try {
        row = await db.favoriteAlert.findUnique({ where: { userId: row.userId } });
        let user;
        try { user = await users.getUser(row.userId); }
        catch (error) {
            if (error.status === 404) { await db.favoriteAlert.delete({ where: { userId: row.userId } }); return 'deleted'; }
            throw error;
        }
        const email = verifiedEmail(user);
        if (!email) return 'unverified';
        let pending = row.pending;
        if (pending && new Date(pending.createdAt).getTime() < now.getTime() - 23 * 60 * 60 * 1000) {
            // Provider idempotency expires after 24h. Keep uncertain sends for
            // operational review instead of risking another delivery.
            return 'needs-review';
        }
        if (pending && pending.to !== email) {
            await db.favoriteAlert.update({ where: { userId: row.userId }, data: { pending: jsonNull } });
            pending = null;
        }
        if (!pending) {
            if (row.lastSentAt && now - row.lastSentAt < 24 * 60 * 60 * 1000) return 'limited';
            const events = await favoriteAlertEvents(db, user);
            const plan = planFavoriteAlerts(events, row.snapshot, row, now);
            if (!plan.notices.length) {
                await db.favoriteAlert.update({ where: { userId: row.userId }, data: { snapshot: plan.snapshot } });
                return 'unchanged';
            }
            pending = { id: randomUUID(), createdAt: now.toISOString(), to: email, ...alertEmail(plan.notices, row.language), snapshot: plan.snapshot };
            await db.favoriteAlert.update({ where: { userId: row.userId }, data: { pending } });
        }
        const result = await send({ to: pending.to, subject: pending.subject, text: pending.text }, pending.id);
        if (result.error || !result.data?.id) throw new Error('Alert delivery failed');
        await db.favoriteAlert.update({ where: { userId: row.userId }, data: { snapshot: pending.snapshot, pending: jsonNull, lastSentAt: now } });
        return 'sent';
    } finally {
        await db.favoriteAlert.updateMany({ where: { userId: row.userId, leaseUntil }, data: { leaseUntil: null, checkedAt: now } });
    }
}
