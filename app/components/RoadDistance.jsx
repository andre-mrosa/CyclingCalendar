'use client';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { useSettingsStore } from '../store/useSettingsStore';
import { useClientReady, readStored, writeStored } from '../hooks/useBrowserState';
import { useRoadDistances } from '../hooks/useRoadDistances';
import { useTranslation } from '../i18n/useTranslation';
import { calculateDistance, drivingMapUrl, routeKey, validCoordinates } from '../utils/distance';
import { ROAD_CACHE_KEY, addRoadDistance, cachedRoadDistance } from '../utils/roadDistanceCache';
import styles from './eventDetail.module.css';

const config = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { available: false };
    return response.json();
};

export default function RoadDistance({ event }) {
    const mounted = useClientReady();
    const storedOrigin = useSettingsStore(state => state.homeLocation);
    const origin = mounted ? storedOrigin : null;
    const destination = { lat: event.lat, lng: event.lng };
    const { t, language } = useTranslation();
    const cache = useRoadDistances();
    const meters = cachedRoadDistance(cache, origin, destination);
    const straight = calculateDistance(origin?.lat, origin?.lng, destination.lat, destination.lng);
    const key = routeKey(origin, destination);
    const { data } = useSWR(key ? '/api/road-distance' : null, config, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 300000 });
    const [state, setState] = useState(null);
    const busy = useRef(false);
    const loading = state?.key === key && state.status === 'loading';
    const message = state?.key === key && state.status !== 'loading' ? state.status : null;
    const mapsUrl = drivingMapUrl(origin, destination);
    async function calculate() {
        if (!key || busy.current) return;
        busy.current = true;
        setState({ key, status: 'loading' });
        try {
            const response = await fetch('/api/road-distance', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: { lat: origin.lat, lng: origin.lng }, destination }),
                signal: AbortSignal.timeout(12000),
            });
            const result = await response.json();
            if (!response.ok || !Number.isFinite(result.distanceMeters) || result.distanceMeters < 0) {
                setState({ key, status: response.status === 429 ? 'road_limit' : 'road_unavailable' });
                return;
            }
            writeStored(ROAD_CACHE_KEY, addRoadDistance(readStored(ROAD_CACHE_KEY, '[]'), origin, destination, result.distanceMeters));
            setState(null);
        } catch { setState({ key, status: 'road_unavailable' }); }
        finally { busy.current = false; }
    }
    if (!validCoordinates(destination)) return null;
    return <section className={styles.section} aria-label={t('road_heading')}>
        <h3>{t('road_heading')}</h3>
        <p role="status">{meters !== null
            ? t('road_distance', { km: new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(meters / 1000) })
            : straight !== null ? t('distance_straight', { km: straight }) : t('road_origin_needed')}</p>
        <p className={styles.muted}>{t('road_destination_note')}</p>
        <div className={styles.actions}>
            {key && data?.available && meters === null && <button className={styles.button} onClick={calculate} disabled={loading}>{t(loading ? 'road_loading' : 'road_calculate')}</button>}
            <a className={styles.button} href={mapsUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t('road_open_maps')}</a>
        </div>
        {key && data?.available && meters === null && <p className={styles.muted}>{t('road_privacy')}</p>}
        {message && <p role="status">{t(message)}</p>}
        {meters !== null && <small>{t('road_source')} <a href="https://openrouteservice.org/" target="_blank" rel="noopener noreferrer">openrouteservice</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></small>}
    </section>;
}
