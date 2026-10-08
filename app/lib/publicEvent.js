// Explicit output contract for the minimal calendar. This limits republication;
// it does not establish permission to extract a source's database.
export const PUBLIC_EVENT_SELECT = Object.freeze(Object.fromEntries([
    'id', 'title', 'date', 'sortDate', 'regiao', 'distrito', 'source', 'link', 'registrationOpensAt', 'registrationClosesAt',
].map(key => [key, true])));

const SOURCE_HOSTS = ['fpciclismo.pt', 'cabreirasolutions.com', 'stopandgo.net',
    'apedalar.pt', 'recordepessoal.pt', 'classificacoes.net'];

export function originalEventUrl(value) {
    if (typeof value !== 'string' || /[\r\n\\]/.test(value)) return null;
    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, '');
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
            !SOURCE_HOSTS.includes(host) || /\.(?:pdf|gpx|kml|png|jpe?g|webp|svg|gif|zip)$/i.test(url.pathname) ||
            /^\/(?:media|download|ficheiro|admin|api)(?:\/|$)/i.test(url.pathname)) return null;
        // Do not pass tracking parameters or fragments to the source.
        for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
        url.hash = '';
        return url.href;
    } catch { return null; }
}

function label(value, max = 180) {
    if (typeof value !== 'string' || /[<>\r\n]/.test(value) || value.length > max) return '';
    return value.trim();
}

export function toPublicEvent(event) {
    if (!event || event.source?.includes('Quarentena')) return null;
    const link = originalEventUrl(event.link);
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
