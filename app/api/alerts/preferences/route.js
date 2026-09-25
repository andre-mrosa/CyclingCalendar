import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { favoriteAlertEvents } from '@/app/lib/favoriteAlertEvents';
import { planFavoriteAlerts, verifiedEmail } from '@/app/utils/favoriteAlerts';
export const dynamic = 'force-dynamic';
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const available = () => !!(process.env.RESEND_API_KEY && process.env.ALERTS_FROM_EMAIL && process.env.CRON_SECRET);
const publicPreferences = row => ({ enabled: row?.enabled || false, changes: row?.changes ?? true, deadlines: row?.deadlines ?? true, available: available() });
export async function GET() {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    try { return response(publicPreferences(await prisma.favoriteAlert.findUnique({ where: { userId } }))); }
    catch { return response({ error: 'Alerts unavailable' }, 503); }
}
export async function PUT(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
    let body;
    try { body = await request.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (!body || !['enabled', 'changes', 'deadlines'].every(key => typeof body[key] === 'boolean') || (body.enabled && !body.changes && !body.deadlines)) return response({ error: 'Invalid preferences' }, 400);
    if (body.enabled && !available()) return response({ error: 'Alerts unavailable' }, 503);
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        if (body.enabled && !verifiedEmail(user)) return response({ error: 'Verified primary email required' }, 409);
        const existing = await prisma.favoriteAlert.findUnique({ where: { userId } });
        if (existing?.leaseUntil && existing.leaseUntil > new Date()) return response({ error: 'Try again shortly' }, 409);
        const fresh = !existing?.enabled && body.enabled;
        const snapshot = fresh ? planFavoriteAlerts(await favoriteAlertEvents(prisma, user), {}, { changes: false, deadlines: false }).snapshot : existing?.snapshot || {};
        const data = { enabled: body.enabled, changes: body.changes, deadlines: body.deadlines, language: body.language === 'pt' ? 'pt' : 'en', snapshot, pending: Prisma.DbNull };
        let result;
        if (existing) {
            const updated = await prisma.favoriteAlert.updateMany({ where: { userId, updatedAt: existing.updatedAt, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data });
            if (!updated.count) return response({ error: 'Try again shortly' }, 409);
            result = await prisma.favoriteAlert.findUnique({ where: { userId } });
        } else result = await prisma.favoriteAlert.create({ data: { userId, ...data } });
        return response(publicPreferences(result));
    } catch { return response({ error: 'Could not save alert preferences' }, 503); }
}
