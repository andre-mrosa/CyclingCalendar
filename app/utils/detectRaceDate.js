/**
 * Utility to semantically detect the exact competition/race date
 * separating race days from previous-day secretariado, practice or briefing.
 */

const MONTH_MAP = {
    'JAN': '01', 'JANEIRO': '01',
    'FEV': '02', 'FEVEREIRO': '02',
    'MAR': '03', 'MARÇO': '03', 'MARCO': '03',
    'ABR': '04', 'ABRIL': '04',
    'MAI': '05', 'MAIO': '05',
    'JUN': '06', 'JUNHO': '06',
    'JUL': '07', 'JULHO': '07',
    'AGO': '08', 'AGOSTO': '08',
    'SET': '09', 'SETEMBRO': '09',
    'OUT': '10', 'OUTUBRO': '10',
    'NOV': '11', 'NOVEMBRO': '11',
    'DEZ': '12', 'DEZEMBRO': '12'
};

const RACE_KEYWORDS = [
    'partida', 'tiro de partida', 'corrida', 'competição', 'competicao',
    'etapa', 'manga', 'prólogo', 'prologo', 'start', 'race', 'granfondo',
    'mediofondo', 'minifondo', 'maratona', 'meia-maratona', 'xco', 'xcm', 'xcc', 'dhi', 'enduro'
];

const PREP_KEYWORDS = [
    'secretariado', 'acreditações', 'acreditacoes', 'briefing', 'treinos livres',
    'treinos oficiais', 'reconhecimento', 'paddock', 'verificações', 'verificacoes',
    'levantamento de dorsais', 'abertura do secretariado'
];

/**
 * Parses date string in PT formats to YYYY-MM-DD
 */
function toISODate(day, monthStr, year) {
    if (!day || !monthStr) return null;
    const m = MONTH_MAP[monthStr.toUpperCase()];
    if (!m) return null;
    const d = String(parseInt(day, 10)).padStart(2, '0');
    const y = year ? String(year) : new Date().getFullYear().toString();
    return `${y}-${m}-${d}`;
}

export function detectRaceDate(event) {
    if (!event) return null;

    const rawDate = (event.date || '').trim();
    const title = (event.title || '').toLowerCase();
    const details = (event.details || '').toLowerCase();
    const programa = (event.programa || '').toLowerCase();

    // Year detection
    let year = new Date().getFullYear();
    const yearMatch = rawDate.match(/20\d\d/);
    if (yearMatch) {
        year = parseInt(yearMatch[0], 10);
    } else if (event.sortDate) {
        year = new Date(event.sortDate).getFullYear();
    }

    // Single-day date pattern (e.g., "12 SET 2026" or "12 SET")
    const singleMatch = rawDate.match(/^(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3,9})(?:\s+\d{4})?$/i);
    if (singleMatch && MONTH_MAP[singleMatch[2].toUpperCase()]) {
        const iso = toISODate(singleMatch[1], singleMatch[2], year);
        return {
            raceDateISO: iso,
            raceEndDateISO: iso,
            startTime: '09:00',
            label: `${singleMatch[1]} ${singleMatch[2].toUpperCase()}`,
            isMultiStage: false,
            raceDayOnly: true
        };
    }

    // Range pattern: "29 AGO a 30 AGO" or "29 a 30 AGO" or "29 AGO - 30 AGO"
    const rangeMatch = rawDate.match(/(\d{1,2})\s*(?:([A-ZÀ-Úa-zà-ú]{3,9}))?(?:\s*\d{4})?\s*(?:a|-|e|até)\s*(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3,9})(?:\s*(\d{4}))?/i);

    if (rangeMatch) {
        const startDay = rangeMatch[1];
        const startMonth = rangeMatch[2] || rangeMatch[4];
        const endDay = rangeMatch[3];
        const endMonth = rangeMatch[4];
        const rangeYear = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : year;

        const startISO = toISODate(startDay, startMonth, rangeYear);
        const endISO = toISODate(endDay, endMonth, rangeYear);

        // Check if title or details explicitly denote a multi-stage race
        const isMultiStage = title.includes('etapa') || 
                             title.includes('stages') || 
                             title.includes('challenge') || 
                             title.includes('volta a') || 
                             title.includes('2 dias') || 
                             title.includes('3 dias') ||
                             details.includes('etapas');

        // Check program for day classification
        if (programa && programa.length > 30) {
            const hasSaturdayRace = RACE_KEYWORDS.some(k => programa.includes(k) && (programa.includes('sábado') || programa.includes('sabado')));
            const hasSundayRace = RACE_KEYWORDS.some(k => programa.includes(k) && programa.includes('domingo'));
            const hasSaturdayPrepOnly = PREP_KEYWORDS.some(k => programa.includes(k) && (programa.includes('sábado') || programa.includes('sabado'))) && !hasSaturdayRace;

            if (hasSaturdayPrepOnly && hasSundayRace) {
                // Saturday is secretariado, Sunday is the race!
                return {
                    raceDateISO: endISO,
                    raceEndDateISO: endISO,
                    startTime: '09:00',
                    label: `${endDay} ${endMonth.toUpperCase()} (Domingo - Prova)`,
                    isMultiStage: false,
                    raceDayOnly: true
                };
            }
        }

        if (isMultiStage) {
            return {
                raceDateISO: startISO,
                raceEndDateISO: endISO,
                startTime: '09:00',
                label: `${startDay}-${endDay} ${endMonth.toUpperCase()} (Por Etapas)`,
                isMultiStage: true,
                raceDayOnly: false
            };
        }

        // Standard Portuguese Federation / Cup convention for 2-day events:
        // First day (Saturday) = Secretariado / Treinos Oficiais
        // Second day (Sunday) = Competição / Prova Oficial
        return {
            raceDateISO: endISO,
            raceEndDateISO: endISO,
            startTime: '09:00',
            label: `${endDay} ${endMonth.toUpperCase()}`,
            isMultiStage: false,
            raceDayOnly: true
        };
    }

    // Fallback using sortDate if available
    if (event.sortDate) {
        const d = new Date(event.sortDate);
        if (!isNaN(d.getTime())) {
            const iso = d.toISOString().substring(0, 10);
            return {
                raceDateISO: iso,
                raceEndDateISO: iso,
                startTime: '09:00',
                label: rawDate || iso,
                isMultiStage: false,
                raceDayOnly: true
            };
        }
    }

    return null;
}
