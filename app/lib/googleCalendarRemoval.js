import { requestError } from './requestBody.js';

export function calendarRemovalIdentifiers(event, target = 'event') {
    if (!event || !['event', 'registration_open', 'registration_close'].includes(target)) throw requestError(400, 'Invalid calendar target');
    if (event._allIds !== undefined && !Array.isArray(event._allIds)) throw requestError(400, 'Invalid aliases');
    const ids = [...new Set([event.id, ...(event._allIds || [])])];
    if (!ids.length || ids.length > 50 || ids.some(id => typeof id !== 'string' || !id || id.length > 1000)) throw requestError(400, 'Invalid event identifiers');
    if (target === 'event') return ids;
    const suffix = target === 'registration_open' ? 'reg_open' : 'reg_close';
    return ids.flatMap(id => [`${id}_${suffix}`, `${id}-${suffix}`]);
}

async function pages(url, token) {
    const items = [], seen = new Set();
    let pageToken;
    do {
        if (seen.size >= 100 || seen.has(pageToken || '')) throw requestError(503, 'Calendar pagination unavailable');
        seen.add(pageToken || '');
        const next = new URL(url);
        if (pageToken) next.searchParams.set('pageToken', pageToken);
        const response = await fetch(next.href, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw requestError(503, 'Could not read Google Calendar');
        const data = await response.json();
        if (data.items !== undefined && !Array.isArray(data.items)) throw requestError(503, 'Invalid calendar response');
        items.push(...(data.items || []));
        pageToken = data.nextPageToken;
    } while (pageToken);
    return items;
}

export async function removeGoogleCalendarEntries(token, identifiers) {
    const calendars = await pages('https://www.googleapis.com/calendar/v3/users/me/calendarList', token);
    const calendarId = calendars.find(item => /^cycling\s*calendar$/i.test(item.summary))?.id || 'primary';
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const deletions = new Map();
    // Finish every lookup before deleting: a failed lookup cannot report success.
    for (const identifier of identifiers) {
        const url = new URL(base);
        url.searchParams.set('privateExtendedProperty', 'cyclingCalendarEventId=' + identifier);
        for (const item of await pages(url, token)) {
            if (typeof item.id === 'string' && item.status !== 'cancelled' && item.extendedProperties?.private?.cyclingCalendarEventId === identifier) deletions.set(item.id, item);
        }
    }
    let deletedCount = 0;
    for (const id of deletions.keys()) {
        const response = await fetch(`${base}/${encodeURIComponent(id)}?sendUpdates=none`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
        });
        if (!response.ok && ![404, 410].includes(response.status)) throw requestError(503, 'Could not remove Google Calendar event');
        deletedCount++;
    }
    return deletedCount;
}
