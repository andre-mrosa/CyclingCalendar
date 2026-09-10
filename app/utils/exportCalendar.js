import { buildEventsIcsContent } from './calendarExport.js';
export function exportEventsToICS(events, filename = 'cycling_calendar.ics') {
    if (typeof window === 'undefined') return false;
    const content = buildEventsIcsContent(events, window.location.origin);
    if (!content) return false;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
}
