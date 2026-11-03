import { eventDateDisplay } from './eventDateDisplay.js';

export const PERSONAL_STATUSES = ['interested', 'going', 'registered'];
export function personalCalendarMonth(events, today) {
    const dates = events.map(eventDateDisplay).filter(date => date.start).sort((a, b) => a.start.localeCompare(b.start));
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

// Preserve existing sources without copying or changing Google events.
export function personalStatus(event, favorites = [], markedSet = new Set(), states = []) {
    const ids = new Set([event.id, ...(event._allIds || [])].map(String));
    const state = states.find(row => ids.has(row.eventId));
    if (state?.status === 'dismissed') return null;
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
