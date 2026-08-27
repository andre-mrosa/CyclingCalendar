import { auth, getAuth, verifyToken, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { logInfo, logError } from '@/app/lib/logger';

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

async function getTargetCalendarId(token) {
    try {
        // 1. Procurar calendário "Cycling Calendar" existente
        const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (listRes.ok) {
            const listData = await listRes.json();
            const existing = listData.items?.find(c => /^cycling\s*calendar$/i.test(c.summary));
            if (existing) {
                return existing.id;
            }

            // 2. Se não existir, criar calendário dedicado "Cycling Calendar"
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
        console.warn("Não foi possível aceder ou criar calendário secundário, fallback para primary:", e);
    }
    
    // Fallback para o calendário principal se as permissões forem restritas
    return 'primary';
}

export async function POST(req) {
    try {
        let userId;

        // 1. Try standard auth()
        try {
            const authData = await auth();
            userId = authData?.userId;
        } catch (e) {
            // Middleware bypassed or not yet initialized
        }

        // 2. Try getAuth(req) inside safe block
        if (!userId) {
            try {
                const authData = getAuth(req);
                userId = authData?.userId;
            } catch (e) {
                // Ignore missing middleware header
            }
        }

        // 3. Resilient fallback: direct JWT cookie verification via Clerk secret key
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
            } catch (e) {
                console.warn("Falha na verificação direta do token:", e);
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado. Inicie sessão com Google para continuar.' }, { status: 401 });
        }

        const body = await req.json();
        const { event, target = 'event' } = body;

        if (!event || !event.id) {
            return NextResponse.json({ error: 'Dados do evento em falta' }, { status: 400 });
        }

        // Carregar dados completos da base de dados caso disponíveis
        let dbEvent = null;
        try {
            if (event.id) {
                dbEvent = await prisma.event.findUnique({
                    where: { id: event.id.toString() }
                });
            }
        } catch (e) {
            console.warn("Não foi possível carregar dbEvent para o calendário:", e);
        }

        const fullEvent = { ...event, ...(dbEvent || {}) };

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

        // 1. Obter ou criar o calendário dedicado "Cycling Calendar"
        const targetCalendarId = await getTargetCalendarId(token);

        let location = 'Portugal';
        if (fullEvent.details && fullEvent.details !== 'A definir') {
            location = fullEvent.details.split('|')[0] + ', Portugal';
        } else if (fullEvent.location && fullEvent.location !== 'A definir') {
            location = fullEvent.location + ', Portugal';
        }

        // Helper para criar ou verificar evento
        const createOrCheckEvent = async (gEvent, eventIdentifier) => {
            try {
                const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events?privateExtendedProperty=cyclingCalendarEventId=${encodeURIComponent(eventIdentifier)}`;
                const checkRes = await fetch(checkUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.items && checkData.items.length > 0) {
                        return { success: true, message: 'exists' };
                    }
                }
            } catch (e) {
                console.warn("Erro a verificar se evento existe:", e);
            }

            const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gEvent)
            });

            if (!createRes.ok) {
                const err = await createRes.text();
                console.error("Google API create error for", eventIdentifier, err);
                if (createRes.status === 401 || createRes.status === 403) {
                    throw new Error('AUTH_EXPIRED');
                }
                let cleanMsg = 'Erro ao criar evento no calendário';
                try {
                    const parsedErr = JSON.parse(err);
                    if (parsedErr.error?.message) cleanMsg = parsedErr.error.message;
                } catch {
                    cleanMsg = err;
                }
                throw new Error(cleanMsg);
            }

            return { success: true, message: 'created' };
        };

        // Helper para montar payload de data/hora (sempre como dateTime local em Europe/Lisbon)
        const buildDatePayload = (dateValue) => {
            if (!dateValue) return null;
            let d = dateValue instanceof Date ? dateValue : new Date(dateValue);
            if (isNaN(d.getTime())) {
                const parsedIso = parsePtDate(String(dateValue));
                if (parsedIso) d = new Date(parsedIso);
            }
            if (isNaN(d.getTime())) return null;

            // Os dígitos da hora portuguesa foram gravados no banco em UTC
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const day = d.getUTCDate();
            let hh = d.getUTCHours();
            const mm = d.getUTCMinutes();
            const ss = d.getUTCSeconds();

            const isMidnight = (hh === 0 && mm === 0 && ss === 0);
            if (isMidnight) {
                hh = 9; // Se não tiver hora definida, marca para as 09:00 de Lisboa
            }

            const startDate = new Date(Date.UTC(y, m, day, hh, mm, ss));
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const pad = (n) => String(n).padStart(2, '0');

            const startLocal = `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth() + 1)}-${pad(startDate.getUTCDate())}T${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}:${pad(startDate.getUTCSeconds())}`;
            const endLocal = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}T${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}:${pad(endDate.getUTCSeconds())}`;

            return {
                start: {
                    dateTime: startLocal,
                    timeZone: 'Europe/Lisbon'
                },
                end: {
                    dateTime: endLocal,
                    timeZone: 'Europe/Lisbon'
                }
            };
        };

        // CASO 1: Abertura das Inscrições
        if (target === 'registration_open') {
            const rawDate = fullEvent.registrationOpensAt;
            if (!rawDate) {
                return NextResponse.json({ error: 'A data de abertura das inscrições ainda não foi definida para este evento.' }, { status: 400 });
            }

            const datePayload = buildDatePayload(rawDate);
            if (!datePayload) {
                return NextResponse.json({ error: 'Formato de data de abertura inválido.' }, { status: 400 });
            }

            const gEvent = {
                summary: `📝 Abertura Inscrições: ${fullEvent.title}`,
                description: `Abertura oficial das inscrições para ${fullEvent.title}.\n\nInscrições e regulamento: ${fullEvent.link || 'https://cyclingcalendar.pt'}\nOrganização: ${fullEvent.organizador || fullEvent.source || '-'}`,
                location: location,
                ...datePayload,
                extendedProperties: {
                    private: {
                        cyclingCalendarEventId: `${fullEvent.id}_reg_open`
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        // 1 dia antes (24h = 1440 min)
                        { method: 'popup', minutes: 1440 },
                        // No dia, 1 hora antes (60 min)
                        { method: 'popup', minutes: 60 }
                    ]
                }
            };

            const result = await createOrCheckEvent(gEvent, `${fullEvent.id}_reg_open`);
            return NextResponse.json({ ...result, calendar: targetCalendarId, target: 'registration_open' });
        }

        // CASO 2: Fecho das Inscrições
        if (target === 'registration_close') {
            const rawDate = fullEvent.registrationClosesAt;
            if (!rawDate) {
                return NextResponse.json({ error: 'A data de fecho das inscrições ainda não foi definida para este evento.' }, { status: 400 });
            }

            const datePayload = buildDatePayload(rawDate);
            if (!datePayload) {
                return NextResponse.json({ error: 'Formato de data de fecho inválido.' }, { status: 400 });
            }

            const gEvent = {
                summary: `⏳ Fecho Inscrições: ${fullEvent.title}`,
                description: `Último dia para inscrições no evento: ${fullEvent.title}.\n\nInscrever agora: ${fullEvent.link || 'https://cyclingcalendar.pt'}\nOrganização: ${fullEvent.organizador || fullEvent.source || '-'}`,
                location: location,
                ...datePayload,
                extendedProperties: {
                    private: {
                        cyclingCalendarEventId: `${fullEvent.id}_reg_close`
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        // 1 dia antes (24h = 1440 min)
                        { method: 'popup', minutes: 1440 },
                        // No dia, 1 hora antes (60 min)
                        { method: 'popup', minutes: 60 }
                    ]
                }
            };

            const result = await createOrCheckEvent(gEvent, `${fullEvent.id}_reg_close`);
            return NextResponse.json({ ...result, calendar: targetCalendarId, target: 'registration_close' });
        }

        // CASO 3: Prova (Dia do Evento - default)
        const startDateStr = parsePtDate(fullEvent.date);
        let endDateStr = parsePtDate(fullEvent.endDate) || startDateStr;

        if (!startDateStr) {
            return NextResponse.json({ error: 'Não é possível marcar este evento porque a data ainda não está definida ou foi adiada.' }, { status: 400 });
        }

        const endDt = new Date(endDateStr);
        endDt.setDate(endDt.getDate() + 1);
        endDateStr = endDt.toISOString().split('T')[0];

        const gEvent = {
            summary: `🚴 ${fullEvent.title}`,
            description: `Mais informações: ${fullEvent.link || 'App Cycling Calendar'}\n\nEscalão: ${fullEvent.escalao || '-'}\nÂmbito: ${fullEvent.ambito || '-'}`,
            location: location,
            start: { date: startDateStr },
            end: { date: endDateStr },
            extendedProperties: {
                private: {
                    cyclingCalendarEventId: fullEvent.id.toString()
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    // 2 dias antes (2880 min)
                    { method: 'popup', minutes: 2880 },
                    // 1 semana antes (10080 min)
                    { method: 'popup', minutes: 10080 }
                ]
            }
        };

        const result = await createOrCheckEvent(gEvent, fullEvent.id.toString());
        return NextResponse.json({ ...result, calendar: targetCalendarId, target: 'event' });

    } catch (error) {
        console.error("Calendar API Error:", error);
        if (error.message === 'AUTH_EXPIRED') {
            return NextResponse.json({ 
                error: 'Permissões insuficientes no Google Calendar. Termine sessão e volte a entrar autorizando o acesso ao calendário.' 
            }, { status: 403 });
        }
        return NextResponse.json({ error: error?.message || 'Erro interno ao processar pedido de calendário' }, { status: 500 });
    }
}
