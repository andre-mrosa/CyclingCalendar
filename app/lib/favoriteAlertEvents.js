import { withRegistrationDates } from '../utils/registrationDates.js';
export async function favoriteAlertEvents(db, user) {
    const ids = Array.isArray(user.unsafeMetadata?.favorites) ? user.unsafeMetadata.favorites.filter(id => typeof id === 'string').slice(0, 500) : [];
    const events = await db.event.findMany({ where: { id: { in: ids }, NOT: { source: { contains: 'Quarentena' } } }, select: {
        id: true, title: true, date: true, sortDate: true, details: true, distrito: true,
        prices: true, registrationOpensAt: true, registrationClosesAt: true,
    } });
    return events.map(event => withRegistrationDates({ ...event, sortDate: event.sortDate?.toISOString(), registrationOpensAt: event.registrationOpensAt?.toISOString(), registrationClosesAt: event.registrationClosesAt?.toISOString() }));
}
