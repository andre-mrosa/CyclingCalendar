import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

function parsePtDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (/^\d(4}-\d(2}-\d(2}/.test(dateStr)) return dateStr.slice(0, 10);
    const months = { 'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12' };
    const parts = dateStr.toUpperCase().trim().split(' ');
    const mIdx = parts.findIndex(p => months[p] || months[p.replace('Ç','C').replace('Ç','C').substring(0, 3)]);
    if (mIdx !== -1 && mIdx >= 1 && mIdx + 1 < parts.length) {
        const day = parts[mIdx - 1].padStart(2, '0');
        const month = months[parts[mIdx]] || months[parts[mIdx].substring(0, 3)];
        const year = parts[mIdx + 1];
        return `${year}-${month}-${day}`;
    }
    return null;
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
            const startDateStr = parsePtDate(event.date);
            let endDateStr = parsePtDate(event.endDate) || startDateStr;
            if (!startDateStr) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
            
            const endDt = new Date(endDateStr);
            endDt.setDate(endDt.getDate() + 1);
            
            gEvent.summary = event.title;
            gEvent.description = `Mais informações: ${event.link || 'App CyclingCalendar'}\n\nEscalão: ${event.escalao || '-'}\nÂmbito: ${event.ambito || '-'}`;
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
        return nextResponse.json({ success: true, message: 'created', calendar: targetCalendarId });

    } catch (error) {
        console.error("Calendar API Error:", error);
        return nextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
