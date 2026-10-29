import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { getPublicCalendarEvents } from '@/app/lib/getPublicCalendarEvents';
import { planFavoriteEditions, safeFavoriteIds } from '@/app/utils/favoriteEditions';
import { pushAvailable, pushId, validPushSubscription, validPushSchedule } from '@/app/lib/favoritePush';
import { sendPush } from '@/app/lib/sendPush';

export const dynamic = 'force-dynamic';
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const settings = row => ({ enabled: !!row?.enabled, hour: row?.hour ?? 10, timeZone: row?.timeZone || 'Europe/Lisbon' });
export async function GET(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    try {
        const id = new URL(request.url).searchParams.get('id');
        const [row, preferences] = await Promise.all([
            id && /^[a-f0-9]{64}$/.test(id) ? prisma.favoritePushSubscription.findFirst({ where: { id, userId } }) : null,
            prisma.favoriteEditionPreference.findUnique({ where: { userId } }),
        ]);
        return response({ ...settings(row), follow: !!preferences?.follow, available: pushAvailable(),
            publicKey: pushAvailable() ? process.env.VAPID_PUBLIC_KEY : null });
    } catch { return response({ error: 'Push preferences unavailable' }, 503); }
}
export async function PUT(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
    let body;
    try { body = await request.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (!validPushSubscription(body?.subscription) || !validPushSchedule(body?.hour, body?.timeZone)) return response({ error: 'Invalid subscription or schedule' }, 400);
    if (!pushAvailable()) return response({ error: 'Push not configured' }, 503);
    try {
        const client = await clerkClient();
        const id = pushId(body.subscription.endpoint);
        const [existing, preferences, user, events] = await Promise.all([
            prisma.favoritePushSubscription.findUnique({ where: { id } }),
            prisma.favoriteEditionPreference.findUnique({ where: { userId } }),
            client.users.getUser(userId), getPublicCalendarEvents(),
        ]);
        if (existing && existing.userId !== userId) return response({ error: 'Device linked to another account' }, 409);
        if (!preferences?.follow) return response({ error: 'Enable following first' }, 409);
        if (existing?.leaseUntil && existing.leaseUntil > new Date()) return response({ error: 'Try again shortly' }, 409);
        if (!existing && await prisma.favoritePushSubscription.count({ where: { userId } }) >= 10) return response({ error: 'Device limit reached' }, 409);
        const data = { enabled: true, hour: body.hour, timeZone: body.timeZone,
            language: ['pt', 'en', 'es', 'fr'].includes(body.language) ? body.language : 'pt',
            endpoint: body.subscription.endpoint, p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth };
        // Changing the hour does not consume undelivered discoveries.
        if (!existing) data.state = planFavoriteEditions(events, safeFavoriteIds(user.unsafeMetadata?.favorites),
            safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions), {}, { baseline: true }).state;
        let row;
        if (existing) {
            const result = await prisma.favoritePushSubscription.updateMany({ where: { id, userId, updatedAt: existing.updatedAt,
                OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data });
            if (!result.count) return response({ error: 'Try again shortly' }, 409);
            row = await prisma.favoritePushSubscription.findUnique({ where: { id } });
        } else row = await prisma.favoritePushSubscription.create({ data: { id, userId, ...data } });
        return response(settings(row));
    } catch { return response({ error: 'Could not save push preferences' }, 503); }
}
export async function DELETE(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
    let body;
    try { body = await request.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (!/^[a-f0-9]{64}$/.test(body?.id)) return response({ error: 'Invalid device' }, 400);
    try {
        const row = await prisma.favoritePushSubscription.findFirst({ where: { id: body.id, userId } });
        if (row?.leaseUntil && row.leaseUntil > new Date()) return response({ error: 'Try again shortly' }, 409);
        const deleted = await prisma.favoritePushSubscription.deleteMany({ where: { id: body.id, userId,
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] } });
        if (row && !deleted.count) return response({ error: 'Try again shortly' }, 409);
        return response({ enabled: false });
    } catch { return response({ error: 'Could not disable push' }, 503); }
}

export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
    if (!pushAvailable()) return response({ error: 'Push not configured' }, 503);
    let body;
    try { body = await request.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (!/^[a-f0-9]{64}$/.test(body?.id)) return response({ error: 'Invalid device' }, 400);
    try {
        const row = await prisma.favoritePushSubscription.findFirst({ where: { id: body.id, userId, enabled: true } });
        if (!row) return response({ error: 'Device not enabled' }, 404);
        const claimed = await prisma.favoritePushSubscription.updateMany({ where: { id: body.id, userId, enabled: true,
            OR: [{ lastTestAt: null }, { lastTestAt: { lt: new Date(Date.now() - 60000) } }] }, data: { lastTestAt: new Date() } });
        if (!claimed.count) return response({ error: 'Try again in a minute' }, 429);
        const text = { pt:'As notificações estão a funcionar neste dispositivo.', en:'Notifications are working on this device.',
            es:'Las notificaciones funcionan en este dispositivo.', fr:'Les notifications fonctionnent sur cet appareil.' };
        await sendPush({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            { title:'Cycling Calendar', body:text[row.language] || text.pt, url:'/favoritos', tag:'push-test' });
        return response({ success: true });
    } catch { return response({ error: 'Push test delivery failed' }, 503); }
}
