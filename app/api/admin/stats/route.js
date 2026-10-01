import { prisma } from '@/app/lib/db';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { analyticsSince } from '@/app/lib/analyticsAggregate';
import { buildEventInventory, PUBLISHED_EVENTS_WHERE } from '@/app/lib/admin/eventInventory';

export const dynamic = 'force-dynamic';

const sumType = (rows, type) => rows.reduce((sum, row) => sum + (row.type === type ? row.count : 0), 0);

function rankBy(rows, type, field, outputField) {
    const counts = new Map();
    for (const row of rows) {
        if (row.type !== type) continue;
        const value = row[field];
        if (!value || value === '*') continue;
        counts.set(value, (counts.get(value) || 0) + row.count);
    }
    return [...counts.entries()].map(([key, count]) => ({ [outputField]: key, count }))
        .sort((a, b) => b.count - a.count).slice(0, 8);
}

export async function GET(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status, headers: { 'Cache-Control': 'no-store' } });
    }

    const requestedTimeframe = new URL(request.url).searchParams.get('timeframe') || '7d';
    const timeframe = requestedTimeframe === '24h' ? 'today' : requestedTimeframe;
    const sinceDate = analyticsSince(timeframe);
    if (!sinceDate) return Response.json({ success: false, error: 'Período inválido.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });

    try {
        const [eventInventory, errorCount, totalUsers, aggregates] = await Promise.all([
            prisma.$transaction(async tx => {
                const groups = await tx.event.groupBy({ by: ['source', 'sortDate'], _count: { _all: true } });
                const inventory = buildEventInventory(groups);
                for (const [key, field] of [['withRegistration', 'registrationClosesAt'], ['withPrices', 'prices'], ['withProgramme', 'programa'], ['withImage', 'image']]) {
                    inventory[key] = await tx.event.count({ where: { ...PUBLISHED_EVENTS_WHERE, [field]: { not: null }, ...(field !== 'registrationClosesAt' ? { NOT: [{ source: { contains: 'Quarentena' } }, { [field]: '' }] } : {}) } });
                }
                return inventory;
            }, { isolationLevel: 'RepeatableRead' }),
            prisma.systemLog.count({ where: { level: 'ERROR', id: { not: 'operational-scraper-lease' } } }).catch(() => null),
            (async () => {
                try {
                    const client = await clerkClient();
                    if (typeof client.users.getCount === 'function') return await client.users.getCount();
                    const list = await client.users.getUserList({ limit: 1 });
                    return list?.totalCount ?? (Array.isArray(list) ? list.length : null);
                } catch { return null; }
            })(),
            prisma.analyticsAggregate.findMany({
                where: { day: { gte: sinceDate } },
                select: { type: true, path: true, targetId: true, count: true },
            }),
        ]);

        const eventCounts = rankBy(aggregates, 'EVENT_OPEN', 'targetId', 'id');
        const eventTitles = eventCounts.length ? await prisma.event.findMany({
            where: { id: { in: eventCounts.map(row => row.id) }, ...PUBLISHED_EVENTS_WHERE },
            select: { id: true, title: true },
        }) : [];
        const titleById = new Map(eventTitles.map(event => [event.id, event.title]));
        const topEvents = eventCounts.filter(row => titleById.has(row.id))
            .map(row => ({ ...row, title: titleById.get(row.id) })).slice(0, 8);

        return Response.json({
            success: true,
            stats: {
                events: eventInventory,
                users: { total: totalUsers },
                logs: { errors: errorCount },
                analytics: {
                    timeframe,
                    sessions: sumType(aggregates, 'SESSION_START'),
                    pageViews: sumType(aggregates, 'PAGE_VIEW'),
                    searches: sumType(aggregates, 'SEARCH'),
                    calendarExports: sumType(aggregates, 'ICS_EXPORT'),
                    favoriteChanges: sumType(aggregates, 'FAVORITE_TOGGLE'),
                    interactions: aggregates.reduce((sum, row) => sum + (row.type !== 'PAGE_VIEW' && row.type !== 'SESSION_START' ? row.count : 0), 0),
                    topPages: rankBy(aggregates, 'PAGE_VIEW', 'path', 'path'),
                    topEvents,
                },
            },
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Error in admin stats:', error?.message);
        return Response.json({ success: false, error: 'Não foi possível carregar as estatísticas.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
