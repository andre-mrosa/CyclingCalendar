'use client';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';
export default function AlertPreferences() {
    const { user, isSignedIn, isLoaded } = useUser();
    const { t, language } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const { data, error, mutate } = useSWR(isSignedIn ? ['/api/alerts/preferences', user.id] : null, async ([url]) => {
        const response = await fetch(url); if (!response.ok) throw new Error(); return response.json();
    });
    async function save(patch) {
        setBusy(true); setMessage('');
        try {
            const response = await fetch('/api/alerts/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, ...patch, language }) });
            if (!response.ok) throw new Error();
            await mutate(await response.json(), false); setMessage(t('alerts_saved'));
        } catch { setMessage(t('alerts_error')); }
        finally { setBusy(false); }
    }
    if (!isLoaded) return null;
    return <section className={styles.panel}>
        <h2>{t('alerts_heading')}</h2><p>{t('alerts_description')}</p>
        {!isSignedIn ? <Link href="/sign-in?redirect_url=%2Ffavoritos">{t('planning_sign_in')}</Link> : <>
            {error && <p role="alert">{t('alerts_error')}</p>}
            {data && <>
                {!data.available && <p>{t('alerts_unavailable')}</p>}
                <div className={styles.actions}>
                    <label><input type="checkbox" checked={data.changes} disabled={busy} onChange={e => save({ changes: e.target.checked, enabled: data.enabled && (e.target.checked || data.deadlines) })} /> {t('alerts_changes')}</label>
                    <label><input type="checkbox" checked={data.deadlines} disabled={busy} onChange={e => save({ deadlines: e.target.checked, enabled: data.enabled && (e.target.checked || data.changes) })} /> {t('alerts_deadlines')}</label>
                </div>
                <button type="button" disabled={busy || (!data.enabled && (!data.available || (!data.changes && !data.deadlines)))} onClick={() => save({ enabled: !data.enabled })}>{t(data.enabled ? 'alerts_disable' : 'alerts_enable')}</button>
                <p role="status">{t(data.enabled ? 'alerts_active' : 'alerts_inactive')}</p>
            </>}
        </>}
        {message && <p role="status">{message}</p>}
    </section>;
}
