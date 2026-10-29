import { filterEvents } from '../utils/filterEvents.js';
import { eventDateDisplay } from '../utils/eventDateDisplay.js';

// Keep this landing page useful between racing seasons. Only the international
// catalogue determines its defaults; unrelated future races must not hide it.
export function internationalCalendar(events, today) {
    const international = filterEvents(events, { selectedAmbito: 'Internacional' });
    const dates = international.map(event => eventDateDisplay(event));
    const upcoming = dates.some(date => date.start && (date.end || date.start) >= today);
    const years = dates.filter(date => date.start).map(date => date.start.slice(0, 4)).sort();
    const archiveYear = upcoming ? null : years.at(-1) || null;
    return { events: international, archiveYear,
        defaultPastEventsFilter: upcoming ? 'futuros' : 'todos',
        defaultYears: archiveYear ? [archiveYear] : null };
}
