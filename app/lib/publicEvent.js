// Explicit output contract for the minimal calendar. This limits republication;
// it does not establish permission to extract a source's database.
export const PUBLIC_EVENT_SELECT = Object.freeze(Object.fromEntries([
    'id', 'title', 'date', 'sortDate', 'regiao', 'distrito', 'source', 'link', 'registrationOpensAt', 'registrationClosesAt',
].map(key => [key, true])));

export const SOURCE_HOSTS = ['fpciclismo.pt', 'cabreirasolutions.com', 'stopandgo.net',
    'apedalar.pt', 'recordepessoal.pt', 'classificacoes.net'];

function isAllowedHost(host) {
    if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return false;
    if (/\.(?:test|local|localhost|internal|example|invalid|onion)$/i.test(host)) return false;
    for (const brand of SOURCE_HOSTS) {
        if (host.includes(brand) && !host.endsWith(brand)) return false;
    }
    return /\.[a-z]{2,}$/i.test(host);
}

export function isFpcUrl(url) {
    if (typeof url !== 'string' || !url) return false;
    try {
        const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        return host === 'fpciclismo.pt' || host.endsWith('.fpciclismo.pt');
    } catch {
        return url.toLowerCase().includes('fpciclismo.pt');
    }
}

export function originalEventUrl(value) {
    if (typeof value !== 'string' || /[\r\n\\]/.test(value)) return null;
    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
            !isAllowedHost(host) || /\.(?:pdf|gpx|kml|png|jpe?g|webp|svg|gif|zip)$/i.test(url.pathname) ||
            /^\/(?:media|download|ficheiro|admin|api)(?:\/|$)/i.test(url.pathname)) return null;
        // Do not pass tracking parameters or fragments to the source.
        for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
        url.hash = '';
        return url.href;
    } catch { return null; }
}

export function getPreferredEventLink(primaryLink, extraLinks) {
    const parse = (links) => {
        if (!links) return [];
        if (typeof links === 'string') {
            const trimmed = links.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try { return parse(JSON.parse(trimmed)); } catch {}
            }
            return [trimmed];
        }
        if (Array.isArray(links)) {
            return links.flatMap(parse);
        }
        if (typeof links === 'object' && links !== null) {
            return [links];
        }
        return [];
    };

    const candidates = [];
    if (primaryLink) candidates.push(primaryLink);
    for (const item of parse(extraLinks)) {
        if (typeof item === 'string') candidates.push(item);
        else if (item && item.link) candidates.push(item.link);
    }

    const validUrls = [];
    const seen = new Set();
    for (const cand of candidates) {
        const validated = originalEventUrl(cand);
        if (validated && !seen.has(validated.toLowerCase())) {
            seen.add(validated.toLowerCase());
            validUrls.push(validated);
        }
    }

    if (!validUrls.length) return null;

    // Prefer non-FPC links because FPC events have almost no info compared to other sources
    const nonFpc = validUrls.filter(url => !isFpcUrl(url));
    if (nonFpc.length > 0) {
        const bestNonFpc = nonFpc.find(url => !/(?:registrations\/create|\/rules$|\/conditions$|\/download\/|\/print\/)/i.test(url));
        return bestNonFpc || nonFpc[0];
    }

    const specificFpc = validUrls.find(url => !/\/calendario\/?$/i.test(new URL(url).pathname));
    return specificFpc || validUrls[0];
}

function label(value, max = 180) {
    if (typeof value !== 'string' || /[<>\r\n]/.test(value) || value.length > max) return '';
    return value.trim();
}

export function toPublicEvent(event) {
    if (!event || event.source?.includes('Quarentena')) return null;
    const link = getPreferredEventLink(event.link, event.extraLinks) || originalEventUrl(event.link);
    const title = label(event.title, 300);
    if (!link || !title) return null;
    return {
        id: String(event.id), title, date: label(event.date, 100),
        sortDate: event.sortDate instanceof Date ? event.sortDate.toISOString() : label(event.sortDate, 40),
        regiao: label(event.regiao, 100), distrito: label(event.distrito, 100),
        registrationOpensAt: event.registrationOpensAt instanceof Date ? event.registrationOpensAt.toISOString() : (event.registrationOpensAt || null),
        registrationClosesAt: event.registrationClosesAt instanceof Date ? event.registrationClosesAt.toISOString() : (event.registrationClosesAt || null),
        source: label(event.source, 180), link,
    };
}

export function retiredContentResponse() {
    return Response.json({ success: false, code: 'CONTENT_REMOVED', error: 'Consulta a página original da prova.' },
        { status: 410, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
