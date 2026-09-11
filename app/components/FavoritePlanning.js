'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { favoriteSnapshot, compareFavoriteSnapshots } from '../utils/favoriteChanges';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';

export function FavoriteChanges({ events, favorites, ready, onSelect }) {
    const { user, isLoaded } = useUser();
    const { t } = useTranslation();
    const [changes, setChanges] = useState([]);
    const key = `cycling_favorite_changes_v1_${user?.id || 'guest'}`;
    useEffect(() => {
        if (!ready || !isLoaded) { setChanges([]); return; }
        try {
            const before = JSON.parse(localStorage.getItem(key) || '{}');
            const next = {};
            const found = [];
            for (const event of events) {
                const id = [event.id, ...(event._allIds || [])].find(id => favorites.includes(id));
                if (!id) continue;
                const snapshot = favoriteSnapshot(event);
                const differences = compareFavoriteSnapshots(before[id], snapshot);
                next[id] = differences.length ? before[id] : snapshot;
                if (differences.length) found.push({ id, event, snapshot, differences });
            }
            // Keep baselines for favorites absent from this source-filtered response.
            for (const id of favorites) if (!next[id] && before[id]) next[id] = before[id];
            localStorage.setItem(key, JSON.stringify(next));
            setChanges(found);
        } catch { setChanges([]); }
    }, [events, favorites, ready, isLoaded, key]);
    function acknowledge() {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || '{}');
            for (const change of changes) saved[change.id] = change.snapshot;
            localStorage.setItem(key, JSON.stringify(saved));
            setChanges([]);
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
    const { t } = useTranslation();
    const [url, setUrl] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let active = true;
        setUrl(null); setReady(false); setMessage('');
        if (isSignedIn) fetch('/api/calendar/subscription', { cache: 'no-store' }).then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error();
            if (active) { setUrl(data.url); setReady(true); }
        }).catch(() => { if (active) setMessage(t('planning_error')); });
        return () => { active = false; };
    }, [user?.id, isSignedIn]);
    async function manage(method) {
        setBusy(true); setMessage('');
        try {
            const response = await fetch('/api/calendar/subscription', { method, cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error();
            setUrl(data.url);
        } catch { setMessage(t('planning_error')); }
        finally { setBusy(false); }
    }
    async function copy() {
        try { await navigator.clipboard.writeText(url); setMessage(t('planning_copied')); }
        catch { setMessage(t('planning_select_link')); }
    }
    if (!isLoaded) return null;
    return <section className={styles.panel} aria-label={t('planning_subscribe')}>
        <h2>{t('planning_subscribe')}</h2><p>{t('planning_subscription_description')}</p>
        {!isSignedIn ? <a href="/sign-in?redirect_url=%2Ffavoritos">{t('planning_sign_in')}</a> : <>
            <p>{t('planning_private_link')}</p>
            {url ? <>
                <label className={styles.link}>{t('planning_link')}<input readOnly value={url} onFocus={event => event.target.select()} /></label>
                <div className={styles.actions}><button onClick={copy}>{t('planning_copy')}</button><button disabled={busy} onClick={() => manage('DELETE')}>{t('planning_revoke')}</button></div>
                <p>{t('planning_instructions')}</p>
                <p>{t('planning_refresh')}</p>
                <p>{t('planning_revoke_note')}</p>
            </> : <button disabled={busy || !ready} onClick={() => manage('POST')}>{t('planning_enable')}</button>}
            {message && <p role="status">{message}</p>}
        </>}
    </section>;
}
