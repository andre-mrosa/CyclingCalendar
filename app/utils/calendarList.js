import { withRegistrationDates } from './registrationDates.js';
import { eventDateDisplay } from './eventDateDisplay.js';

export function sortCalendarEvents(events, favorites = []) {
    const saved = new Set(favorites);
    const favorite = event => [event.id, ...(event._allIds || [])].some(id => saved.has(id));
    return events.map(event => ({ event, day: eventDateDisplay(event).start || '9999', favorite: favorite(event) }))
        .sort((a, b) => a.day.localeCompare(b.day) || Number(b.favorite) - Number(a.favorite))
        .map(({ event }) => event);
}

// The list needs dates and labels; large documents and images load on opening a race.
export function toCalendarListEvent(event) {
    const { prices, image, logo, description, programa, insurance, prizes, gpxData, ...summary } = withRegistrationDates(event);
    return {
        ...summary,
        translations: (event.translations || []).map(({ language, title, details }) => ({ language, title, details })),
    };
}

export function chooseCalendarEvents(fetched, cached, { offline = false, failed = false } = {}) {
    // A valid empty response must not revive events from an old cache.
    if (Array.isArray(fetched)) return fetched;
    return (offline || failed) && Array.isArray(cached) ? cached : [];
}
