import NacionaisClient from './NacionaisClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';

export const revalidate = 300;

export default async function NacionaisPage() {
    const events = await getPublicCalendarEvents();
    return <NacionaisClient initialEvents={events} />;
}
