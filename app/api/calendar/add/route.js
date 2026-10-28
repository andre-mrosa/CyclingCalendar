import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { detectRaceDate } from '@/app/utils/detectRaceDate';

async function getTargetCalendarId(token) {
    try {
        const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (listRes.ok) {
            const listData = await listRes.json();
            const existing = listData.items?.find(c => /^cycling\s*calendar/i.test(c.summary));
            if (existing) {
                return existing.id;
            }

            const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: 'Cycling Calendar',
                    description: 'Provas e eventos de ciclismo sincronizados pelo CyclingCalendar.pt',
                    timeZone: 'Europe/Lisbon'
                })
            });

            if (createRes.ok) {
                const newCal = await createRes.json();
                return newCal.id;
            }
        }
    } catch (e) {
        console.warn("Cannot create/fetch secondary calendar, fallback to primary:", e);
    }
    
    return 'primary';
}

export async function POST(req) {
    try {
        const authCtx = auth();
        const { userId } = authCtx.userId ? authCtx : await authCtx;

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { event, type = 'race' } = body;

        if (!event || !event.id) {
            return NextResponse.json({ error: 'Dados do evento em falta' }, { status: 400 });
        }

        if (!['race', 'reg_open', 'reg_close'].includes(type)) {
            return NextResponse.json({ error: 'Tipo de evento inválido' }, { status: 400 });
        }
        const raceDates = type === 'race' ? detectRaceDate(event) : null;
        const registrationDate = type === 'reg_open' ? event.registrationOpensAt : event.registrationClosesAt;
        if ((type === 'race' && !raceDates) || (type !== 'race' && (!registrationDate || !Number.isFinite(new Date(registrationDate).getTime())))) {
            return NextResponse.json({ error: 'Data por confirmar na fonte' }, { status: 400 });
        }

        let token;
        try {
            const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
            const response = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
            const tokens = response.data || response; 
            if (Array.isArray(tokens) && tokens.length > 0) {
                token = tokens[0].token;
            }
        } catch (e) {
            console.error("Error fetching token:", e);
        }

        if (!token) {
            return NextResponse.json({ error: 'No OAuth token' }, { status: 403 });
        }

        const targetCalendarId = await getTargetCalendarId(token);
        const eventKey = type === 'race' ? event.id : `${event.id}-${type}`;
        
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?privateExtendedProperty=cyclingCalendarEventId=${eventKey}`;
        const checkRes = await fetch(checkUrl, { headers: { 'Authorization': `Bearer ${token}` } });

        if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.items && checkData.items.length > 0) {
                return NextResponse.json({ success: true, message: 'exists' });
            }
        }

        let gEvent = {
            extendedProperties: { private: { cyclingCalendarEventId: eventKey.toString() } },
            reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 2880 }, { method: 'popup', minutes: 10080 }] }
        };

        if (type === 'race') {
            const startDateStr = raceDates.raceDateISO;
            const endDt = new Date(raceDates.raceEndDateISO + 'T00:00:00Z');
            endDt.setUTCDate(endDt.getUTCDate() + 1);

            gEvent.summary = event.title;
            gEvent.description = `Mais informações: ${event.link || 'App CyclingCalendar'}\n\nModalidade: ${event.tag || '-'}\nÂmbito: ${event.ambito || '-'}`;
            gEvent.location = (event.distrito && event.distrito !== 'A definir') ? event.distrito + ', Portugal' : 'Portugal';
            gEvent.start = { date: startDateStr };
            gEvent.end = { date: endDt.toISOString().split('T')[0] };
        } else if (type === 'reg_open' && event.registrationOpensAt) {
            gEvent.summary = 'Abertura Inscrições: ' + event.title;
            gEvent.start = { dateTime: new Date(event.registrationOpensAt).toISOString() };
            gEvent.end = { dateTime: new Date(new Date(event.registrationOpensAt).getTime() + 3600000).toISOString() };
            gEvent.reminders.overrides = [{ method: 'popup', minutes: 60 }];
        } else if (type === 'reg_close' && event.registrationClosesAt) {
            gEvent.summary = 'Fim Inscrições: ' + event.title;
            gEvent.start = { dateTime: new Date(event.registrationClosesAt).toISOString() };
            gEvent.end = { dateTime: new Date(new Date(event.registrationClosesAt).getTime() + 3600000).toISOString() };
            gEvent.reminders.overrides = [{ method: 'popup', minutes: 1440 }];
        } else {
            return NextResponse.json({ error: 'Missing dates for this type' }, { status: 400 });
        }

        const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(gEvent)
        });

        if (!createRes.ok) return NextResponse.json({ error: 'Create failed' }, { status: 500 });
        return NextResponse.json({ success: true, message: 'created', calendar: targetCalendarId });

    } catch (error) {
        console.error("Calendar API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
