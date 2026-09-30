// Retire previous offline caches; imported content must not reappear offline.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request,{cache:'no-store'})));
