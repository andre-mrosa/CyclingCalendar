import { eventDateDisplay } from './eventDateDisplay.js';

// Some sources publish shouting capitals. Keep mixed-case names and race acronyms intact.
export function formatEventTitle(title) {
    if (!title || title !== title.toLocaleUpperCase('pt-PT')) return title;
    const acronyms = new Set(['BTT', 'BMX', 'UCI', 'FPC', 'XCO', 'XCM', 'XCC', 'XCE', 'DH', 'MTB', 'EPX', 'CDN']);
    const connectors = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o']);
    let wordIndex = 0;
    return title.replace(/\p{L}+/gu, word => {
        const index = wordIndex++;
        if (acronyms.has(word)) return word;
        const lower = word.toLocaleLowerCase('pt-PT');
        return index > 0 && connectors.has(lower) ? lower : lower.charAt(0).toLocaleUpperCase('pt-PT') + lower.slice(1);
    });
}

export function shiftMonth(month, delta) {
    const [year, number] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, number - 1 + delta, 1));
    return date.toISOString().slice(0, 7);
}

export function monthDays(month) {
    const [year, number] = month.split('-').map(Number);
    const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
        const day = index - offset + 1;
        return day < 1 || day > count ? null : `${month}-${String(day).padStart(2, '0')}`;
    });
}

export function eventOccursOn(event, day) {
    const { start, end } = eventDateDisplay(event);
    return Boolean(start && start <= day && (end || start) >= day);
}

export function eventsInPeriod(events, month, day) {
    if (day) return events.filter(event => eventOccursOn(event, day));
    if (!month) return events;
    const from = `${month}-01`;
    const until = `${shiftMonth(month, 1)}-01`;
    return events.filter(event => {
        const { start, end } = eventDateDisplay(event);
        return start && start < until && (end || start) >= from;
    });
}

// Keep distinct multi-day ranges explicit rather than hiding their end date.
export function sameDateGroup(first, second) {
    if (!first || !second) return false;
    const a = eventDateDisplay(first), b = eventDateDisplay(second);
    return Boolean(a.start && a.start === b.start && a.end === b.end);
}
