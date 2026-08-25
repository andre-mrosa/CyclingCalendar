import { auth, getAuth, verifyToken, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getTargetCalendarId(token) {
    try {
        const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (listRes.ok) {
            const listData = await listRes.json();
            const existing = listData.items?.find(c => /^cycling\s*calendar$/i.test(c.summary));
            if (existing) {
                return existing.id;
            }
        }
    } catch (e) {
        console.warn("Aviso ao procurar calendário Cycling Calendar:", e);
    }
    return 'primary';
}

export async function POST(req) {
    try {
        let userId;

        // 1. Try standard auth()
        try {
            const authData = await auth();
            userId = authData?.userId;
        } catch {
            // Middleware bypassed or not yet initialized
        }

        // 2. Try getAuth(req)
        if (!userId) {
            try {
                const authData = getAuth(req);
                userId = authData?.userId;
            } catch {
                // Ignore
            }
        }

        // 3. Fallback: direct JWT cookie verification via Clerk secret key
        if (!userId) {
            try {
                const sessionCookie = req.cookies?.get?.('__session')?.value;
                const authHeader = req.headers?.get?.('authorization')?.replace(/^Bearer\s+/i, '');
                const tokenToVerify = sessionCookie || authHeader;

                if (tokenToVerify) {
                    const verified = await verifyToken(tokenToVerify, {
                        secretKey: process.env.CLERK_SECRET_KEY,
                    });
                    userId = verified?.sub;
                }
            } catch {
                // Ignore
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { event, target = 'event' } = body;

        if (!event || !event.id) {
            return NextResponse.json({ error: 'Dados do evento em falta' }, { status: 400 });
        }

        let token;
        try {
            const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
            let response;
            try {
                response = await client.users.getUserOauthAccessToken(userId, 'google');
            } catch {
                response = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
            }
            const tokens = response?.data || response;
            if (Array.isArray(tokens) && tokens.length > 0) {
                token = tokens[0].token;
            }
        } catch (e) {
            console.error("Error fetching OAuth token:", e);
        }

        if (!token) {
            return NextResponse.json({ 
                error: 'Não tem permissões de Calendário no seu perfil Google.' 
            }, { status: 403 });
        }

        const targetCalendarId = await getTargetCalendarId(token);

        const allBaseIds = [event.id, ...(event._allIds || [])];
        const identifiers = allBaseIds.map(id => {
            if (target === 'registration_open') return `${id}_reg_open`;
            if (target === 'registration_close') return `${id}_reg_close`;
            return String(id);
        });

        let deletedCount = 0;

        for (const identifier of identifiers) {
            try {
                const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?privateExtendedProperty=cyclingCalendarEventId=${encodeURIComponent(identifier)}`;
                const checkRes = await fetch(checkUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    const items = checkData.items || [];
                    for (const item of items) {
                        const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(item.id)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (delRes.ok || delRes.status === 404 || delRes.status === 410) {
                            deletedCount++;
                        }
                    }
                }
            } catch (err) {
                console.warn(`Erro ao apagar evento ${identifier}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'removed',
            deletedCount,
            target
        });

    } catch (error) {
        console.error("Calendar delete error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro ao remover evento do calendário' 
        }, { status: 500 });
    }
}
