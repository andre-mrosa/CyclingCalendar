// Cache only our independent offline reader. Never cache authenticated HTML,
// APIs, Clerk, Google responses, imported pages or third-party media.
const appVersion = new URL(self.location.href).searchParams.get('app') || 'current';
const OFFLINE_CACHE = 'cycling-offline-shell-v1-' + (/^[a-zA-Z0-9._-]{1,100}$/.test(appVersion) ? appVersion : 'current');
const OFFLINE_ASSETS = ['/offline.html', '/offline.css', '/offline.js', '/offline-model.js', '/icon-192x192.png', '/icon-512x512.png'];
// Race the complete response, not just its headers. Some mobile connections
// stay "online" while neither delivering a body nor rejecting the request.
async function boundedFetch(request, options = {}, milliseconds = 6000) {
    const controller = new AbortController();
    let timer;
    try {
        return await Promise.race([
            (async () => {
                const response = await fetch(request, { ...options, signal: controller.signal });
                await response.clone().arrayBuffer();
                return response;
            })(),
            new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Network deadline')); }, milliseconds); }),
        ]);
    } finally { clearTimeout(timer); }
}
self.addEventListener('install', event => event.waitUntil((async () => {
    const responses = await Promise.all(OFFLINE_ASSETS.map(async path => {
        const response = await boundedFetch(new URL(path, self.location.origin), { cache: 'reload', credentials: 'omit' }, 10000);
        if (!response.ok || response.redirected) throw new Error('Offline reader unavailable');
        return [path, response];
    }));
    const cache = await caches.open(OFFLINE_CACHE);
    await Promise.all(responses.map(([path, response]) => cache.put(path, response)));
    await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key !== OFFLINE_CACHE && /^(cycling[-_]|workbox-precache|next-pwa)/.test(key)).map(key => caches.delete(key)));
    await self.clients.claim();
})()));
async function offlineResponse() {
    const cached = await (await caches.open(OFFLINE_CACHE)).match('/offline.html');
    if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-Cycling-Offline', '1'); headers.set('Cache-Control', 'no-store'); headers.set('X-Robots-Tag', 'noindex, nofollow');
        return new Response(await cached.arrayBuffer(), { status: 200, headers });
    }
    return new Response('<!doctype html><html lang="pt"><meta name="viewport" content="width=device-width"><title>Sem ligação</title><h1>Sem ligação</h1><p>Abre a app uma vez com internet para preparar o modo offline.</p><a href="/">Tentar novamente</a></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
self.addEventListener('fetch', event => {
    const request = event.request, url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (OFFLINE_ASSETS.includes(url.pathname) && !url.search) {
        event.respondWith((async () => (await (await caches.open(OFFLINE_CACHE)).match(url.pathname)) || fetch(request))());
    } else if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await boundedFetch(request, { cache: 'no-store' });
                return response.status >= 500 ? offlineResponse() : response;
            } catch { return offlineResponse(); }
        })());
    }
});
self.addEventListener('push', event => {
    let message;
    try { message = event.data?.json(); } catch { /* Always display a visible notification. */ }
    event.waitUntil(self.registration.showNotification(message?.title || 'Cycling Calendar', {
        body: message?.body || 'Consulta as novidades dos teus favoritos.',
        icon: '/icon-192x192.png', badge: '/icon-192x192.png',
        tag: message?.tag || 'favorite-editions', renotify: false,
        data: { url: message?.url || '/favoritos' },
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/favoritos', self.location.origin);
    const url = target.origin === self.location.origin && (target.pathname === '/favoritos' || target.pathname.startsWith('/provas/'))
        ? target.href : new URL('/favoritos', self.location.origin).href;
    event.waitUntil((async () => {
        const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const tab of tabs) {
            if (new URL(tab.url).origin === self.location.origin) {
                await tab.navigate(url); return tab.focus();
            }
        }
        return self.clients.openWindow(url);
    })());
});
