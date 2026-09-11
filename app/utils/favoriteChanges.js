import { getCalendarDates } from './calendarExport.js';
import { isCancelled } from './planning.js';

export function favoriteSnapshot(event) {
    const dates = getCalendarDates(event);
    return {
        title: event.title,
        date: dates ? `${dates.start}/${dates.end}` : '',
        location: event.details?.split('|')[0]?.trim() || event.distrito || '',
        cancelled: isCancelled(event),
        registrationClosesAt: event.registrationClosesAt || ''
    };
}

// Missing records can be filtered or temporarily unavailable: never call them cancelled.
export function compareFavoriteSnapshots(before, after) {
    if (!before || !after) return [];
    return ['date', 'location', 'cancelled', 'registrationClosesAt']
        .filter(field => before[field] !== after[field])
        .map(field => ({ field, before: before[field], after: after[field] }));
}
