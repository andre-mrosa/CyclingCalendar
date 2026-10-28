import HomeClient from './HomeClient';
import { SITE_URL, PUBLIC_PAGES, pageMetadata, jsonLd, eventStructuredData, filterUpcomingEvents } from './lib/seo';
import { getPublicCalendarEvents } from './lib/getPublicCalendarEvents';
import SeoOverviewSection from './components/SeoOverviewSection';

export const revalidate = 300;
export const metadata = pageMetadata(...PUBLIC_PAGES[0]);

export default async function HomePage() {
    const initialEvents = await getPublicCalendarEvents();
    const upcomingEvents = filterUpcomingEvents(initialEvents, 40);

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Próximas Provas de Ciclismo em Portugal',
        itemListElement: upcomingEvents.map((event, index) => {
            const data = eventStructuredData(event);
            if (!data) return null;
            return {
                '@type': 'ListItem',
                position: index + 1,
                item: data,
            };
        }).filter(Boolean),
    };

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Cycling Calendar',
        alternateName: ['Calendário de Ciclismo Portugal', 'Cycling Calendar Portugal'],
        url: SITE_URL + '/',
        inLanguage: 'pt-PT',
        description: PUBLIC_PAGES[0][2],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }}
            />
            {itemListSchema.itemListElement.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }}
                />
            )}
            <HomeClient initialEvents={initialEvents} />
            <SeoOverviewSection />
        </>
    );
}
