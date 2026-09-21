import { parseScheduleServer } from '../utils/scheduleParserServer.js';
import { resolveEventLocation } from '../utils/eventLocation.js';

export function withEventLocation(event) {
    return { ...event, locationInfo: resolveEventLocation(event, parseScheduleServer(event.programa)) };
}
