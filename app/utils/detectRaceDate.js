// Preserve published dates; programme keywords do not establish the race day.
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function validISO(value) {
    const iso = value instanceof Date ? (Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '') : String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const date = new Date(iso + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
function isoDate(day, month, year) {
    const index = MONTHS.indexOf(month?.slice(0, 3).toUpperCase());
    if (index < 0 || !year) return null;
    return validISO(year + '-' + String(index + 1).padStart(2, '0') + '-' + String(Number(day)).padStart(2, '0'));
}
export function detectRaceDate(event) {
    if (!event) return null;
    const raw = String(event.date || '').trim();
    const sortISO = validISO(event.sortDate);
    const year = raw.match(/\b(20\d{2})\b/)?.[1] || sortISO?.slice(0, 4);
    let start, end;
    if (raw && /definir|anunciar|adiad|tbd|evento|unknown/i.test(raw)) return null;
    const range = raw.match(/^(\d{1,2})\s*([a-zà-ú]{3,9})?(?:\s+(20\d{2}))?\s*(?:a|até|e|[-–—])\s*(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(20\d{2}))?$/i);
    const single = raw.match(/^(\d{1,2})\s+([a-zà-ú]{3,9})(?:\s+(20\d{2}))?$/i);
    if (range) {
        const firstMonth = range[2] || range[5], lastMonth = range[5];
        let firstYear = Number(range[3] || range[6] || year);
        let lastYear = Number(range[6] || range[3] || year);
        if (!firstYear || !lastYear) return null;
        if (MONTHS.indexOf(lastMonth.slice(0, 3).toUpperCase()) < MONTHS.indexOf(firstMonth.slice(0, 3).toUpperCase())) {
            if (!range[6]) lastYear += 1;
            else if (!range[3]) firstYear -= 1;
        }
        start = isoDate(range[1], firstMonth, firstYear);
        end = isoDate(range[4], lastMonth, lastYear);
    } else if (single) {
        start = isoDate(single[1], single[2], single[3] || year);
        end = start;
    } else if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw)) {
        start = validISO(raw);
        end = event.endDate ? validISO(event.endDate) : start;
    } else if (!raw) {
        start = sortISO;
        end = event.endDate ? validISO(event.endDate) : start;
    } else {
        // Unknown formats need review, not a guessed export.
        return null;
    }
    if (!start || !end || end < start) return null;
    if (/\s+e\s+/i.test(raw) && (new Date(end) - new Date(start)) > 86400000) return null;
    return { raceDateISO: start, raceEndDateISO: end, startTime: null,
        label: raw || start, isMultiStage: false, raceDayOnly: start === end };
}
