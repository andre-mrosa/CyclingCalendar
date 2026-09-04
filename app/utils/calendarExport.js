/**
 * Utilitários para exportar eventos para Google Calendar, Apple Calendar e ficheiro iCal (.ics)
 */

function formatIcsDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function generateGoogleCalendarUrl(event) {
    if (!event) return '#';
    const title = encodeURIComponent(event.title || 'Prova de Ciclismo');
    const location = encodeURIComponent(event.distrito || event.details?.split('|')[0]?.trim() || 'Portugal');
    const details = encodeURIComponent(
        `Prova: ${event.title}\nModalidade: ${event.tag || 'Ciclismo'}\nMais detalhes e inscrições: ${typeof window !== 'undefined' ? `${window.location.origin}/events/${event.id}` : `https://cyclingcalendar.pt/events/${event.id}`}`
    );

    let start = '';
    let end = '';

    if (event.sortDate) {
        const d = new Date(event.sortDate);
        if (!isNaN(d.getTime())) {
            // Se tiver hora específica definida, ou dia completo das 08:00 às 16:00
            const s = new Date(d);
            s.setUTCHours(8, 0, 0, 0);
            const e = new Date(d);
            e.setUTCHours(16, 0, 0, 0);
            start = formatIcsDate(s);
            end = formatIcsDate(e);
        }
    }

    const datesParam = start && end ? `&dates=${start}/${end}` : '';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}${datesParam}`;
}

export function downloadIcsFile(event) {
    if (!event || typeof window === 'undefined') return;

    let startStr = '';
    let endStr = '';
    const nowStr = formatIcsDate(new Date());

    if (event.sortDate) {
        const d = new Date(event.sortDate);
        if (!isNaN(d.getTime())) {
            const s = new Date(d);
            s.setUTCHours(8, 0, 0, 0);
            const e = new Date(d);
            e.setUTCHours(16, 0, 0, 0);
            startStr = formatIcsDate(s);
            endStr = formatIcsDate(e);
        }
    }

    if (!startStr) {
        const fallback = new Date();
        startStr = formatIcsDate(fallback);
        endStr = formatIcsDate(new Date(fallback.getTime() + 3600000 * 4));
    }

    const eventUrl = `${window.location.origin}/events/${event.id}`;
    const cleanTitle = (event.title || 'Prova de Ciclismo').replace(/\n/g, ' ');
    const cleanLocation = (event.distrito || event.details?.split('|')[0]?.trim() || 'Portugal').replace(/\n/g, ' ');
    const cleanDescription = `Prova: ${cleanTitle}\\nModalidade: ${event.tag || 'Ciclismo'}\\nDetalhes e Inscrições: ${eventUrl}`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Cycling Calendar Portugal//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:event-${event.id}@cyclingcalendar.pt`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${cleanTitle}`,
        `DESCRIPTION:${cleanDescription}`,
        `LOCATION:${cleanLocation}`,
        `URL:${eventUrl}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(event.title || 'prova').toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
