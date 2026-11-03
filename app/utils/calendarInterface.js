import { eventDateDisplay } from './eventDateDisplay.js';
import { eventsInPeriod } from './calendarPresentation.js';
import { cleanLocation } from './eventLocation.js';
import { getEventDiscipline } from './eventClassifier.js';

// Presentation only: keep unknown dates available without putting them on a date.
export function monthCollection(events, month, day, includeUnknown = false) {
    const dated = eventsInPeriod(events, month, day);
    return includeUnknown && month && !day ? [...dated, ...events.filter(event => !eventDateDisplay(event).start)] : dated;
}
export function nextPersonalEvent(events, today, statusFor) {
    return events.filter(event => statusFor(event) && (eventDateDisplay(event).end || eventDateDisplay(event).start) >= today)
        .sort((a, b) => eventDateDisplay(a).start.localeCompare(eventDateDisplay(b).start))[0] || null;
}
export function publishedLocationOptions(events) {
    const values = new Map();
    for (const event of events) {
        const value = cleanLocation(event.distrito);
        if (!value) continue;
        // Collapse punctuation/case variants, preserving accents and source labels.
        // We cannot establish municipal boundaries or correct a place from its name.
        const key = value.toLocaleLowerCase('pt-PT').replace(/[-–—,;]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!values.has(key)) values.set(key, value);
    }
    return [...values.values()].sort((a, b) => a.localeCompare(b, 'pt-PT'));
}
export function calendarReturnPath(value) {
    try {
        if (typeof value !== 'string' || value.length > 20000) return '/';
        const url = new URL(value, 'https://cyclingcalendar.pt');
        return url.origin === 'https://cyclingcalendar.pt' && /^\/(?:minhas-provas|favoritos|agenda|nacionais|internacionais|regionais|tacas|lazer)?$/.test(url.pathname) ? url.pathname + url.search : '/';
    } catch { return '/'; }
}
export function upcomingRelatedEvents(event, catalogue, today, limit = 3) {
    const discipline = getEventDiscipline(event);
    if (!discipline) return [];
    const ownIds = new Set([event.id, ...(event._allIds || [])]);
    const seen = new Set();
    return catalogue.filter(other => {
        const ids = [other.id, ...(other._allIds || [])];
        if (ids.some(id => ownIds.has(id) || seen.has(id))) return false;
        const dates = eventDateDisplay(other);
        if (!dates.start || (dates.end || dates.start) < today || getEventDiscipline(other) !== discipline) return false;
        ids.forEach(id => seen.add(id));
        return true;
    }).sort((a, b) => eventDateDisplay(a).start.localeCompare(eventDateDisplay(b).start)).slice(0, limit);
}
