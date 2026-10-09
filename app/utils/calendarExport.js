import { originalEventUrl } from '../lib/publicEvent.js';
import { detectRaceDate } from './detectRaceDate.js';

/**
 * Utilitários para exportar eventos para Google Calendar, Apple Calendar e ficheiro iCal (.ics)
 */

function formatIcsDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function getCalendarDates(event) {
    if (!event) return null;
    const race = detectRaceDate(event);
    if (!race) return null;
    const startISO = race.raceDateISO;
    const endISO = race.raceEndDateISO;
    const start = new Date(`${startISO}T00:00:00Z`);
    const end = new Date(`${endISO}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start ||
        start.toISOString().slice(0, 10) !== startISO || end.toISOString().slice(0, 10) !== endISO) return null;
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: startISO.replaceAll('-', ''), end: end.toISOString().slice(0, 10).replaceAll('-', '') };
}

export function getGoogleCalendarDatePayload(event) {
    const dates = getCalendarDates(event);
    if (!dates) return null;
    const iso = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return { start: { date: iso(dates.start) }, end: { date: iso(dates.end) } };
}

export function buildEventsIcsContent(events, origin) {
    const entries = (events || []).map(event => buildIcsContent(event, origin))
        .filter(Boolean).map(content => content.slice(content.indexOf('BEGIN:VEVENT'), content.lastIndexOf('END:VCALENDAR')));
    if (!entries.length) return null;
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cycling Calendar Portugal//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n' + entries.join('') + 'END:VCALENDAR\r\n';
}

function escapeText(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function foldLine(line) {
    let result = '', length = 0;
    for (const character of line) {
        const bytes = new TextEncoder().encode(character).length;
        if (length + bytes > 75) { result += '\r\n '; length = 1; }
        result += character;
        length += bytes;
    }
    return result;
}

export function generateGoogleCalendarUrl(event, type = 'race') {
    let title = event.title || 'Prova de Ciclismo';
    let dates = getCalendarDates(event);
    if (type === 'reg_open' && event.registrationOpensAt) {
        title = 'Abertura Inscrições: ' + title;
        const d = new Date(event.registrationOpensAt);
        const end = new Date(d.getTime() + 60*60*1000);
        dates = { start: formatIcsDate(d), end: formatIcsDate(end) };
    } else if (type === 'reg_close' && event.registrationClosesAt) {
        title = 'Fim Inscrições: ' + title;
        const d = new Date(event.registrationClosesAt);
        const end = new Date(d.getTime() + 60*60*1000);
        dates = { start: formatIcsDate(d), end: formatIcsDate(end) };
    }
    if (!dates) return null;

    const encTitle = encodeURIComponent(title);
    const encLocation = encodeURIComponent(event.distrito || '');
    const encDetails = encodeURIComponent(
        'Prova: ' + (event.title || '') + '\nModalidade: ' + (event.tag || 'Ciclismo') + '\nMais detalhes e inscrições: ' + (originalEventUrl(event.link) || '')
    );

    const datesParam = '&dates=' + dates.start + '/' + dates.end;
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encTitle + '&location=' + encLocation + '&details=' + encDetails + datesParam;
}

export function buildIcsContent(event, origin = 'https://cyclingcalendar.pt') {
    const dates = getCalendarDates(event);
    if (!dates) return null;
    const nowStr = formatIcsDate(new Date());

    const eventUrl = originalEventUrl(event.link) || '';
    const cleanTitle = escapeText(event.title || 'Prova de Ciclismo');
    const cleanLocation = escapeText(event.distrito || '');
    const cleanDescription = escapeText(`Prova: ${event.title || 'Prova de Ciclismo'}\nModalidade: ${event.tag || 'Ciclismo'}\nConsulta o programa oficial para confirmar os horários.\nDetalhes e inscrições: ${eventUrl}`);

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Cycling Calendar Portugal//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:event-${encodeURIComponent(event.id)}@cyclingcalendar.pt`,
        `DTSTAMP:${nowStr}`,
        `DTSTART;VALUE=DATE:${dates.start}`,
        `DTEND;VALUE=DATE:${dates.end}`,
        `SUMMARY:${cleanTitle}`,
        `DESCRIPTION:${cleanDescription}`,
        `LOCATION:${cleanLocation}`,
        `URL:${eventUrl}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P1D',
        'DESCRIPTION:Lembrete de prova de ciclismo',
        'END:VALARM',
        'END:VEVENT'
    ];

    if (event.registrationOpensAt) {
        const d = new Date(event.registrationOpensAt);
        if (Number.isFinite(d.getTime())) {
            lines.push(
                'BEGIN:VEVENT',
                `UID:reg-open-${encodeURIComponent(event.id)}@cyclingcalendar.pt`,
                `DTSTAMP:${nowStr}`,
                `DTSTART:${formatIcsDate(d)}`,
                `DTEND:${formatIcsDate(new Date(d.getTime() + 60*60*1000))}`,
                `SUMMARY:Abertura Inscrições: ${cleanTitle}`,
                `DESCRIPTION:${cleanDescription}`,
                `URL:${eventUrl}`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                'TRIGGER:-PT15M',
                'DESCRIPTION:As inscrições abrem em 15 minutos!',
                'END:VALARM',
                'END:VEVENT'
            );
        }
    }

    if (event.registrationClosesAt) {
        const d = new Date(event.registrationClosesAt);
        if (Number.isFinite(d.getTime())) {
            lines.push(
                'BEGIN:VEVENT',
                `UID:reg-close-${encodeURIComponent(event.id)}@cyclingcalendar.pt`,
                `DTSTAMP:${nowStr}`,
                `DTSTART:${formatIcsDate(d)}`,
                `DTEND:${formatIcsDate(new Date(d.getTime() + 60*60*1000))}`,
                `SUMMARY:Fim Inscrições: ${cleanTitle}`,
                `DESCRIPTION:${cleanDescription}`,
                `URL:${eventUrl}`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                'TRIGGER:-P1D',
                'DESCRIPTION:Último dia para inscrições!',
                'END:VALARM',
                'END:VEVENT'
            );
        }
    }

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadIcsFile(event) {
    if (typeof window === 'undefined') return false;
    const icsContent = buildIcsContent(event, window.location.origin);
    if (!icsContent) return false;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(event.title || 'prova').toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
}



export async function autoAddToGoogleCalendar(event, type = 'race', gcalUrl) {
    const popup = window.open('about:blank', '_blank');
    try {
        const res = await fetch('/api/calendar/add', |
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, type })
        });
        const data = await res.json();
        if (data.success) {
            popup.close();
            console.log('Sucesso ao adicionar magicamente ao calendário Cycling Calendar');
            await new Promise(r => setTimeout(r, 100));
            alert('Adicionado com sucesso ao teu Cycling Calendar!');
            return;
        }
    } catch (e) {
        console.warn('OAuth API failed, falling back to web:', e);
    }
    
    // Fallback para o link web normal (OAuth falhou ou não tem token)
    popup.location.href = gcalUrl;
}
