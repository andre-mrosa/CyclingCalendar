'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../i18n/useTranslation';

const CHOICE_EVENT = 'cc-analytics-choice';

function useConsentChoice() {
    const [choice, setChoice] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        let changedAfterLoad = false;
        const onChoice = event => { changedAfterLoad = true; setChoice(event.detail?.choice || null); setError(false); };
        window.addEventListener(CHOICE_EVENT, onChoice);
        fetch('/api/analytics/consent', { cache: 'no-store' })
            .then(async response => {
                if (!response.ok) throw new Error('preference-read-failed');
                return response.json();
            })
            .then(data => { if (active && !changedAfterLoad) setChoice(data.choice || null); })
            .catch(() => { if (active && !changedAfterLoad) setChoice(null); })
            .finally(() => { if (active) setLoaded(true); });
        return () => { active = false; window.removeEventListener(CHOICE_EVENT, onChoice); };
    }, []);

    const save = useCallback(async nextChoice => {
        setSaving(true);
        setError(false);
        try {
            const response = await fetch('/api/analytics/consent', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice: nextChoice }), cache: 'no-store',
            });
            if (!response.ok) throw new Error('preference-save-failed');
            setChoice(nextChoice);
            window.dispatchEvent(new CustomEvent(CHOICE_EVENT, { detail: { choice: nextChoice } }));
        } catch { setError(true); }
        finally { setSaving(false); }
    }, []);

    return { choice, loaded, saving, error, save };
}

export function AnalyticsConsentBanner() {
    const { t } = useTranslation();
    const { choice, loaded, saving, error, save } = useConsentChoice();
    if (!loaded || choice) return null;

    return <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:inset-x-5" aria-labelledby="analytics-consent-title">
        <h2 id="analytics-consent-title" className="text-base font-bold">{t('analytics_consent_title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('analytics_consent_body')} <Link href="/privacy-policy" className="underline underline-offset-2">{t('footer_privacy')}</Link></p>
        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{t('analytics_consent_error')}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => save('rejected')} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">{t('analytics_consent_reject')}</button>
            <button type="button" disabled={saving} onClick={() => save('accepted')} className="min-h-11 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{t('analytics_consent_accept')}</button>
        </div>
    </aside>;
}

export function AnalyticsConsentSettings() {
    const { t } = useTranslation();
    const { choice, loaded, saving, error, save } = useConsentChoice();
    const status = !loaded ? t('analytics_consent_pending') : choice === 'accepted' ? t('analytics_consent_granted') : t('analytics_consent_denied');

    return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{status}</p>
        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{t('analytics_consent_error')}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving || choice === 'accepted'} onClick={() => save('accepted')} className="min-h-10 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{t('analytics_consent_accept')}</button>
            <button type="button" disabled={saving || choice === 'rejected'} onClick={() => save('rejected')} className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">{t('analytics_consent_reject')}</button>
        </div>
    </div>;
}
