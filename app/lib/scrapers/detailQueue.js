export function needsFpcDetails(event) {
    const html = event.programa || '';
    if (/^<p>(Detalhes de programa indisponíveis|Erro ao extrair)/.test(html)) return true;
    return !/<(?:img|a|table)\b/i.test(html) && html.replace(/<[^>]*>/g, '').trim().length < 50;
}

export function eventLinks(event) {
    let extras = event.extraLinks || [];
    try { if (typeof extras === 'string') extras = JSON.parse(extras); } catch { extras = []; }
    return [event.link, ...(Array.isArray(extras) ? extras.map(item => item.link) : [])].filter(Boolean);
}

export function fpcDetailLink(event) {
    for (const value of eventLinks(event)) {
        try {
            const url = new URL(value);
            if (['www.fpciclismo.pt', 'fpciclismo.pt'].includes(url.hostname) &&
                /^https?:$/.test(url.protocol) && !url.username && !url.password && !url.port &&
                /^\/(pagina|prova-inscrever)\//.test(url.pathname)) return url.href;
        } catch { /* Invalid source links are not detail pages. */ }
    }
    return null;
}

export function prioritizeDetailChecks(events, now = new Date()) {
    const today = new Date(now).setUTCHours(0, 0, 0, 0);
    return [...events].sort((a, b) => {
        const aDate = +new Date(a.sortDate), bDate = +new Date(b.sortDate);
        const aFuture = aDate >= today, bFuture = bDate >= today;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        // Unchecked races first, then the oldest attempt; dates break ties.
        const attempts = +(new Date(a.detailsCheckedAt || 0)) - +(new Date(b.detailsCheckedAt || 0));
        return attempts || (aFuture ? aDate - bDate : bDate - aDate);
    });
}
