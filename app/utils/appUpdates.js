const VERSION = /^[a-zA-Z0-9._-]{1,100}$/;
export const serviceWorkerUrl = version => '/sw.js?app=' + encodeURIComponent(typeof version === 'string' && VERSION.test(version) ? version : 'current');
export function canReloadApp(document, pathname) {
    if (/^\/(?:sign-in|sign-up|admin|contacto|organizador)(?:\/|$)/.test(pathname)) return false;
    if (document.querySelector('dialog[open], [aria-modal="true"], [aria-busy="true"]')) return false;
    const active = document.activeElement;
    return !active || (!active.isContentEditable && !['INPUT','TEXTAREA','SELECT'].includes(active.tagName));
}
export function startAppUpdates({ version, window, document, navigator, onUpdate, onCalendarChange,
    fetcher = fetch, now = Date.now, interval = 300000 }) {
    let stopped = false, checking = false, recheck = false, reloading = false, dirty = false, pending = null, lastCheck = -Infinity, lastSync = null;
    // Version checks must not wait for a slow or unavailable service-worker registration.
    const registration = Promise.resolve().then(() => navigator.serviceWorker?.register(serviceWorkerUrl(version), { scope:'/', updateViaCache:'none' })).catch(() => null);
    function applyUpdate(manual = false) {
        if (!pending || stopped || reloading) return;
        if (navigator.onLine === false || (!manual && (dirty || !canReloadApp(document, window.location.pathname)))) { onUpdate(true); return; }
        try {
            if (!manual && window.sessionStorage.getItem('cycling_app_reload') === pending) { onUpdate(true); return; }
            window.sessionStorage.setItem('cycling_app_reload', pending);
        } catch { if (!manual) { onUpdate(true); return; } }
        reloading = true;
        window.location.reload();
    }
    async function check({ force = false } = {}) {
        if (stopped || document.visibilityState === 'hidden' || navigator.onLine === false) return;
        if (checking) { if (force) recheck = true; return; }
        if (!force && now() - lastCheck < 30000) return;
        checking = true; lastCheck = now();
        try {
            void registration.then(worker => worker?.update()).catch(() => {});
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
        } finally {
            checking = false;
            if (recheck && !stopped) { recheck = false; void check({ force: true }); }
        }
    }
    const resume = () => { void check({ force: true }); };
    const rememberDraft = event => { if (event.target?.isContentEditable || event.target?.closest?.('form')) dirty = true; };
    const timer = window.setInterval(() => { void check(); }, interval);
    for (const event of ['focus','online','pageshow']) window.addEventListener(event, resume);
    document.addEventListener('visibilitychange', resume);
    document.addEventListener('input', rememberDraft, true);
    document.addEventListener('change', rememberDraft, true);
    navigator.serviceWorker?.addEventListener('controllerchange', check);
    void check();
    return { check, applyUpdate:() => applyUpdate(true), stop:() => {
        stopped = true; window.clearInterval(timer);
        for (const event of ['focus','online','pageshow']) window.removeEventListener(event, resume);
        document.removeEventListener('visibilitychange', resume);
        document.removeEventListener('input', rememberDraft, true);
        document.removeEventListener('change', rememberDraft, true);
        navigator.serviceWorker?.removeEventListener('controllerchange', check);
    } };
}
