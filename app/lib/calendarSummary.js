import { withEventLocation } from './eventLocation.js';
import { withRegistrationDates } from '../utils/registrationDates.js';
export function buildListSummary(event) {
    const enriched = withRegistrationDates(withEventLocation(event));
    return JSON.parse(JSON.stringify({
        version: 1, locationInfo: enriched.locationInfo,
        registrationOpensAt: enriched.registrationOpensAt || null,
        registrationClosesAt: enriched.registrationClosesAt || null,
    }));
}
export async function hydrateListSummaries(db, ids) {
    const summaries = new Map();
    for (let offset = 0; offset < ids.length; offset += 50) {
        const rows = await db.event.findMany({ where: { id: { in: ids.slice(offset, offset + 50) } }, select: {
            id: true, title: true, details: true, regiao: true, distrito: true, ambito: true,
            organizador: true, programa: true, prices: true, registrationOpensAt: true,
            registrationClosesAt: true, updatedAt: true,
        } });
        for (const event of rows) {
            const summary = buildListSummary(event);
            // Never cache a summary after a concurrent edit. Do not modify updatedAt.
            await db.$executeRaw`UPDATE "Event" SET "listSummary" = ${JSON.stringify(summary)}::jsonb WHERE "id" = ${event.id} AND "updatedAt" = ${event.updatedAt}`;
            summaries.set(event.id, summary);
        }
    }
    return summaries;
}
