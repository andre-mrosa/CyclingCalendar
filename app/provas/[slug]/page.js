import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicEvent, getPublicCalendarEvents } from '../../lib/getPublicCalendarEvents';
import { eventIdFromSlug, eventPath } from '../../lib/eventDiscovery';
import { SITE_URL, pageMetadata, eventDescription, eventPageStructuredData, jsonLd } from '../../lib/seo';
import { eventDateDisplay } from '../../utils/eventDateDisplay';
import EventDetail from '../../components/EventDetail';
import { upcomingRelatedEvents } from '../../utils/calendarInterface';
import { lisbonWallClock } from '../../utils/planning';
export const dynamic = 'force-dynamic';
async function resolveEvent(params) {
    const { slug } = await params;
    const id = eventIdFromSlug(slug);
    const event = id && await getPublicEvent(id);
    if (!event) notFound();
    if (eventPath(event) !== '/provas/' + slug) permanentRedirect(eventPath(event));
    return event;
}
export async function generateMetadata({ params }) {
    const event = await resolveEvent(params);
    return pageMetadata(eventPath(event), `${event.title} — ${eventDateDisplay(event).start ? event.date : 'Data por confirmar'} | Cycling Calendar`, eventDescription(event));
}
export default async function EventPage({ params }) {
    const event = await resolveEvent(params);
    const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Calendário', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: event.title, item: SITE_URL + eventPath(event) },
    ] };
    const related = upcomingRelatedEvents(event, await getPublicCalendarEvents(), lisbonWallClock().slice(0, 10));
    return <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(eventPageStructuredData(event)) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />
        <EventDetail event={JSON.parse(JSON.stringify(event))} related={JSON.parse(JSON.stringify(related))} />
    </>;
}
