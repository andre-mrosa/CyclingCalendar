// Retire previous offline caches; imported content must not reappear offline.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'})));
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
