'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import ElevationProfileChart from './ElevationProfileChart';
const fetchProfile = async url => { const response = await fetch(url); if (!response.ok) throw new Error('Profile unavailable'); return response.json(); };
export default function EventRouteProfile({ event, documents }) {
    const stored = useMemo(() => { try { return typeof event.gpxData === 'string' ? JSON.parse(event.gpxData) : event.gpxData; } catch { return null; } }, [event.gpxData]);
    const gpxUrl = documents.find(doc => doc.format === 'GPX')?.link;
    const { data } = useSWR(!stored && gpxUrl ? '/api/gpx?url=' + encodeURIComponent(gpxUrl) : null, fetchProfile);
    const profile = stored || data;
    if (!profile?.profile?.length) return null;
    return <ElevationProfileChart gpxData={profile} gpxUrl={gpxUrl} title={event.title} />;
}
