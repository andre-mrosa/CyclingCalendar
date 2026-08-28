import { prisma } from '@/app/lib/db';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { formatDuration } from '@/app/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || '7d'; // '24h' | '7d' | '30d' | 'all'

        let sinceDate = new Date(0);
        const now = Date.now();
        if (timeframe === '24h') {
            sinceDate = new Date(now - 24 * 60 * 60 * 1000);
        } else if (timeframe === '7d') {
            sinceDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '30d') {
            sinceDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        }

        const analyticsFilter = {
            isAdmin: false,
            createdAt: { gte: sinceDate }
        };

        const [
            // Database entity stats
            totalEvents, fpcEvents, cabreiraEvents, eventsWithRegCloses, eventsWithPrices, eventsWithProgramme,
            totalLogs, errorLogs, recentLogs,
            totalUsers,

            // Traffic & Analytics Stats (Strictly Non-Admin)
            uniqueVisitorsGroup,
            totalSessions,
            pageViewsSum,
            totalInteractionEvents,
            avgDurationData,
            topCountriesGroup,
            topCitiesGroup,
            deviceGroup,
            browserGroup,
            osGroup,
            topPagesGroup,
            topEventsGroup,
            searchEvents,
            recentSessions
        ] = await Promise.all([
            // DB Entities
            prisma.event.count().catch(() => 0),
            prisma.event.count({ where: { source: 'FPC' } }).catch(() => 0),
            prisma.event.count({ where: { source: 'Cabreira' } }).catch(() => 0),
            prisma.event.count({ where: { registrationClosesAt: { not: null } } }).catch(() => 0),
            prisma.event.count({ where: { prices: { not: null } } }).catch(() => 0),
            prisma.event.count({ where: { programa: { not: null } } }).catch(() => 0),
            prisma.systemLog.count().catch(() => 0),
            prisma.systemLog.count({ where: { level: 'ERROR' } }).catch(() => 0),
            prisma.systemLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, level: true, source: true, message: true, createdAt: true }
            }).catch(() => []),
            (async () => {
                try {
                    const client = await clerkClient();
                    if (typeof client.users.getCount === 'function') {
                        return await client.users.getCount();
                    }
                    const list = await client.users.getUserList({ limit: 1 });
                    return list?.totalCount ?? (Array.isArray(list) ? list.length : 0);
                } catch {
                    return 0;
                }
            })(),

            // Analytics Aggregations
            prisma.analyticsSession.groupBy({
                by: ['visitorId'],
                where: analyticsFilter
            }).catch(() => []),

            prisma.analyticsSession.count({
                where: analyticsFilter
            }).catch(() => 0),

            prisma.analyticsSession.aggregate({
                _sum: { pageViewsCount: true },
                where: analyticsFilter
            }).catch(() => ({ _sum: { pageViewsCount: 0 } })),

            prisma.analyticsEvent.count({
                where: {
                    isAdmin: false,
                    createdAt: { gte: sinceDate },
                    type: { not: 'PAGE_VIEW' }
                }
            }).catch(() => 0),

            prisma.analyticsSession.aggregate({
                _avg: { durationSeconds: true },
                where: {
                    ...analyticsFilter,
                    durationSeconds: { gt: 0 }
                }
            }).catch(() => ({ _avg: { durationSeconds: 0 } })),

            prisma.analyticsSession.groupBy({
                by: ['country'],
                where: analyticsFilter,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8
            }).catch(() => []),

            prisma.analyticsSession.groupBy({
                by: ['city', 'country'],
                where: {
                    ...analyticsFilter,
                    city: { not: 'Desconhecido' }
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8
            }).catch(() => []),

            prisma.analyticsSession.groupBy({
                by: ['device'],
                where: analyticsFilter,
                _count: { id: true }
            }).catch(() => []),

            prisma.analyticsSession.groupBy({
                by: ['browser'],
                where: analyticsFilter,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 6
            }).catch(() => []),

            prisma.analyticsSession.groupBy({
                by: ['os'],
                where: analyticsFilter,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 6
            }).catch(() => []),

            prisma.analyticsEvent.groupBy({
                by: ['path'],
                where: {
                    isAdmin: false,
                    type: 'PAGE_VIEW',
                    createdAt: { gte: sinceDate }
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8
            }).catch(() => []),

            prisma.analyticsEvent.groupBy({
                by: ['targetId', 'targetTitle'],
                where: {
                    isAdmin: false,
                    type: 'EVENT_CLICK',
                    targetTitle: { not: null },
                    createdAt: { gte: sinceDate }
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 8
            }).catch(() => []),

            prisma.analyticsEvent.findMany({
                where: {
                    isAdmin: false,
                    type: 'SEARCH',
                    createdAt: { gte: sinceDate }
                },
                select: { metadata: true },
                take: 100
            }).catch(() => []),

            prisma.analyticsSession.findMany({
                where: { isAdmin: false },
                orderBy: { lastActiveAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    country: true,
                    city: true,
                    device: true,
                    browser: true,
                    os: true,
                    durationSeconds: true,
                    pageViewsCount: true,
                    initialPath: true,
                    lastActiveAt: true,
                    createdAt: true
                }
            }).catch(() => [])
        ]);

        // Process searches
        const searchCounts = {};
        for (const item of searchEvents) {
            try {
                let parsed = item.metadata;
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                const q = parsed?.query?.trim()?.toLowerCase();
                if (q) {
                    searchCounts[q] = (searchCounts[q] || 0) + 1;
                }
            } catch {}
        }
        const topSearches = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([query, count]) => ({ query, count }));

        const avgSec = Math.round(avgDurationData?._avg?.durationSeconds || 0);

        return Response.json({
            success: true,
            stats: {
                events: {
                    total: totalEvents,
                    fpc: fpcEvents,
                    cabreira: cabreiraEvents,
                    withRegistration: eventsWithRegCloses,
                    withPrices: eventsWithPrices,
                    withProgramme: eventsWithProgramme
                },
                users: {
                    total: totalUsers
                },
                logs: {
                    total: totalLogs,
                    errors: errorLogs,
                    recent: recentLogs
                },
                analytics: {
                    timeframe,
                    uniqueVisitors: uniqueVisitorsGroup.length,
                    totalSessions,
                    totalPageViews: pageViewsSum?._sum?.pageViewsCount || totalSessions,
                    totalEvents: totalInteractionEvents,
                    avgDurationSeconds: avgSec,
                    avgDurationFormatted: formatDuration(avgSec),
                    countries: topCountriesGroup.map(c => ({ country: c.country, count: c._count.id })),
                    cities: topCitiesGroup.map(c => ({ city: c.city, country: c.country, count: c._count.id })),
                    devices: deviceGroup.map(d => ({ device: d.device, count: d._count.id })),
                    browsers: browserGroup.map(b => ({ browser: b.browser, count: b._count.id })),
                    os: osGroup.map(o => ({ os: o.os, count: o._count.id })),
                    topPages: topPagesGroup.map(p => ({ path: p.path, views: p._count.id })),
                    topEvents: topEventsGroup.map(e => ({ id: e.targetId, title: e.targetTitle, clicks: e._count.id })),
                    topSearches,
                    recentSessions
                }
            }
        });

    } catch (error) {
        console.error('Error in admin stats:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
