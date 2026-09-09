import { withRegistrationDates } from './registrationDates.js';

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
