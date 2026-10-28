import { getPublicEvent } from '@/app/lib/getPublicCalendarEvents';
import { eventPath } from '@/app/lib/eventDiscovery';
import { notFound, permanentRedirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function LegacyEventPage({ params }) {
    const { id } = await params;
    let event = await getPublicEvent(id);
    // Next can preserve escaped path delimiters in legacy route parameters.
    // Try the exact stored ID first so a literal "%23" is never misidentified.
    if (!event && /%[0-9a-f]{2}/i.test(id)) {
        try { event = await getPublicEvent(decodeURIComponent(id)); } catch (error) {
            if (!(error instanceof URIError)) throw error;
        }
    }
    if (!event) notFound();
    permanentRedirect(eventPath(event));
}
