import LazerClient from './LazerClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';

export const revalidate = 300;

export default async function LazerPage() {
    const events = await getPublicCalendarEvents();
    return <LazerClient initialEvents={events} />;
}
