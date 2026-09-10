'use client';
import { useEffect, useState } from 'react';
import ElevationProfileChart from './ElevationProfileChart';

export default function EventRouteProfile({ event, documents }) {
    const [profile, setProfile] = useState(null);
    const gpxUrl = documents.find(doc => doc.format === 'GPX')?.link;
    useEffect(() => {
        let stored = event.gpxData;
        if (typeof stored === 'string') { try { stored = JSON.parse(stored); } catch { stored = null; } }
        setProfile(stored || null);
        if (stored || !gpxUrl) return;
        const controller = new AbortController();
        fetch(`/api/gpx?url=${encodeURIComponent(gpxUrl)}`, { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (!controller.signal.aborted && data && !data.error) setProfile(data); })
            .catch(() => {});
        return () => controller.abort();
    }, [event.id, event.gpxData, gpxUrl]);
    if (!profile?.profile?.length) return null;
    return <ElevationProfileChart gpxData={profile} gpxUrl={gpxUrl} title={event.title} />;
}
