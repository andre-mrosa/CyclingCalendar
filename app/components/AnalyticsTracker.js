'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeAnalyticsPath } from '../lib/analyticsAggregate';

const CHOICE_EVENT = 'cc-analytics-choice';

export function trackEvent(type, data = {}) {
    if (typeof window !== 'undefined' && typeof window.__trackCCEvent === 'function') {
        window.__trackCCEvent(type, data);
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const [choice, setChoice] = useState('pending');

    useEffect(() => {
        let active = true;
        let changedAfterLoad = false;
        const onChoice = event => { changedAfterLoad = true; setChoice(event.detail?.choice || 'rejected'); };
        window.addEventListener(CHOICE_EVENT, onChoice);
        fetch('/api/analytics/consent', { cache: 'no-store' })
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => { if (active && !changedAfterLoad) setChoice(data.choice || 'rejected'); })
            .catch(() => { if (active && !changedAfterLoad) setChoice('rejected'); });
        return () => { active = false; window.removeEventListener(CHOICE_EVENT, onChoice); };
    }, []);

    useEffect(() => {
        if (choice !== 'accepted' || !normalizeAnalyticsPath(pathname) || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

        try {
            if (localStorage.getItem('cc_admin_device') === 'true' || document.cookie.includes('cc_admin_device=1')) return;
        } catch { /* If the admin exclusion marker cannot be checked, leave tracking off. */ return; }

        const send = (type, extra = {}) => {
            const payload = { type, path: pathname };
            if (type === 'EVENT_OPEN' && typeof extra.targetId === 'string') payload.targetId = extra.targetId;
            fetch('/api/analytics/track', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), keepalive: true,
            }).catch(() => {});
        };

        const handler = (type, extra) => send(type, extra);
        window.__trackCCEvent = handler;
        if (!window.__ccAnalyticsSessionStarted) {
            window.__ccAnalyticsSessionStarted = true;
            send('SESSION_START');
        }
        if (window.__ccAnalyticsLastPageView !== pathname) {
            window.__ccAnalyticsLastPageView = pathname;
            send('PAGE_VIEW');
        }

        return () => {
            if (window.__trackCCEvent === handler) delete window.__trackCCEvent;
        };
    }, [choice, pathname]);

    return null;
}
