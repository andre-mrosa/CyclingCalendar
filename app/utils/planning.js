import { getCalendarDates } from './calendarExport.js';

export function isCancelled(event) {
    return /\b(anulad[oa]s?|cancelad[oa]s?|cancelled|canceled)\b/i.test(event.title || '');
}

export function matchesPeriod(event, period, now = new Date()) {
    if (!period) return true;
    if (isCancelled(event)) return false;
    if (period === 'open') {
        // Unknown opening/closing dates cannot establish that registration is open.
        return !!event.registrationOpensAt && !!event.registrationClosesAt &&
            event.registrationOpensAt <= lisbonWallClock(now) && event.registrationClosesAt >= lisbonWallClock(now);
    }
    const raw = event.sortDate;
    if (!raw) return false;
    const eventDate = new Date(raw);
    if (!Number.isFinite(eventDate.getTime())) return false;
    const day = eventDate.toISOString().slice(0, 10);
    const dates = getCalendarDates(event);
    const compactToISO = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    const endDay = dates ? compactToISO(dates.end) : day;
    const today = lisbonWallClock(now).slice(0, 10);
    if (period === 'month') return endDay > today && day.slice(0, 7) <= today.slice(0, 7);
    if (period === 'weekend') {
        const start = new Date(today + 'T00:00:00Z');
        const weekday = start.getUTCDay();
        start.setUTCDate(start.getUTCDate() + (weekday === 0 ? -1 : 6 - weekday));
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        return endDay > start.toISOString().slice(0, 10) && day <= end.toISOString().slice(0, 10);
    }
    return true;
}

export function registrationDaysUntil(value, now = new Date()) {
    const wall = lisbonWallClock(now);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date < new Date(wall)) return -1;
    return Math.round((new Date(date.toISOString().slice(0, 10)) - new Date(wall.slice(0, 10))) / 86400000);
}

// Schema uses UTC fields for local Lisbon dates (see registrationDates.js).
export function lisbonWallClock(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000Z`;
}

export function conciseEscaloes(values = []) {
    const unique = [...new Set(values)];
    if (unique.includes('Todos (Aberto)')) return unique.filter(v => !['Geral / Aberto', 'Geral / Vários'].includes(v));
    return unique;
}
