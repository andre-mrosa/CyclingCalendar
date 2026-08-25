import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

function parsePtDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Direct ISO string check (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.slice(0, 10);
    }

    const months = {
        'JAN': '01', 'JANEIRO': '01',
        'FEV': '02', 'FEVEREIRO': '02',
        'MAR': '03', 'MARÇO': '03', 'MARCO': '03',
        'ABR': '04', 'ABRIL': '04',
        'MAI': '05', 'MAIO': '05',
        'JUN': '06', 'JUNHO': '06',
        'JUL': '07', 'JULHO': '07',
        'AGO': '08', 'AGOSTO': '08',
        'SET': '09', 'SETEMBRO': '09',
        'OUT': '10', 'OUTUBRO': '10',
        'NOV': '11', 'NOVEMBRO': '11',
        'DEZ': '12', 'DEZEMBRO': '12'
    };

    const clean = dateStr.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    const parts = clean.split(' ');

    const mIdx = parts.findIndex(p => months[p]);
    if (mIdx !== -1) {
        const month = months[parts[mIdx]];
        
        // Find day backwards
        let day = '01';
        for (let i = mIdx - 1; i >= 0; i--) {
            const num = parseInt(parts[i], 10);
            if (!isNaN(num) && num >= 1 && num <= 31) {
                day = num.toString().padStart(2, '0');
                break;
            }
        }

        // Find year forwards
        let year = new Date().getFullYear().toString();
        for (let i = mIdx + 1; i < parts.length; i++) {
            if (/^\d{4}$/.test(parts[i])) {
                year = parts[i];
                break;
            }
        }

        return `${year}-${month}-${day}`;
    }

    return null;
}

export async function POST(req) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado. Inicie sessão para continuar.' }, { status: 401 });
        }

        const body = await req.json();
        const { event } = body;

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
                error: 'Não tem permissões de Calendário no seu perfil Google. Por favor, termine sessão e volte a entrar autorizando o acesso ao Google Calendar.' 
            }, { status: 403 });
        }

        // 1. Check if event already exists via extendedProperties
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=cyclingCalendarEventId=${event.id}`;
        
        const checkRes = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!checkRes.ok) {
            const err = await checkRes.text();
            console.error("Google API check error:", err);
            if (checkRes.status === 401 || checkRes.status === 403) {
                return NextResponse.json({ 
                    error: 'A sua sessão do Google expirou ou não tem permissões para gerir o calendário. Termine sessão e volte a entrar.' 
                }, { status: 403 });
            }
            return NextResponse.json({ error: 'Erro ao verificar o Google Calendar' }, { status: 500 });
        }

        const checkData = await checkRes.json();
        if (checkData.items && checkData.items.length > 0) {
            return NextResponse.json({ success: true, message: 'exists' });
        }

        // 2. Parse dates
        const startDateStr = parsePtDate(event.date);
        let endDateStr = parsePtDate(event.endDate) || startDateStr;

        if (!startDateStr) {
            return NextResponse.json({ error: 'Não é possível marcar este evento porque a data ainda não está definida ou foi adiada.' }, { status: 400 });
        }

        // Google Calendar expects the end date of an all-day event to be exclusive (+1 day)
        const endDt = new Date(endDateStr);
        endDt.setDate(endDt.getDate() + 1);
        endDateStr = endDt.toISOString().split('T')[0];

        // 3. Create the event
        let location = 'Portugal';
        if (event.details && event.details !== 'A definir') {
            location = event.details.split('|')[0] + ', Portugal';
        } else if (event.location && event.location !== 'A definir') {
            location = event.location + ', Portugal';
        }

        const gEvent = {
            summary: event.title,
            description: `Mais informações: ${event.link || 'App Cycling Calendar'}\n\nEscalão: ${event.escalao || '-'}\nÂmbito: ${event.ambito || '-'}`,
            location: location,
            start: { date: startDateStr },
            end: { date: endDateStr },
            extendedProperties: {
                private: {
                    cyclingCalendarEventId: event.id.toString()
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    // 12240 minutos = 8.5 dias.
                    { method: 'popup', minutes: 12240 }
                ]
            }
        };

        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gEvent)
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Google API create error:", err);
            if (createRes.status === 401 || createRes.status === 403) {
                return NextResponse.json({ 
                    error: 'Permissões insuficientes no Google Calendar. Termine sessão e volte a entrar autorizando o acesso ao calendário.' 
                }, { status: 403 });
            }
            return NextResponse.json({ error: 'Erro ao criar evento no calendário' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'created' });

    } catch (error) {
        console.error("Calendar API Error:", error);
        return NextResponse.json({ error: 'Erro interno ao processar pedido de calendário' }, { status: 500 });
    }
}
