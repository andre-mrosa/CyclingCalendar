import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { detectRaceDate } from '@/app/utils/detectRaceDate';
import {monthlyRegistration,expectedOpeningLabel,monthlyOpeningNote} from '@/app/utils/partialDates';
import {registrationReminders,calendarIdentifiers} from '@/app/utils/registrationReminders';

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
        if (!targetCalendarId) return NextResponse.json({error:'Não foi possível aceder ao calendário Cycling Calendar.'},{status:503});
        const eventKey = type === 'race' ? event.id : `${event.id}-${type}`;
        
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?privateExtendedProperty=${encodeURIComponent('cyclingCalendarEventId=' + eventKey)}`;
        const checkRes = await fetch(checkUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!checkRes.ok) return NextResponse.json({error:'Não foi possível verificar se a prova já está na agenda.'},{status:503});

        let replaceReminderId=null;
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            if(type!=='race') {
                for(const key of calendarIdentifiers(String(event.id),type==='reg_open'?'registration_open':'registration_close',event._allIds||[]).filter(key=>key!==eventKey).slice(0,99)) {
                    const response=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?privateExtendedProperty=${encodeURIComponent('cyclingCalendarEventId='+key)}`,{headers:{Authorization:`Bearer ${token}`}});
                    if(!response.ok)return NextResponse.json({error:'Não foi possível verificar o lembrete existente.'},{status:503});
                    const data=await response.json();checkData.items=[...(checkData.items||[]),...(data.items||[])];
                }
            }
            if (checkData.items && checkData.items.length > 0) {
                const expected=String(type==='reg_open'?event.registrationOpensAt:event.registrationClosesAt||'');
                const reminder=checkData.items.find(item=>item.extendedProperties?.private?.registrationPrecision==='month'||(item.start&&(item.start.dateTime?item.start.dateTime.slice(0,19)!==expected.slice(0,19):item.start.date!==expected.slice(0,10)||!monthlyRegistration(event))));
                if(type!=='race'&&reminder?.id&&!(type==='reg_open'&&monthlyRegistration(event)))replaceReminderId=reminder.id;
                else if(type!=='race') {
                    for(const id of [...new Set(checkData.items.map(item=>item.id).filter(Boolean))]) {
                        const response=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(id)}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({reminders:registrationReminders()})});
                        if(!response.ok)return NextResponse.json({error:'Não foi possível atualizar os avisos.'},{status:503});
                    }
                    return NextResponse.json({success:true,message:'exists'});
                }else return NextResponse.json({ success: true, message: 'exists' });
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
            gEvent.description='Mais informações: '+(event.link||'https://www.cyclingcalendar.pt');
            gEvent.extendedProperties.private.registrationPrecision=monthlyRegistration(event)?'month':'day';
            gEvent.summary = (monthlyRegistration(event)?expectedOpeningLabel('pt'):'Abertura Inscrições')+': '+event.title;
            gEvent.start = { dateTime: new Date(event.registrationOpensAt).toISOString().slice(0,19), timeZone:'Europe/Lisbon' };
            gEvent.end = { dateTime: new Date(new Date(event.registrationOpensAt).getTime() + 3600000).toISOString().slice(0,19), timeZone:'Europe/Lisbon' };
            gEvent.reminders=registrationReminders();
            if(monthlyRegistration(event)) {
                const day=new Date(event.registrationOpensAt),end=new Date(day);end.setUTCDate(end.getUTCDate()+1);
                gEvent.start={date:day.toISOString().slice(0,10)};gEvent.end={date:end.toISOString().slice(0,10)};
                gEvent.description=monthlyOpeningNote+'\n'+(event.link||'');
                gEvent.extendedProperties.private.registrationPrecision='month';
                gEvent.reminders=registrationReminders();
            }
        } else if (type === 'reg_close' && event.registrationClosesAt) {
            gEvent.summary = 'Fim Inscrições: ' + event.title;
            gEvent.start = { dateTime: new Date(event.registrationClosesAt).toISOString().slice(0,19), timeZone:'Europe/Lisbon' };
            gEvent.end = { dateTime: new Date(new Date(event.registrationClosesAt).getTime() + 3600000).toISOString().slice(0,19), timeZone:'Europe/Lisbon' };
            gEvent.reminders=registrationReminders();
        } else {
            return NextResponse.json({ error: 'Missing dates for this type' }, { status: 400 });
        }

        const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events${replaceReminderId?'/'+encodeURIComponent(replaceReminderId):''}`, {
            method: replaceReminderId?'PATCH':'POST',
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
