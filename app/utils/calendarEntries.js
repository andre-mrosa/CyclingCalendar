import { detectRaceDate } from './detectRaceDate.js';
import { isCancelled } from './planning.js';

export function calendarEntry(item) {
    if (!item?.start || item.status === 'cancelled') return null;
    return {
        start: item.start.date || item.start.dateTime || null,
        end: item.end?.date || item.end?.dateTime || null,
        allDay: !!item.start.date,
        reminderMinutes: item.reminders?.useDefault === false
            ? (item.reminders.overrides || []).map(reminder => reminder.minutes).filter(Number.isFinite) : null,
        title: item.summary || '',
    };
}

export function findCalendarConflict(event, entries = {}) {
    if (!event || isCancelled(event)) return { hasConflict: false };
    const dates = detectRaceDate(event);
    if (!dates) return { hasConflict: false };
    const ids = new Set([event.id, ...(event._allIds || [])].map(String));
    for (const [id, entry] of Object.entries(entries)) {
        if (ids.has(id) || /_reg_(open|close)$/.test(id) || isCancelled({ title: entry.title })) continue;
        const start = entry.start?.slice(0, 10);
        let end = entry.end?.slice(0, 10) || start;
        if (entry.allDay && end) {
            const last = new Date(end + 'T00:00:00Z');
            last.setUTCDate(last.getUTCDate() - 1);
            if (Number.isFinite(last.getTime())) end = last.toISOString().slice(0, 10);
        }
        if (start && end && start <= dates.raceEndDateISO && end >= dates.raceDateISO) {
            return { hasConflict: true, conflictingTitle: entry.title, date: start };
        }
    }
    return { hasConflict: false };
}
