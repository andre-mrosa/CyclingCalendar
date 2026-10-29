import { createHash } from 'node:crypto';
import { planFavoriteEditions, safeFavoriteIds } from '../utils/favoriteEditions.js';
import { eventPath } from './eventDiscovery.js';

export const pushAvailable = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.CRON_SECRET);
export const pushId = endpoint => createHash('sha256').update(endpoint).digest('hex');
export function validPushSubscription(subscription) {
    try {
        const url = new URL(subscription.endpoint);
        // These are browser push services, never arbitrary user-supplied servers.
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
            subscription.endpoint.length > 2048 || !(
                url.hostname === 'fcm.googleapis.com' ||
                url.hostname === 'updates.push.services.mozilla.com' ||
                /^(?:[a-z0-9-]+\.)*push\.apple\.com$/.test(url.hostname) ||
                /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname))) return false;
        const { p256dh, auth } = subscription.keys;
        return /^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) && /^[A-Za-z0-9_-]+={0,2}$/.test(auth) &&
            Buffer.from(p256dh, 'base64url').length === 65 && Buffer.from(p256dh, 'base64url')[0] === 4 &&
            Buffer.from(auth, 'base64url').length === 16;
    } catch { return false; }
}
export function validPushSchedule(hour, timeZone) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || typeof timeZone !== 'string' || timeZone.length > 80) return false;
    try { new Intl.DateTimeFormat('en', { timeZone }).format(); return true; } catch { return false; }
}
export function pushClock(now, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23' }).formatToParts(now);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { day: `${value.year}-${value.month}-${value.day}`, hour: Number(value.hour) };
}
export function pushDue(row, now) {
    const clock = pushClock(now, row.timeZone);
    return row.enabled && clock.hour >= row.hour && row.lastDeliveryDay !== clock.day;
}
export function editionPushMessage(notices, language, tag) {
    const labels = {
        pt: ['Novas edições dos favoritos', 'Há novas edições de provas nos teus favoritos.'],
        en: ['New editions of your favorites', 'New editions of your favorite events are available.'],
        es: ['Nuevas ediciones de tus favoritos', 'Hay nuevas ediciones de tus pruebas favoritas.'],
        fr: ['Nouvelles éditions de vos favoris', 'De nouvelles éditions de vos épreuves favorites sont disponibles.'],
    }[language] || ['Novas edições dos favoritos', 'Há novas edições de provas nos teus favoritos.'];
    return { title: labels[0], body: notices.length === 1 ? notices[0].event.title.slice(0, 150) : labels[1],
        url: notices.length === 1 ? eventPath(notices[0].event) : '/favoritos', tag };
}

// A separate cursor per device keeps email delivery and other devices independent.
export async function processFavoritePush({ db, users, events, row, send, now = new Date() }) {
    if (!pushDue(row, now)) return 'waiting';
    const leaseUntil = new Date(now.getTime() + 10 * 60000);
    const claim = await db.favoritePushSubscription.updateMany({ where: { id: row.id, enabled: true,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil } });
    if (!claim.count) return 'busy';
    try {
        row = await db.favoritePushSubscription.findUnique({ where: { id: row.id } });
        if (!row || !pushDue(row, now)) return 'waiting';
        const preferences = await db.favoriteEditionPreference.findUnique({ where: { userId: row.userId } });
        let user;
        try { user = await users.getUser(row.userId); }
        catch (error) {
            if (error.status === 404) {
                await db.favoritePushSubscription.deleteMany({ where: { userId: row.userId } });
                return 'deleted';
            }
            throw error;
        }
        const manual = safeFavoriteIds(user.unsafeMetadata?.favorites);
        const excluded = safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions);
        const day = pushClock(now, row.timeZone).day;
        const plan = planFavoriteEditions(events, manual, excluded, row.state, { baseline: !preferences?.follow });
        if (preferences?.follow && plan.notices.length) {
            const message = editionPushMessage(plan.notices, row.language, 'favorite-editions-' + day);
            try { await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, message); }
            catch (error) {
                if ([404, 410].includes(error.statusCode)) {
                    await db.favoritePushSubscription.deleteMany({ where: { id: row.id } });
                    return 'expired';
                }
                throw error;
            }
        }
        await db.favoritePushSubscription.update({ where: { id: row.id }, data: { state: plan.state, lastDeliveryDay: day } });
        return preferences?.follow && plan.notices.length ? 'sent' : 'unchanged';
    } finally {
        await db.favoritePushSubscription.updateMany({ where: { id: row.id, leaseUntil }, data: { leaseUntil: null, checkedAt: now } });
    }
}
