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

export async function GET(req) {
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
            return NextResponse.json({ 
                success: true, 
                signedIn: false, 
                markedEventIds: [], 
                markedDates: {} 
            });
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
            console.error("Error fetching OAuth token for calendar events:", e);
        }

        if (!token) {
            return NextResponse.json({ 
                success: true, 
                signedIn: false, 
                markedEventIds: [], 
                markedDates: {} 
            });
        }

        const targetCalendarId = await getTargetCalendarId(token);

        // Fetch events from Google Calendar
        const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?maxResults=2500&singleEvents=true`;
        const calRes = await fetch(calUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!calRes.ok) {
            const errText = await calRes.text();
            console.warn("Google Calendar list error:", errText);
            return NextResponse.json({ 
                success: true, 
                signedIn: true, 
                markedEventIds: [], 
                markedDates: {} 
            });
        }

        const calData = await calRes.json();
        const items = calData.items || [];

        const markedEventIds = [];
        const markedDates = {};

        for (const item of items) {
            const cyclingId = item.extendedProperties?.private?.cyclingCalendarEventId;
            if (!cyclingId) continue;

            markedEventIds.push(cyclingId);

            const isRegOpen = cyclingId.endsWith('_reg_open');
            const isRegClose = cyclingId.endsWith('_reg_close');
            const isMainRace = !isRegOpen && !isRegClose;

            if (isMainRace) {
                // Obter a data no formato YYYY-MM-DD
                const startDateStr = item.start?.date || (item.start?.dateTime ? item.start.dateTime.split('T')[0] : null);
                if (startDateStr) {
                    const cleanTitle = (item.summary || '').replace(/^[🚴\s]+/, '').trim();
                    markedDates[startDateStr] = {
                        eventId: cyclingId,
                        title: cleanTitle || 'Prova Agendada',
                        googleEventId: item.id
                    };
                }
            }
        }

        return NextResponse.json({
            success: true,
            signedIn: true,
            calendar: targetCalendarId,
            markedEventIds,
            markedDates
        });

    } catch (error) {
        console.error("Error reading calendar events:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro ao obter eventos do calendário' 
        }, { status: 500 });
    }
}
