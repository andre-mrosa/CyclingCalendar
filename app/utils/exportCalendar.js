/**
 * Utility to generate and download an RFC 5545 .ics calendar file
 * for single or bulk cycling events.
 */

function formatICSDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

export function exportEventsToICS(events, filename = 'cycling_calendar.ics') {
    if (!events || events.length === 0) return false;

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CyclingCalendar Portugal//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Cycling Calendar Portugal',
        'X-WR-TIMEZONE:Europe/Lisbon'
    ];

    events.forEach((event) => {
        if (!event.sortDate && !event.date) return;

        const eventDate = event.sortDate ? new Date(event.sortDate) : new Date();
        const startStr = formatICSDate(eventDate);
        
        // Default duration: 4 hours
        const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
        const endStr = formatICSDate(endDate);

        const summary = escapeICSText(event.title || 'Prova de Ciclismo');
        const description = escapeICSText(
            `${event.details || ''}\n\nÂmbito: ${event.ambito || 'Geral'}\nModalidade: ${event.tag || 'Ciclismo'}\nOrganização: ${event.source || 'FPC'}\nMais info: ${event.link || 'https://cyclingcalendar.pt'}`
        );
        const location = escapeICSText(event.distrito ? `${event.distrito}, Portugal` : 'Portugal');

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:event-${event.id || Math.random().toString(36).substring(2)}@cyclingcalendar.pt`,
            `DTSTAMP:${formatICSDate(new Date())}`,
            `DTSTART:${startStr}`,
            `DTEND:${endStr}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            `LOCATION:${location}`,
            `URL:${event.link || 'https://cyclingcalendar.pt'}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
}
