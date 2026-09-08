// Dates in the existing schema encode Lisbon wall-clock time in UTC fields.
// Calendar integration supplies Europe/Lisbon when exporting these fields.
export function parseRegistrationDates(html = '') {
    const text = String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    const date = '(\\d{1,2})[-/.](\\d{1,2})[-/.](20\\d{2})';
    const time = '(?:\\s*(?:pelas|as)\\s*(\\d{1,2})[h:](\\d{2}))?';
    const read = (pattern, closing) => {
        const found = [];
        for (const m of text.matchAll(new RegExp(pattern + date + time, 'gi'))) {
            const [, day, month, year, hour, minute] = m;
            const d = new Date(Date.UTC(+year, +month - 1, +day, hour === undefined ? (closing ? 23 : 0) : +hour, minute === undefined ? (closing ? 59 : 0) : +minute));
            if (d.getUTCFullYear() !== +year || d.getUTCMonth() !== +month - 1 || d.getUTCDate() !== +day || +(hour || 0) > 23 || +(minute || 0) > 59) continue;
            found.push(d.toISOString());
        }
        return [...new Set(found)].sort();
    };
    const openings = read('abertura\\s+(?:das?\\s+inscricoes\\s+)?(?:dia\\s+|a\\s+)?', false);
    // Only an explicit overall registration closing statement is authoritative.
    // A phase deadline, cancellation/refund deadline or generic "até ao dia" is not.
    const closings = read('inscricoes\\s+(?:(?:encerram|terminam|fecham)\\s+(?:(?:no\\s+)?dia\\s+|a\\s+)?|(?:serao\\s+)?efetuadas\\s+ate\\s+(?:ao\\s+)?dia\\s+)', true);
    return {
        registrationOpensAt: openings[0] || null,
        registrationClosesAt: closings.length === 1 ? closings[0] : null,
    };
}

export function withRegistrationDates(event) {
    if (!event) return event;
    const parsed = parseRegistrationDates(event.prices || '');
    return {
        ...event,
        registrationOpensAt: parsed.registrationOpensAt || event.registrationOpensAt,
        registrationClosesAt: parsed.registrationClosesAt || event.registrationClosesAt,
    };
}

export function registrationPriceSummary(html = '') {
    const text = String(html).replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&euro;/g, '€')
        .replace(/[\t ]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    const heading = /valores\s+de\s+inscri[çc][ãa]o\s*:?/i.exec(text);
    if (!heading) return null;
    const section = text.slice(heading.index + heading[0].length).split(/\b\d+\.\d+\.\s|a inscri[çc][ãa]o[^\n]{0,30}direito/i)[0].trim();
    // Keep the original phases and eligibility labels; never infer a current price.
    if (!section.includes('€') || section.length > 1600) return null;
    return section;
}
