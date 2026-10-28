import { SITE_URL, PUBLIC_PAGES } from './lib/seo';
import { getPublicCalendarEvents } from './lib/getPublicCalendarEvents';
import { DISCIPLINES, REGIONS, availableCollections, eventPath, collectionPath } from './lib/eventDiscovery';
export const revalidate = 300;
export default async function sitemap() {
    // Only the minimal public projection; never historical descriptions or assets.
    const events = await getPublicCalendarEvents();
    const paths = [...PUBLIC_PAGES.map(([path]) => path),
        ...availableCollections(events, DISCIPLINES).map(item => collectionPath('modalidades', item)),
        ...availableCollections(events, REGIONS).map(item => collectionPath('regioes', item)),
        ...events.map(eventPath)];
    // No synthetic lastModified dates: a scrape time is not an editorial update.
    return [...new Set(paths)].map(path => ({ url: SITE_URL + path }));
}
