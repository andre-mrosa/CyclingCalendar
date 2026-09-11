import { timingSafeEqual } from 'node:crypto';
import { buildIcsContent } from '../utils/calendarExport.js';
import { isCancelled } from '../utils/planning.js';

export function validSubscriptionToken(received, stored) {
    return typeof received === 'string' && typeof stored === 'string' &&
        /^[a-f0-9]{64}$/.test(received) && /^[a-f0-9]{64}$/.test(stored) &&
        timingSafeEqual(Buffer.from(received), Buffer.from(stored));
}

export function subscriptionIcs(events, origin) {
    const entries = events.map(event => {
        let content = buildIcsContent(event, origin);
        if (!content) return '';
        if (isCancelled(event)) content = content.replace('STATUS:CONFIRMED', 'STATUS:CANCELLED')
            .replace(/BEGIN:VALARM[\s\S]*?END:VALARM\r\n/, '');
        const modified = new Date(event.updatedAt || event.createdAt);
        if (Number.isFinite(modified.getTime())) {
            const stamp = modified.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
            content = content.replace(/DTSTAMP:[^\r]+/, `DTSTAMP:${stamp}\r\nLAST-MODIFIED:${stamp}`);
        }
        return content.slice(content.indexOf('BEGIN:VEVENT'), content.lastIndexOf('END:VCALENDAR'));
    });
    // An empty calendar is valid: clients must be able to remove unstarred events.
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cycling Calendar//Favorites//PT\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Cycling Calendar - Favoritas\r\n' + entries.join('') + 'END:VCALENDAR\r\n';
}
