import { unstable_cache } from 'next/cache';
import { prisma } from '@/app/lib/db';
import { CALENDAR_SOURCES, normalizeCalendarSources } from '@/app/lib/calendarSources';
import { parseListQuery, queryCalendarList } from '@/app/lib/calendarListQuery';
export const dynamic = 'force-dynamic';
const load = unstable_cache((years, sources) => queryCalendarList(prisma, years, sources), ['calendar-trust-v1'], { revalidate: 60, tags: ['calendar-events'] });
export async function GET(request) {
    const params = new URL(request.url).searchParams;
    let years, sources, syncVersion;
    try {
        years = parseListQuery(params);
        syncVersion = params.get('sync') || '';
        if (syncVersion && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(syncVersion) || !Number.isFinite(Date.parse(syncVersion)))) throw new Error('Versão inválida');
        const requested = params.has('sources') ? params.get('sources').split(',').map(s => s.trim()).filter(Boolean) : CALENDAR_SOURCES;
        sources = normalizeCalendarSources(requested);
        if (!sources.length || requested.some(s => !CALENDAR_SOURCES.includes(s))) throw new Error('Fonte inválida');
    } catch {
        return Response.json({ success: false, error: 'Filtros inválidos' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    try {
        // Include the published data version in Next's cache key as well as the CDN URL.
        // Otherwise the first request can cache a stale catalogue under a fresh URL.
        const events = await load(years, sources, syncVersion);
        return Response.json({ success: true, events }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
    } catch (error) {
        console.error('Calendar unavailable:', error?.code || error?.name);
        return Response.json({ success: false, code: 'EVENTS_UNAVAILABLE', error: 'Events temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
