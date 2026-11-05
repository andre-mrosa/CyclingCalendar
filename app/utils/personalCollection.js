import { eventDateDisplay } from './eventDateDisplay.js';

export const PERSONAL_STATUSES = ['interested', 'going', 'registered'];
export function matchesPersonalFilter(filter, status, inCalendar) {
    return filter === 'calendar' ? Boolean(inCalendar) : Boolean(status && (filter === 'all' || status === filter));
}
export function personalCalendarMonth(events, today) {
    const dates = events.map(eventDateDisplay).map(date=>({...date,start:date.start||date.periodStart,end:date.end||date.periodEnd})).filter(date => date.start).sort((a, b) => a.start.localeCompare(b.start));
    const next = dates.find(date => (date.end || date.start) >= today);
    return (next ? (next.start < today ? today : next.start) : dates.at(-1)?.start || today).slice(0, 7);
}
export const personalPath = path => ['/agenda', '/favoritos'].includes(path) ? '/minhas-provas' : path;

export async function changePersonalStatus(event, status, { persist, favorites, toggleFavorite }) {
    if (persist) await persist({ eventId: event.id, aliases: event._allIds || [], status: status || 'dismissed' });
    const ids = [event.id, ...(event._allIds || [])];
    const favorited = favorites.some(id => ids.includes(id));
    if (Boolean(status) !== favorited) toggleFavorite(event.id);
}
// Cancellation or a provider failure must never remove the local/personal entry.
export async function removePersonalEvent({ confirm, inCalendar, removeCalendar, removePersonal }) {
    if (!await confirm()) return false;
    if (inCalendar) await removeCalendar();
    await removePersonal();
    return true;
}

// Preserve existing sources without copying or changing Google events.
export function personalStatus(event, favorites = [], markedSet = new Set(), states = []) {
    const ids = new Set([event.id, ...(event._allIds || [])].map(String));
    const state = states.find(row => ids.has(row.eventId));
    // A Google event is part of the unified collection even if an older UI hid it.
    // New removal explicitly removes it from Google before dismissing it here.
    if (state?.status === 'dismissed') return [...ids].some(id => markedSet.has(id)) ? 'interested' : null;
    if (PERSONAL_STATUSES.includes(state?.status)) return state.status;
    return favorites.some(id => ids.has(id)) || [...ids].some(id => markedSet.has(id)) ? 'interested' : null;
}

export function personalNavigation(state = {}) {
    const normalize = tab => ['Minha Agenda', 'Agenda'].includes(tab) ? 'Favoritos' : tab;
    const tabsOrder = [...new Set((state.tabsOrder || []).map(normalize))];
    const hiddenTabs = (state.hiddenTabs || []).filter(tab => !['Minha Agenda', 'Agenda', 'Favoritos'].includes(tab));
    if ((state.hiddenTabs || []).includes('Favoritos') && (state.hiddenTabs || []).includes('Minha Agenda')) hiddenTabs.push('Favoritos');
    return { ...state, tabsOrder, hiddenTabs, defaultPage: personalPath(state.defaultPage) };
}
