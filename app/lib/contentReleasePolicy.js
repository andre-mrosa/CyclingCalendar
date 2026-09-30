// The public release remains paused pending a rights/compliance review.
// The owner requested a limited-metadata collection pilot before that review.
// This enables known source adapters to run; it does not mean their terms or
// database rights have been cleared. Never use this to reopen public access.
export const PUBLIC_RELEASE_APPROVED = false;
export const SOURCE_REVIEWS = Object.freeze({
    FPC: 'unverified',
    Cabreira: 'permission-required',
    'Stop and Go': 'permission-required',
    Apedalar: 'permission-required',
    'Recorde Pessoal': 'unverified',
    'Classificações.net': 'unverified',
});

export function assertMinimalCollectionEnabled(source) {
    if (Object.hasOwn(SOURCE_REVIEWS, source)) return;
    const error = new Error(`Fonte não configurada para recolha mínima: ${source}.`);
    error.code = 'CONTENT_RIGHTS_REVIEW_REQUIRED';
    throw error;
}

export function assertContentProcessingApproved() {
    const error = new Error('Importação, cópia e tradução de conteúdos suspensas para revisão de direitos.');
    error.code = 'CONTENT_RIGHTS_REVIEW_REQUIRED';
    throw error;
}

export function maintenanceResponse(url = 'https://calendar.invalid/') {
    // Previously installed offline clients can retain copies. This worker clears
    // origin caches when a browser next checks for an update; it cannot recall downloads.
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
