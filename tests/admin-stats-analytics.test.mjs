import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let sequence = 0;
async function loadStats(deps) {
    const key = `adminStats${sequence++}`;
    globalThis[key] = deps;
    const source = (await readFile(new URL('../app/api/admin/stats/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try { return await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(deps)}}=globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64')); }
    finally { delete globalThis[key]; }
}

function dependencies(aggregateRows) {
    const tx = { event: { groupBy: async () => [], count: async () => 0 } };
    const prisma = {
        $transaction: async operation => operation(tx),
        systemLog: { count: async () => 2 },
        analyticsAggregate: { findMany: async () => aggregateRows },
        event: { findMany: async ({ where }) => where.id.in.includes('race-1') ? [{ id: 'race-1', title: 'Corrida do Norte' }] : [] },
    };
    return {
        prisma, requireAdmin: async () => ({ authorized: true }), clerkClient: async () => ({ users: { getCount: async () => 14 } }),
        analyticsSince: value => value === '7d' ? new Date('2026-09-25T00:00:00Z') : value === 'today' ? new Date('2026-10-01T00:00:00Z') : null,
        buildEventInventory: () => ({ total: 0, upcoming: 0, quarantined: 0 }),
        PUBLISHED_EVENTS_WHERE: { source: { not: { contains: 'Quarentena' } } },
    };
}

test('admin stats read consented daily aggregates and rank pages and opened public events', async () => {
    const rows = [
        { type: 'SESSION_START', path: '*', targetId: null, count: 12 },
        { type: 'PAGE_VIEW', path: '/', targetId: null, count: 30 },
        { type: 'PAGE_VIEW', path: '/nacionais', targetId: null, count: 10 },
        { type: 'EVENT_OPEN', path: '/', targetId: 'race-1', count: 7 },
        { type: 'SEARCH', path: '/', targetId: null, count: 4 },
        { type: 'ICS_EXPORT', path: '/', targetId: null, count: 2 },
    ];
    const route = await loadStats(dependencies(rows));
    const response = await route.GET(new Request('https://site.test/api/admin/stats?timeframe=7d'));
    assert.equal(response.status, 200);
    const { stats } = await response.json();
    assert.equal(stats.users.total, 14);
    assert.equal(stats.logs.errors, 2);
    assert.equal(stats.analytics.sessions, 12);
    assert.equal(stats.analytics.pageViews, 40);
    assert.equal(stats.analytics.interactions, 13);
    assert.equal(stats.analytics.searches, 4);
    assert.deepEqual(stats.analytics.topPages.map(row => [row.path, row.count]), [['/', 30], ['/nacionais', 10]]);
    assert.deepEqual(stats.analytics.topEvents, [{ id: 'race-1', count: 7, title: 'Corrida do Norte' }]);
});

test('invalid report periods are rejected instead of silently switching to all history', async () => {
    const route = await loadStats(dependencies([]));
    const response = await route.GET(new Request('https://site.test/api/admin/stats?timeframe=unknown'));
    assert.equal(response.status, 400);
});

test('analytics database failures return a visible server error rather than zero totals', async () => {
    const deps = dependencies([]);
    deps.prisma.analyticsAggregate.findMany = async () => { throw new Error('database offline'); };
    const route = await loadStats(deps);
    const response = await route.GET(new Request('https://site.test/api/admin/stats?timeframe=today'));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).success, false);
});

test('optional identity and log providers show unavailable values instead of false zero counts', async () => {
    const deps = dependencies([]);
    deps.clerkClient = async () => { throw new Error('Clerk offline'); };
    deps.prisma.systemLog.count = async () => { throw new Error('database offline'); };
    const route = await loadStats(deps);
    const response = await route.GET(new Request('https://site.test/api/admin/stats?timeframe=today'));
    assert.equal(response.status, 200);
    const { stats } = await response.json();
    assert.equal(stats.users.total, null);
    assert.equal(stats.logs.errors, null);
});
