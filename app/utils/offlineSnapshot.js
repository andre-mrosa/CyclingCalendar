import { toPublicEvent } from '../lib/publicEvent.js';
import { eventDateDisplay } from './eventDateDisplay.js';
import { getEventDiscipline, isStageRace } from './eventClassifier.js';
import { eventPath } from '../lib/eventDiscovery.js';
import { cleanOfflineRows, OFFLINE_CATALOGUE_KEY, OFFLINE_PERSONAL_KEY } from '../../public/offline-model.js';

export function saveOfflineCatalogue(storage, events, now = new Date()) {
    const rows = events.map(toPublicEvent).filter(Boolean).map(event => {
        const dates = eventDateDisplay(event);
        return { id: event.id, title: event.title, date: event.date, start: dates.start, end: dates.end, month:dates.precision==='month'?dates.key:'', location: event.distrito, discipline: getEventDiscipline(event), scope: event.ambito, source: event.source, aliases: event._allIds || [], path: eventPath(event), stage: isStageRace(event) };
    });
    try { storage.setItem(OFFLINE_CATALOGUE_KEY, JSON.stringify({ schema: 1, updatedAt: now.toISOString(), events: cleanOfflineRows(rows) })); return true; } catch { return false; }
}
export function saveOfflinePersonal(storage, scope, events, statusFor, isMarked) {
    try {
        let previous; try { previous = JSON.parse(storage.getItem(OFFLINE_PERSONAL_KEY)); } catch {}
        const entries = new Map(previous?.scope === scope && previous?.schema === 1 && Array.isArray(previous.entries) ? previous.entries.filter(row => Array.isArray(row) && typeof row[0] === 'string' && ['interested','going','registered'].includes(row[1])).map(row => [row[0], [row[0], row[1], row[2] === true]]) : []);
        for (const event of events) {
            for (const id of [event.id, ...(event._allIds || [])]) entries.delete(id);
            const status = statusFor(event);
            if (['interested', 'going', 'registered'].includes(status)) entries.set(event.id, [event.id, status, isMarked(event.id, 'event', event._allIds || [])]);
        }
        storage.setItem(OFFLINE_PERSONAL_KEY, JSON.stringify({ schema: 1, scope, entries: [...entries.values()].slice(0, 10000) })); return true;
    } catch { return false; }
}
