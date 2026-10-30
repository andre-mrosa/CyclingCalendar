import { formatDateStr } from './utils.js';
import { detectRaceDate } from '../../utils/detectRaceDate.js';

// Read the source's dedicated date field, not programmes or registration dates.
export function parsePublishedRaceDate(value) {
    const raw = String(value || '').replace(/\s+/g,' ').trim()
        .replace(/\b(?:segunda|ter[cç]a|quarta|quinta|sexta)(?:-feira)?\s*,?\s*|\bs[áa]bado\s*,?\s*|\bdomingo\s*,?\s*/gi,'')
        .replace(/\s+(?:(?:[àa]s|pelas)\s+)?\d{1,2}[h:]\d{2}(?::\d{2})?/gi,'').trim();
    const date = formatDateStr(raw);
    const detected = detectRaceDate({date});
    if (!detected) return null;
    return {date,sortDate:new Date(detected.raceDateISO+'T00:00:00.000Z'),endDate:detected.raceEndDateISO};
}
