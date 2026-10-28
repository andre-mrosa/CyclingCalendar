import InternacionaisClient from './InternacionaisClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';

export const revalidate = 300;

export default async function InternacionaisPage() {
    const events = await getPublicCalendarEvents();
    return <InternacionaisClient initialEvents={events} />;
}
