import { unstable_cache } from 'next/cache';
import { prisma } from './db.js';
import { CALENDAR_SOURCES } from './calendarSources.js';
import { queryCalendarList } from './calendarListQuery.js';

export const getPublicCalendarEvents = unstable_cache(
    async (years = [], sources = CALENDAR_SOURCES) => {
        try {
            const events = await queryCalendarList(prisma, years, sources);
            return JSON.parse(JSON.stringify(events));
        } catch (error) {
            console.error('Failed to query public calendar events for SSR:', error?.message || error);
            return [];
        }
    },
    ['calendar-minimal-links-v4'],
    { revalidate: 60, tags: ['calendar-events'] }
);
