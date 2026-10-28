import TacasClient from './TacasClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';

export const revalidate = 300;

export default async function TacasPage() {
    const events = await getPublicCalendarEvents();
    return <TacasClient initialEvents={events} />;
}
