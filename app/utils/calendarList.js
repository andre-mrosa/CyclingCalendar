import { toPublicEvent } from '../lib/publicEvent.js';
import { eventDateDisplay } from './eventDateDisplay.js';

export function filterCalendarByDate(events, filter, today, selectedYears = []) {
    if (!today || filter === 'todos') return events;
    return events.filter(event => {
        const end = eventDateDisplay(event).end || String(event.sortDate || '').slice(0, 10);
        if (filter === 'passados') return Boolean(end && end < today);
        // Preserve explicitly selected historical years for browsing the archive.
        const year = String(event.sortDate || '').slice(0, 4);
        if (year && selectedYears.includes(year) && year < today.slice(0, 4)) return true;
        return !end || end >= today;
    });
}

export function sortCalendarEvents(events, favorites = []) {
    const saved = new Set(favorites);
    const favorite = event => [event.id, ...(event._allIds || [])].some(id => saved.has(id));
    return events.map(event => ({ event, day: eventDateDisplay(event).start || '9999', favorite: favorite(event) }))
        .sort((a, b) => a.day.localeCompare(b.day) || Number(b.favorite) - Number(a.favorite))
        .map(({ event }) => event);
}

export const toCalendarListEvent = toPublicEvent;

export function chooseCalendarEvents(fetched, cached, { offline = false, failed = false } = {}) {
    // A valid empty response must not revive events from an old cache.
    if (Array.isArray(fetched)) return fetched;
    return (offline || failed) && Array.isArray(cached) ? cached : [];
}
