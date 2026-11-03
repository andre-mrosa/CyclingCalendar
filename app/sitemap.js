import { SITE_URL, PUBLIC_PAGES } from './lib/seo';
import { getPublicCalendarEventsFresh } from './lib/getPublicCalendarEvents';
import { DISCIPLINES, REGIONS, availableCollections, eventPath, collectionPath } from './lib/eventDiscovery';
import {availableMonths} from './lib/calendarMonths';
// Generate from the current public catalogue on every request. A cached sitemap
// can otherwise keep renamed URLs or omit new events after the catalogue changes.
export const dynamic = 'force-dynamic';
export default async function sitemap() {
    // Only the minimal public projection; never historical descriptions or assets.
    const events = await getPublicCalendarEventsFresh();
    const paths = [...PUBLIC_PAGES.map(([path]) => path),
        ...availableCollections(events, DISCIPLINES).map(item => collectionPath('modalidades', item)),
        ...availableCollections(events, REGIONS).map(item => collectionPath('regioes', item)),
        '/calendarios',...availableMonths(events).map(item=>collectionPath('meses',item)),
        ...events.map(eventPath)];
    // No synthetic lastModified dates: a scrape time is not an editorial update.
    return [...new Set(paths)].map(path => ({ url: SITE_URL + path }));
}
