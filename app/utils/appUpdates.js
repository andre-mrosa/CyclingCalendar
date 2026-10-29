const VERSION = /^[a-zA-Z0-9._-]{1,100}$/;
export function canReloadApp(document, pathname) {
    if (/^\/(?:sign-in|sign-up|admin|contacto)(?:\/|$)/.test(pathname)) return false;
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return false;
    const active = document.activeElement;
    return !active || (!active.isContentEditable && !['INPUT','TEXTAREA','SELECT'].includes(active.tagName));
}
export function startAppUpdates({ version, window, document, navigator, onUpdate, onCalendarChange,
    fetcher = fetch, now = Date.now, interval = 300000 }) {
    let stopped = false, checking = false, reloading = false, pending = null, lastCheck = -Infinity, lastSync = null;
    const registration = navigator.serviceWorker?.register('/sw.js', { scope:'/', updateViaCache:'none' }).catch(() => null);
    function applyUpdate(manual = false) {
        if (!pending || stopped || reloading) return;
        if (!manual && !canReloadApp(document, window.location.pathname)) { onUpdate(true); return; }
        try {
            if (!manual && window.sessionStorage.getItem('cycling_app_reload') === pending) { onUpdate(true); return; }
            window.sessionStorage.setItem('cycling_app_reload', pending);
        } catch { if (!manual) { onUpdate(true); return; } }
        reloading = true;
        window.location.reload();
    }
    async function check() {
        if (stopped || checking || document.visibilityState === 'hidden' || navigator.onLine === false || now() - lastCheck < 30000) return;
        checking = true; lastCheck = now();
        try {
            (await registration)?.update().catch(() => {});
            const results = await Promise.allSettled(['/api/app-version','/api/sync-version'].map(async url => {
                const response = await fetcher(url, { cache:'no-store', signal:AbortSignal.timeout(8000) });
                if (!response.ok) throw new Error('Version unavailable');
                return response.json();
            }));
            if (stopped) return;
            const remote = results[0].status === 'fulfilled' ? results[0].value.version : null;
            if (typeof remote === 'string' && VERSION.test(remote)) {
                if (remote !== version) { pending = remote; applyUpdate(); }
                else if (pending) { pending = null; onUpdate(false); }
            }
            const sync = results[1].status === 'fulfilled' ? results[1].value.version : null;
            if (typeof sync === 'string' && Number.isFinite(Date.parse(sync)) && sync !== lastSync) {
                lastSync = sync; onCalendarChange(sync);
            }
        } finally { checking = false; }
    }
    const timer = window.setInterval(check, interval);
    for (const event of ['focus','online']) window.addEventListener(event, check);
    document.addEventListener('visibilitychange', check);
    navigator.serviceWorker?.addEventListener('controllerchange', check);
    void check();
    return { check, applyUpdate:() => applyUpdate(true), stop:() => {
        stopped = true; window.clearInterval(timer);
        for (const event of ['focus','online']) window.removeEventListener(event, check);
        document.removeEventListener('visibilitychange', check);
        navigator.serviceWorker?.removeEventListener('controllerchange', check);
    } };
}
