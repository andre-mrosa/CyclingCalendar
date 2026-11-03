import { auth, clerkClient } from '@clerk/nextjs/server';
import { sameOriginJson, privateJson } from '@/app/lib/requestBody';
import { calendarRemovalIdentifiers, removeGoogleCalendarEntries } from '@/app/lib/googleCalendarRemoval';
export const dynamic = 'force-dynamic';
export async function POST(request) {
    const { userId } = await auth();
    if (!userId) return privateJson({ success: false, error: 'Unauthorized' }, 401);
    try {
        const { event, target = 'event' } = await sameOriginJson(request);
        const identifiers = calendarRemovalIdentifiers(event, target);
        const client = await clerkClient();
        let response;
        try { response = await client.users.getUserOauthAccessToken(userId, 'oauth_google'); }
        catch { response = await client.users.getUserOauthAccessToken(userId, 'google'); }
        const tokens = response?.data || response;
        const token = Array.isArray(tokens) && tokens[0]?.token;
        if (!token) return privateJson({ success: false, error: 'Google Calendar permission required' }, 403);
        const deletedCount = await removeGoogleCalendarEntries(token, identifiers);
        return privateJson({ success: true, message: 'removed', deletedCount, target });
    } catch (error) {
        return privateJson({ success: false, error: error.status ? error.message : 'Calendar unavailable' }, error.status || 503);
    }
}
