'use client';
import { useEffect, useMemo } from 'react';
import { useStoredString, writeStored } from './useBrowserState';
import { ROAD_CACHE_KEY, parseRoadCache } from '../utils/roadDistanceCache';

export function useRoadDistances() {
    const raw = useStoredString(ROAD_CACHE_KEY, '[]');
    const rows = useMemo(() => parseRoadCache(raw), [raw]);
    useEffect(() => {
        const clean = JSON.stringify(rows);
        if (clean !== raw) writeStored(ROAD_CACHE_KEY, clean);
    }, [raw, rows]);
    return rows;
}
