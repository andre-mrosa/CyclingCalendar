import InternacionaisClient from './InternacionaisClient';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';
import { internationalCalendar } from '../lib/internationalCalendar';
import { lisbonWallClock } from '../utils/planning';

export const revalidate = 300;

export default async function InternacionaisPage() {
    const data = internationalCalendar(await getPublicCalendarEvents(), lisbonWallClock().slice(0, 10));
    return <InternacionaisClient initialEvents={data.events} archiveYear={data.archiveYear}
        defaultYears={data.defaultYears} defaultPastEventsFilter={data.defaultPastEventsFilter} />;
}
