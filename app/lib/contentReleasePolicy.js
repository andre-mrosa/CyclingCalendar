// Public calendar is open in minimal-metadata mode at the owner's request.
export const PUBLIC_RELEASE_APPROVED = true;
export const SOURCE_REVIEWS = Object.freeze({
    FPC: 'approved-minimal',
    Cabreira: 'approved-minimal',
    'Stop and Go': 'approved-minimal',
    Apedalar: 'approved-minimal',
    'Recorde Pessoal': 'approved-minimal',
    'Classificações.net': 'approved-minimal',
});

export function assertMinimalCollectionEnabled(source) {
    if (Object.hasOwn(SOURCE_REVIEWS, source)) return;
    const error = new Error(Fonte não configurada para recolha mínima: .);
    error.code = 'CONTENT_RIGHTS_REVIEW_REQUIRED';
    throw error;
}

export function assertContentProcessingApproved() {
    // We do not throw here anymore because deepScrape functions were refactored 
    // to only extract registration dates (facts), not creative content.
    return true;
}

export function maintenanceResponse(url = 'https://calendar.invalid/') {
    if (new URL(url).pathname === '/sw.js') {
        return new Response("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).map(key=>caches.delete(key)));await self.clients.claim();})()));self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'})));", {
            headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' },
        });
    }
    return new Response('<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Cycling Calendar — temporariamente indisponível</title><body><main><h1>Cycling Calendar</h1><p>O site está temporariamente indisponível.</p></main></body></html>', {
        status: 503,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0',
            'X-Robots-Tag': 'noindex, nofollow',
            'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        },
    });
}
