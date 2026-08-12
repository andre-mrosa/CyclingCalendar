import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

function parsePtDate(dateStr) {
    if (!dateStr) return null;
    const months = {
        'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
        'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
    };
    const parts = dateStr.toUpperCase().trim().split(' ');
    
    // Look for the month to anchor the parsing (e.g. "20 AGO 2026")
    const mIdx = parts.findIndex(p => months[p]);
    if (mIdx !== -1 && mIdx >= 1 && mIdx + 1 < parts.length) {
        const day = parts[mIdx - 1].padStart(2, '0');
        const month = months[parts[mIdx]];
        const year = parts[mIdx + 1];
        return `${year}-${month}-${day}`;
    }
    
    // Fallback if parsing fails
    return null;
}

export async function POST(req) {
    try {
        const authCtx = auth();
        // Handle both older and newer Clerk versions where auth() might return a promise
        const { userId } = authCtx.userId ? authCtx : await authCtx;

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { event } = body;

        if (!event || !event.id) {
            return NextResponse.json({ error: 'Dados do evento em falta' }, { status: 400 });
        }

        let token;
        try {
            // Handle both older and newer Clerk versions for clerkClient
            const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
            const response = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
            
            // In some clerk versions it's response.data, in others it's just an array returned directly
            const tokens = response.data || response; 
            if (Array.isArray(tokens) && tokens.length > 0) {
                token = tokens[0].token;
            }
        } catch (e) {
            console.error("Error fetching token:", e);
        }

        if (!token) {
            return NextResponse.json({ 
                error: 'Não tem permissões de Calendário no seu perfil. Por favor, faça Logout e Login novamente e aceite as permissões do Google Calendar.' 
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
            return NextResponse.json({ error: 'Formato de data não suportado' }, { status: 400 });
        }

        // Google Calendar expects the end date of an all-day event to be exclusive
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
                    // 12240 minutos = 8.5 dias. Para uma prova ao Domingo (00:00), 
                    // o alerta toca na Sexta-feira da semana anterior às 12:00h.
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
            return NextResponse.json({ error: 'Erro ao criar evento no calendário' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'created' });

    } catch (error) {
        console.error("Calendar API Error:", error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
