import * as cheerio from 'cheerio';

export const CYCLING_MODALITIES = new Set(['btt', 'ciclismo', 'cycling', 'gravel', 'downhill mtb', 'downhill', 'dhi', 'dhu', 'trail/btt', 'granfondo']);
const OTHER_MODALITIES = new Set(['atletismo', 'trail', 'tt', 'skyrunning', 'urban trail', 'triathlon', 'triatlo', 'canoagem', 'natacao', 'trichallenge', 'caminhada', 'multisport', 'provas de obstaculos']);
const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*\/\s*/g, '/').trim();
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function readStopAndGoHeader(html) {
    const $ = cheerio.load(html);
    // The event hero owns the h1, location, dated cards and modality. Never
    // infer the sport or dates from navigation, recommendations or page prose.
    const heading = $('h1').first();
    const header = heading.parent();
    const title = heading.text().replace(/\s+/g, ' ').trim();
    const labels = header.children('div, span, p').map((_, el) => normalize($(el).text())).get();
    const modality = labels.find(value => CYCLING_MODALITIES.has(value) || OTHER_MODALITIES.has(value)) || '';
    const location = heading.next('div').text().replace(/\s+/g, ' ').trim();
    const dates = [];
    header.children('div').each((_, el) => {
        const block = $(el).clone();
        block.find('div, span, time').prepend(' ').append(' ');
        const text = block.text().replace(/\s+/g, ' ').trim();
        for (const match of text.matchAll(/\b(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{4})\b/gi)) {
            const day = Number(match[1]);
            const month = MONTHS.indexOf(match[2].toLowerCase());
            const year = Number(match[3]);
            const date = new Date(Date.UTC(year, month, day));
            if (date.getUTCMonth() !== month || date.getUTCDate() !== day) continue;
            if (!dates.some(item => item.getTime() === date.getTime())) dates.push(date);
        }
    });
    const format = date => `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()].toUpperCase()} ${date.getUTCFullYear()}`;
    const sortDate = dates[0] || null;
    const endDate = dates[1] || sortDate;
    const validDates = dates.length >= 1 && dates.length <= 2 && endDate >= sortDate;
    return {
        title, modality, location,
        cycling: CYCLING_MODALITIES.has(modality),
        knownModality: CYCLING_MODALITIES.has(modality) || OTHER_MODALITIES.has(modality),
        sortDate: validDates ? sortDate : null,
        year: validDates ? String(sortDate.getUTCFullYear()) : null,
        date: validDates ? format(sortDate) + (endDate > sortDate ? ` a ${format(endDate)}` : '') : null
    };
}

export function stopAndGoEventUrl(value) {
    try {
        const url = new URL(value, 'https://stopandgo.net');
        const match = url.pathname.match(/^\/events\/([a-zA-Z0-9_-]+)(?:\/.*)?$/);
        return url.hostname === 'stopandgo.net' && match ? `https://stopandgo.net/events/${match[1]}` : null;
    } catch { return null; }
}
