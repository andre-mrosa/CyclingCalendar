import { clerkClient } from '@clerk/nextjs/server';
import { PUBLIC_EVENT_SELECT } from '@/app/lib/publicEvent';
import { prisma } from '@/app/lib/db';
import { subscriptionIcs, validSubscriptionToken } from '@/app/lib/calendarSubscription';
import { getPublicCalendarEvents } from '@/app/lib/getPublicCalendarEvents';
import { favoriteEditionSettings } from '@/app/lib/favoriteEditionSettings';
import { editionFeedEvents } from '@/app/utils/favoriteEditions';

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
        const manual = Array.isArray(user.unsafeMetadata?.favorites) ? user.unsafeMetadata.favorites.filter(id => typeof id === 'string') : [];
        const preferences = await prisma.favoriteEditionPreference.findUnique({ where: { userId } });
        const inherited = preferences ? favoriteEditionSettings(preferences, await getPublicCalendarEvents(), user).inheritedIds : [];
        const ids = [...new Set([...manual, ...inherited])];
        const events = await prisma.event.findMany({ where: { id: { in: ids } }, select: { ...PUBLIC_EVENT_SELECT, updatedAt: true }, orderBy: { sortDate: 'asc' } });
        return new Response(subscriptionIcs(editionFeedEvents(events, manual), 'https://www.cyclingcalendar.pt'), {
            headers: { ...headers, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="cycling-favorites.ics"' }
        });
    } catch {
        // A temporary backend failure must not erase the subscriber's calendar.
        return new Response('Calendar temporarily unavailable', { status: 503, headers });
    }
}
