'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        try {
            for (const key of Object.keys(localStorage)) {
                if (/^cycling_calendar_list_|^cycling_favorite_changes_v1_|^cycling_events|^cycling_road/.test(key)) localStorage.removeItem(key);
            }
        } catch { /* Storage can be unavailable in private browsing. */ }
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
        // Browsers may deny registration in private sessions or restricted contexts.
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }, []);
    return null;
}
