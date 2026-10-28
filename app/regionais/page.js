import RegionaisClient from './RegionaisClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';

export const revalidate = 300;

export default async function RegionaisPage() {
    const events = await getPublicCalendarEvents();
    return <RegionaisClient initialEvents={events} />;
}
