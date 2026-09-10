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

export function generateGoogleCalendarUrl(event) {
    const dates = getCalendarDates(event);
    if (!dates) return null;
    const title = encodeURIComponent(event.title || 'Prova de Ciclismo');
    const location = encodeURIComponent(event.distrito || event.details?.split('|')[0]?.trim() || 'Portugal');
    const details = encodeURIComponent(
        `Prova: ${event.title}\nModalidade: ${event.tag || 'Ciclismo'}\nMais detalhes e inscrições: ${typeof window !== 'undefined' ? `${window.location.origin}/events/${encodeURIComponent(event.id)}` : `https://cyclingcalendar.pt/events/${encodeURIComponent(event.id)}`}`
    );

    const datesParam = `&dates=${dates.start}/${dates.end}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}${datesParam}`;
}

export function buildIcsContent(event, origin = 'https://cyclingcalendar.pt') {
    const dates = getCalendarDates(event);
    if (!dates) return null;
    const nowStr = formatIcsDate(new Date());

    const eventUrl = `${origin}/events/${encodeURIComponent(event.id)}`;
    const cleanTitle = escapeText(event.title || 'Prova de Ciclismo');
    const cleanLocation = escapeText(event.distrito || event.details?.split('|')[0]?.trim() || 'Portugal');
    const cleanDescription = escapeText(`Prova: ${event.title || 'Prova de Ciclismo'}\nModalidade: ${event.tag || 'Ciclismo'}\nConsulta o programa oficial para confirmar os horários.\nDetalhes e inscrições: ${eventUrl}`);

    return [
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
        'END:VEVENT',
        'END:VCALENDAR'
    ].map(foldLine).join('\r\n') + '\r\n';
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
    URL.revokeObjectURL(url);
    return true;
}
