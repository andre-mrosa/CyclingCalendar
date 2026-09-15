'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
        // Browsers may deny registration in private sessions or restricted contexts.
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }, []);
    return null;
}
