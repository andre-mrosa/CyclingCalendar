import { auth, clerkClient } from '@clerk/nextjs/server';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function manage(request, action) {
    const { userId } = await auth();
    if (!userId) return response({ error: 'Inicia sessão para gerir a subscrição.' }, 401);
    if (action !== 'read' && request.headers.get('origin') !== new URL(request.url).origin) {
        return response({ error: 'Origem inválida.' }, 403);
    }
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        let token = user.privateMetadata?.calendarSubscriptionToken || null;
        if (action === 'create' && !token) {
            token = randomBytes(32).toString('hex');
            await client.users.updateUserMetadata(userId, { privateMetadata: { calendarSubscriptionToken: token } });
        } else if (action === 'revoke') {
            await client.users.updateUserMetadata(userId, { privateMetadata: { calendarSubscriptionToken: null } });
            token = null;
        }
        const origin = process.env.VERCEL_ENV === 'production' ? 'https://www.cyclingcalendar.pt' : new URL(request.url).origin;
        return response({ active: !!token, url: token ? `${origin}/api/calendar/feed/${encodeURIComponent(userId)}/${token}` : null });
    } catch {
        return response({ error: 'Não foi possível gerir a subscrição. Tenta novamente.' }, 503);
    }
}
export const GET = request => manage(request, 'read');
export const POST = request => manage(request, 'create');
export const DELETE = request => manage(request, 'revoke');
