import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { subscriptionIcs, validSubscriptionToken } from '@/app/lib/calendarSubscription';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };

export async function GET(_request, { params }) {
    const { userId, token } = await params;
    if (!/^user_[a-zA-Z0-9]+$/.test(userId) || !/^[a-f0-9]{64}$/.test(token)) return new Response('Not found', { status: 404, headers });
    try {
        const client = await clerkClient();
        let user;
        try { user = await client.users.getUser(userId); }
        catch (error) { if (error.status === 404) return new Response('Not found', { status: 404, headers }); throw error; }
        if (!validSubscriptionToken(token, user.privateMetadata?.calendarSubscriptionToken)) return new Response('Not found', { status: 404, headers });
        const ids = Array.isArray(user.unsafeMetadata?.favorites) ? [...new Set(user.unsafeMetadata.favorites.filter(id => typeof id === 'string'))] : [];
        const events = await prisma.event.findMany({ where: { id: { in: ids } }, orderBy: { sortDate: 'asc' } });
        return new Response(subscriptionIcs(events, 'https://www.cyclingcalendar.pt'), {
            headers: { ...headers, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="cycling-favorites.ics"' }
        });
    } catch {
        // A temporary backend failure must not erase the subscriber's calendar.
        return new Response('Calendar temporarily unavailable', { status: 503, headers });
    }
}
