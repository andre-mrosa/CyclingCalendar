'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useStoredString, writeStored } from '../hooks/useBrowserState';
import { useUser } from '@clerk/nextjs';
import { favoriteSnapshot, compareFavoriteSnapshots } from '../utils/favoriteChanges';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';

export function FavoriteChanges({ events, favorites, ready, onSelect }) {
    const { user, isLoaded } = useUser();
    const { t } = useTranslation();
    const key = `cycling_favorite_changes_v1_${user?.id || 'guest'}`;
    const raw = useStoredString(key, '{}');
    const { changes, baseline } = useMemo(() => {
        if (!ready || !isLoaded) return { changes: [], baseline: null };
        try {
            const before = JSON.parse(raw);
            const next = {};
            const changes = [];
            for (const event of events) {
                const id = [event.id, ...(event._allIds || [])].find(id => favorites.includes(id));
                if (!id) continue;
                const snapshot = favoriteSnapshot(event);
                const differences = compareFavoriteSnapshots(before[id], snapshot);
                next[id] = differences.length ? before[id] : snapshot;
                if (differences.length) changes.push({ id, event, snapshot, differences });
            }
            for (const id of favorites) if (!next[id] && before[id]) next[id] = before[id];
            return { changes, baseline: JSON.stringify(next) };
        } catch { return { changes: [], baseline: '{}' }; }
    }, [events, favorites, ready, isLoaded, raw]);
    useEffect(() => { if (baseline !== null && baseline !== raw) writeStored(key, baseline); }, [baseline, key, raw]);
    function acknowledge() {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            for (const change of changes) saved[change.id] = change.snapshot;
            writeStored(key, JSON.stringify(saved));
        } catch { /* Keep notices visible if acknowledgment could not be saved. */ }
    }
    function value(field, raw) {
        if (field === 'cancelled') return t(raw ? 'planning_cancelled' : 'planning_scheduled');
        if (!raw) return t('planning_unknown');
        if (field === 'date') {
            const [start, end] = raw.split('/');
            const endDate = new Date(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T00:00:00Z`);
            endDate.setUTCDate(endDate.getUTCDate() - 1);
            const fmt = v => `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
            const inclusiveEnd = endDate.toISOString().slice(0, 10).replaceAll('-', '');
            return start === inclusiveEnd ? fmt(start) : `${fmt(start)} – ${fmt(inclusiveEnd)}`;
        }
        if (field === 'registrationClosesAt') return String(raw).slice(0, 16).replace('T', ' ');
        return raw;
    }
    if (!changes.length) return null;
    return <aside className={styles.panel} aria-label={t('planning_changes')}>
        <h2>{t('planning_changes')}</h2><p>{t('planning_changes_scope')}</p>
        <ul>{changes.map(change => <li key={change.id}>
            <button className={styles.event} onClick={() => onSelect(change.event)}>{change.event.title}</button>
            <ul>{change.differences.map(diff => <li key={diff.field}>{t(`planning_${diff.field}`)}: <del>{value(diff.field, diff.before)}</del> → <strong>{value(diff.field, diff.after)}</strong></li>)}</ul>
        </li>)}</ul>
        <button onClick={acknowledge}>{t('planning_seen')}</button>
    </aside>;
}

export function FavoriteSubscription() {
    const { user, isLoaded, isSignedIn } = useUser();
    if (!isLoaded) return null;
    return <Subscription key={user?.id || 'guest'} userId={user?.id} isSignedIn={isSignedIn} />;
}
function Subscription({ userId, isSignedIn }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const { data, error, mutate } = useSWR(isSignedIn ? ['/api/calendar/subscription', userId] : null, async ([url]) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Subscription unavailable');
        return response.json();
    }, { revalidateOnFocus: false });
    const url = data?.url;
    const ready = !!data;
    async function manage(method) {
        setBusy(true); setMessage('');
        try {
            const response = await fetch('/api/calendar/subscription', { method, cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error();
            await mutate(data, false);
        } catch { setMessage(t('planning_error')); }
        finally { setBusy(false); }
    }
    async function copy() {
        try { await navigator.clipboard.writeText(url); setMessage(t('planning_copied')); }
        catch { setMessage(t('planning_select_link')); }
    }
    return <section className={styles.panel} aria-label={t('planning_subscribe')}>
        <h2>{t('planning_subscribe')}</h2><p>{t('planning_subscription_description')}</p>
        {!isSignedIn ? <Link href="/sign-in?redirect_url=%2Ffavoritos">{t('planning_sign_in')}</Link> : <>
            <p>{t('planning_private_link')}</p>
            {url ? <>
                <label className={styles.link}>{t('planning_link')}<input readOnly value={url} onFocus={event => event.target.select()} /></label>
                <div className={styles.actions}><button onClick={copy}>{t('planning_copy')}</button><button disabled={busy} onClick={() => manage('DELETE')}>{t('planning_revoke')}</button></div>
                <p>{t('planning_instructions')}</p>
                <p>{t('planning_refresh')}</p>
                <p>{t('planning_revoke_note')}</p>
            </> : <button disabled={busy || !ready} onClick={() => manage('POST')}>{t('planning_enable')}</button>}
            {(message || error) && <p role="status">{message || t('planning_error')}</p>}
        </>}
    </section>;
}
