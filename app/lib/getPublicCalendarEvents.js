import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { prisma } from './db.js';
import { CALENDAR_SOURCES } from './calendarSources.js';
import { queryCalendarList, queryPublicEvent } from './calendarListQuery.js';
// Surface database failures as errors, never as a successful empty catalogue.
// Used by request-time metadata that must not retain renamed or removed URLs.
export async function getPublicCalendarEventsFresh(years = [], sources = CALENDAR_SOURCES) {
    const events = await queryCalendarList(prisma, years, sources);
    return JSON.parse(JSON.stringify(events));
}
export const getPublicCalendarEvents = unstable_cache(
    getPublicCalendarEventsFresh,
    ['calendar-trust-v1'],
    { revalidate: 60, tags: ['calendar-events'] }
);
export const getPublicEvent = cache(async id => queryPublicEvent(prisma, id, CALENDAR_SOURCES));
