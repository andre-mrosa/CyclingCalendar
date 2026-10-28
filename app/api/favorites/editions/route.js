import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { getPublicCalendarEvents } from '@/app/lib/getPublicCalendarEvents';
import { favoriteEditionSettings, editionEmailAvailable } from '@/app/lib/favoriteEditionSettings';
import { planFavoriteEditions, safeFavoriteIds } from '@/app/utils/favoriteEditions';
import { verifiedEmail } from '@/app/utils/favoriteAlerts';
export const dynamic = 'force-dynamic';
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET() {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    try {
        const client = await clerkClient();
        const [user, row, events] = await Promise.all([client.users.getUser(userId),
            prisma.favoriteEditionPreference.findUnique({ where: { userId } }), getPublicCalendarEvents()]);
        return response(favoriteEditionSettings(row, events, user));
    } catch { return response({ error: 'Edition preferences unavailable' }, 503); }
}
export async function PUT(request) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Unauthorized' }, 401);
    if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
    let body;
    try { body = await request.json(); } catch { return response({ error: 'Invalid JSON' }, 400); }
    if (typeof body?.follow !== 'boolean' || typeof body?.email !== 'boolean' || (body.email && !body.follow))
        return response({ error: 'Invalid preferences' }, 400);
    if (body.email && !editionEmailAvailable()) return response({ error: 'Email not configured' }, 503);
    try {
        const client = await clerkClient();
        const [user, existing, events] = await Promise.all([client.users.getUser(userId),
            prisma.favoriteEditionPreference.findUnique({ where: { userId } }), getPublicCalendarEvents()]);
        if (body.email && !verifiedEmail(user)) return response({ error: 'Verified email required' }, 409);
        if (existing?.leaseUntil && existing.leaseUntil > new Date()) return response({ error: 'Try again shortly' }, 409);
        const manual = safeFavoriteIds(user.unsafeMetadata?.favorites);
        const exclusions = safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions);
        // Materialise discoveries before turning following off, retaining favorites.
        const state = (existing?.follow || body.follow)
            ? planFavoriteEditions(events, manual, exclusions, existing?.state, { baseline: true }).state
            : existing?.state || {};
        const data = { follow: body.follow, email: body.email,
            language: ['pt','en','es','fr'].includes(body.language) ? body.language : 'pt',
            state, pending: Prisma.DbNull };
        let row;
        if (existing) {
            const result = await prisma.favoriteEditionPreference.updateMany({ where: { userId, updatedAt: existing.updatedAt,
                OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data });
            if (!result.count) return response({ error: 'Try again shortly' }, 409);
            row = await prisma.favoriteEditionPreference.findUnique({ where: { userId } });
        } else row = await prisma.favoriteEditionPreference.create({ data: { userId, ...data } });
        return response(favoriteEditionSettings(row, events, user));
    } catch { return response({ error: 'Could not save edition preferences' }, 503); }
}
