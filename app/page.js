import HomeClient from './HomeClient';
import { SITE_URL, PUBLIC_PAGES, pageMetadata, jsonLd, itemListStructuredData, filterUpcomingEvents } from './lib/seo';
import { getPublicCalendarEvents } from './lib/getPublicCalendarEvents';
import SeoOverviewSection from './components/SeoOverviewSection';
export const revalidate = 300;
export const metadata = pageMetadata(...PUBLIC_PAGES[0]);
export default async function HomePage() {
    const initialEvents = await getPublicCalendarEvents();
    const upcomingEvents = filterUpcomingEvents(initialEvents, 40);
    const websiteSchema = { '@context': 'https://schema.org', '@type': 'WebSite',
        name: 'Cycling Calendar', alternateName: 'Cycling Calendar Portugal',
        url: SITE_URL + '/', inLanguage: 'pt-PT', description: PUBLIC_PAGES[0][2] };
    return <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }} />
        {upcomingEvents.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListStructuredData(upcomingEvents, 'Próximas provas no calendário')) }} />}
        <HomeClient initialEvents={initialEvents} />
        <SeoOverviewSection events={initialEvents} />
    </>;
}
