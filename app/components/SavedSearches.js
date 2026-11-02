'use client';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useStoredString, writeStored } from '../hooks/useBrowserState';
import { normalizeSearch, searchUrl, savedSearchMatches } from '../utils/savedSearches';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';
import SearchAlerts from './SearchAlerts';

export default function SavedSearches({ filters, apply, defaultPastEventsFilter = 'futuros' }) {
    const { user, isLoaded } = useUser();
    const { t } = useTranslation();
    const path = usePathname();
    const defaultSources = useSettingsStore(state => state.selectedSources);
    const [preferredId, setPreferredId] = useState(null);
    const key = `cycling_searches_v1_${user?.id || 'guest'}`;
    const raw = useStoredString(key, '[]');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    let saved = [];
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) saved = parsed.filter(s => s && typeof s.name === 'string' && typeof s.path === 'string' && s.filters).slice(0, 20); } catch {}
    const matches = saved.filter(s => s.path === path && savedSearchMatches(filters, s.filters, defaultSources, defaultPastEventsFilter));
    const active = matches.find(s => s.id === preferredId) || matches[0];
    function save(event) {
        event.preventDefault();
        if (!name.trim()) return;
        const entry = { id: crypto.randomUUID(), name: name.trim().slice(0, 80), path: window.location.pathname, filters: normalizeSearch(filters) };
        writeStored(key, JSON.stringify([...saved.filter(s => s.name !== entry.name), entry].slice(-20)));
        setPreferredId(entry.id);
        setName(''); setMessage(t('search_saved'));
    }
    async function share() {
        const url = searchUrl(window.location.href, filters);
        setLink(url);
        try { await navigator.clipboard.writeText(url); setMessage(t('action_copied')); }
        catch { setMessage(t('planning_select_link')); }
    }
    return <details className={`${styles.panel} ${styles.searchPanel}`}>
        <summary>{t('search_save_share')}{active && <span className={styles.activeSearchSummary}>✓ {active.name}</span>}</summary>
        <p>{t('search_local_note')}</p>
        {filters.maxDistanceFilter && filters.origin && <p>{t('search_location_note')}</p>}
        <form onSubmit={save} className={styles.actions}>
            <label className={styles.link}>{t('search_name')}<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
            <button type="submit" disabled={!isLoaded || !name.trim()}>{t('search_save')}</button>
            <button type="button" onClick={share}>{t('action_share')}</button>
        </form>
        {link && <label className={styles.link}>{t('search_link')}<input readOnly value={link} onFocus={e => e.target.select()} /></label>}
        {!!saved.length && <ul>{saved.map(s => <li key={s.id} className={styles.actions}>
            <button type="button" aria-label={s.name} aria-pressed={active?.id === s.id} className={active?.id === s.id ? styles.activeSearch : undefined} onClick={() => { setPreferredId(s.id); setMessage(''); if (s.path === window.location.pathname) apply(s.filters); else if (/^\/(?:nacionais|internacionais|regionais|tacas|lazer|favoritos|agenda)?$/.test(s.path)) window.location.assign(searchUrl(new URL(s.path, window.location.origin), s.filters)); }}>{active?.id === s.id && <span aria-hidden="true">✓ </span>}{s.name}{active?.id === s.id && <span className={styles.activeSearchBadge}>{t('search_active')}</span>}</button>
            <button type="button" aria-label={`${t('search_remove')}: ${s.name}`} onClick={() => writeStored(key, JSON.stringify(saved.filter(item => item.id !== s.id)))}>{t('search_remove')}</button>
        </li>)}</ul>}
        <p role="status" className={styles.activeSearchNotice}>{active ? t('search_active_name', {name:active.name}) : ''}</p>
        {message && <p role="status">{message}</p>}
        <SearchAlerts filters={filters} apply={apply}/>
    </details>;
}
