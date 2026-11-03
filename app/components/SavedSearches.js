'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSyncedSearches } from '../hooks/useSyncedSearches';
import { experienceText } from '../i18n/experienceCopy';
import { normalizeSearch, searchUrl, savedSearchMatches } from '../utils/savedSearches';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import styles from './favoritePlanning.module.css';
import SearchAlerts from './SearchAlerts';
import { personalPath } from '../utils/personalCollection';

export default function SavedSearches({ filters, apply, defaultPastEventsFilter = 'futuros' }) {
    const {entries:saved,isLoaded,busy,failure,synced,save:saveEntry,remove} = useSyncedSearches();
    const { t,language } = useTranslation(),tr=key=>experienceText(language,key);
    const path = personalPath(usePathname());
    const defaultSources = useSettingsStore(state => state.selectedSources);
    const [preferredId, setPreferredId] = useState(null);
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const matches = saved.filter(s => personalPath(s.path) === path && savedSearchMatches(filters, s.filters, defaultSources, defaultPastEventsFilter));
    const active = matches.find(s => s.id === preferredId) || matches[0];
    async function save(event) {
        event.preventDefault();
        if (!name.trim()) return;
        const entry = { id: crypto.randomUUID(), name: name.trim().slice(0, 80), path, filters: normalizeSearch(filters) };
        if(!await saveEntry(entry))return;
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
        <p>{busy?tr('syncing'):synced?tr('synced'):t('search_local_note')}</p>
        {failure&&<p role="alert">{tr('syncError')}</p>}
        {filters.maxDistanceFilter && filters.origin && <p>{t('search_location_note')}</p>}
        <form onSubmit={save} className={styles.actions}>
            <label className={styles.link}>{t('search_name')}<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
            <button type="submit" disabled={!isLoaded || busy || !name.trim()}>{t('search_save')}</button>
            <button type="button" onClick={share}>{t('action_share')}</button>
        </form>
        {link && <label className={styles.link}>{t('search_link')}<input readOnly value={link} onFocus={e => e.target.select()} /></label>}
        {!!saved.length && <ul>{saved.map(s => <li key={s.id} className={styles.actions}>
            <button type="button" aria-label={s.name} aria-pressed={active?.id === s.id} className={active?.id === s.id ? styles.activeSearch : undefined} onClick={() => { setPreferredId(s.id); setMessage(''); if (personalPath(s.path) === path) apply(s.filters); else if (/^\/(?:nacionais|internacionais|regionais|tacas|lazer|favoritos|agenda|minhas-provas)?$/.test(s.path)) window.location.assign(searchUrl(new URL(s.path, window.location.origin), s.filters)); }}>{active?.id === s.id && <span aria-hidden="true">✓ </span>}{s.name}{active?.id === s.id && <span className={styles.activeSearchBadge}>{t('search_active')}</span>}</button>
            <button type="button" disabled={busy} aria-label={`${t('search_remove')}: ${s.name}`} onClick={() => remove(s.id)}>{t('search_remove')}</button>
        </li>)}</ul>}
        <p role="status" className={styles.activeSearchNotice}>{active ? t('search_active_name', {name:active.name}) : ''}</p>
        {message && <p role="status">{message}</p>}
        <SearchAlerts filters={filters} apply={apply}/>
    </details>;
}
