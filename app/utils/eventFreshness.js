import { isCancelled, lisbonWallClock } from './planning.js';
export function registrationStatus(event, now = new Date()) {
    if (isCancelled(event)) return 'cancelled';
    const valid = value => typeof value === 'string' && Number.isFinite(new Date(value).getTime());
    const wall = new Date(lisbonWallClock(now)).getTime();
    const opens = valid(event.registrationOpensAt) ? new Date(event.registrationOpensAt).getTime() : null;
    const closes = valid(event.registrationClosesAt) ? new Date(event.registrationClosesAt).getTime() : null;
    if (opens !== null && closes !== null && opens > closes) return 'unknown';
    if (closes !== null && closes < wall) return 'closed';
    if (opens !== null && opens > wall) return 'upcoming';
    if (opens !== null && closes !== null) return 'open';
    return 'unknown';
}
