import { eventDateDisplay } from './eventDateDisplay.js';
import { originalEventUrl } from '../lib/publicEvent.js';
import { isCancelled } from './planning.js';
import { getEventDiscipline } from './eventClassifier.js';

const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const safeFavoriteIds = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 1000))].slice(0, 1000) : [];
const generic = new Set(['granfondo','ciclismo','btt','estrada','maratona','passeio','prova','campeonato','nacional','nacionais','taca','portugal','xco','xcm','xcc','xce','dhi','enduro','ciclocrosse','circuito','edicao','de','do','da','dos','das','a','o','e']);
export function editionIdentity(event) {
    if (!event || isCancelled(event) || event.source?.includes('Quarentena') || !originalEventUrl(event.link)) return null;
    const dates = eventDateDisplay(event);
    if (!dates.start) return null;
    const year = Number(dates.start.slice(0, 4));
    let name = normal(event.title).replace(/\b20\d{2}\b/g, '').replace(/\bgrandfondo\b/g, 'granfondo').trim();
    // Preserve cup rounds, categories, distances and place names.
    if (!/\b(?:taca|campeonato|etapa|ronda)\b/.test(name)) {
        name = name.replace(/^\s*\d+\s*[.ªº]+\s*(?:edicao\s*)?/, '')
            .replace(/^\s*(?:[ivxlcdm]+)\s+edicao\s+/,'');
    }
    name = name.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    // Source-specific alias observed in the 2027 Cabreira listing. Do not
    // strip arbitrary trailing numbers from other events.
    if (name === 'granfondo medio tejo 2' && year === 2027 &&
        /cabreirasolutions\.com\/evento\/granfondo-medio-tejo-2\/?$/.test(event.link)) name = 'granfondo medio tejo';
    const storedTag = normal(event.tag);
    const discipline = !storedTag || ['btt','estrada','ciclismo'].includes(storedTag) ? getEventDiscipline(event) || event.tag : event.tag;
    const tag = normal(discipline).replace(/[^a-z0-9]+/g,' ').trim();
    if (!tag || !name.split(' ').some(word => word.length >= 4 && !generic.has(word) && !/^\d+$/.test(word))) return null;
    const sport = /\bxcm\b/.test(tag) ? 'btt xcm' : tag;
    const series = sport + ':' + name;
    return { series, key: series + ':' + year, year, start: dates.start };
}
export function editionMatches(events, seedIds, excludedKeys = []) {
    const seeds = new Set(safeFavoriteIds(seedIds));
    const excluded = new Set(safeFavoriteIds(excludedKeys));
    const groups = new Map();
    const seedYears = new Map();
    for (const event of events || []) {
        const identity = editionIdentity(event);
        if (!identity) continue;
        if (seeds.has(event.id) || event._allIds?.some(id => seeds.has(id))) {
            if (!excluded.has(identity.key)) seedYears.set(identity.series, Math.min(seedYears.get(identity.series) || Infinity, identity.year));
        }
        const group = groups.get(identity.key) || [];
        group.push({ event, identity }); groups.set(identity.key, group);
    }
    const matches = [];
    for (const [key, group] of groups) {
        const identity = group[0].identity;
        if (excluded.has(key) || !seedYears.has(identity.series) || identity.year <= seedYears.get(identity.series)) continue;
        // Different dates for the same named annual event are ambiguous.
        if (new Set(group.map(item => item.identity.start)).size !== 1) continue;
        const sorted = [...group].sort((a,b) => a.event.id.localeCompare(b.event.id));
        matches.push({ key, series: identity.series, year: identity.year, event: sorted[0].event,
            ids: safeFavoriteIds(sorted.flatMap(item => [item.event.id, ...(item.event._allIds || [])])) });
    }
    return matches.sort((a,b) => a.year - b.year || a.key.localeCompare(b.key));
}
export function editionState(value) {
    return { addedIds: safeFavoriteIds(value?.addedIds), seenKeys: safeFavoriteIds(value?.seenKeys),
        series: safeFavoriteIds(value?.series) };
}
export function planFavoriteEditions(events, manualIds, excludedKeys, previous = {}, { baseline = false } = {}) {
    const before = editionState(previous);
    const excluded = new Set(safeFavoriteIds(excludedKeys));
    const byId = new Map((events || []).flatMap(event => [event.id, ...(event._allIds || [])].map(id => [id, event])));
    const retained = before.addedIds.filter(id => {
        const event = byId.get(id); return !event || !excluded.has(editionIdentity(event)?.key);
    });
    const seeds = safeFavoriteIds([...safeFavoriteIds(manualIds), ...retained]);
    const matches = editionMatches(events, seeds, excludedKeys);
    const known = new Set(before.seenKeys);
    const knownSeries = new Set(before.series);
    const notices = baseline ? [] : matches.filter(match => !known.has(match.key) && knownSeries.has(match.series));
    const noticeKeys = new Set(notices.map(item => item.key));
    const state = { addedIds: safeFavoriteIds([...retained, ...matches.flatMap(item => item.ids)]),
        seenKeys: safeFavoriteIds([...before.seenKeys, ...matches.map(item => item.key)]),
        ...(Array.isArray(previous?.notifiedKeys) ? { notifiedKeys: safeFavoriteIds(previous.notifiedKeys) } : {}),
        series: safeFavoriteIds([...before.series, ...seeds.map(id => editionIdentity(byId.get(id))?.series).filter(Boolean)]) };
    return { state, notices, matches,
        deferredState: { ...state, seenKeys: state.seenKeys.filter(key => !noticeKeys.has(key)) } };
}

// Discovery is not delivery: editions already in the catalogue must stay
// eligible until this channel has actually sent an alert about them.
export function planEditionNotifications(events, manualIds, excludedKeys, previous = {}, { legacySent = false } = {}) {
    const plan = planFavoriteEditions(events, manualIds, excludedKeys, previous);
    const notifiedKeys = safeFavoriteIds(Array.isArray(previous?.notifiedKeys) ? previous.notifiedKeys : legacySent ? previous?.seenKeys : []);
    const delivered = new Set(notifiedKeys);
    const notices = plan.matches.filter(match => !delivered.has(match.key));
    const state = { ...plan.state, notifiedKeys };
    return { ...plan, notices, state,
        sentState: { ...state, notifiedKeys: safeFavoriteIds([...notifiedKeys, ...notices.map(match => match.key)]) } };
}
export function effectiveEditionIds(events, manualIds, excludedKeys, previous, follow) {
    const state = follow ? planFavoriteEditions(events, manualIds, excludedKeys, previous).state : editionState(previous);
    const excluded = new Set(safeFavoriteIds(excludedKeys));
    const byId = new Map((events || []).flatMap(event => [event.id, ...(event._allIds || [])].map(id => [id, event])));
    return state.addedIds.filter(id => !excluded.has(editionIdentity(byId.get(id))?.key));
}

// Keep the user's existing calendar identities; automatic aliases must not
// create a second appointment for the same annual edition and published date.
export function editionFeedEvents(events, manualIds) {
    const manual = new Set(safeFavoriteIds(manualIds));
    const identityKey = event => {
        const identity = editionIdentity(event);
        return identity ? identity.key + ':' + identity.start : event.id;
    };
    const seen = new Set(events.filter(event => manual.has(event.id)).map(identityKey));
    return events.filter(event => {
        if (manual.has(event.id)) return true;
        const key = identityKey(event);
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
}
