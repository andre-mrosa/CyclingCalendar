import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventInventory } from '../app/lib/admin/eventInventory.js';
import { withScraperLock, SCRAPER_LEASE_MS } from '../app/lib/scrapers/runLock.js';

test('Inventory separates published/history/quarantine and overlapping source coverage', () => {
    const groups = [
        { source: 'FPC', sortDate: '2024-01-01', _count: { _all: 455 } },
        { source: 'FPC', sortDate: '2025-01-01', _count: { _all: 673 } },
        { source: 'FPC', sortDate: '2026-01-01', _count: { _all: 374 } },
        { source: 'FPC, Stop and Go', sortDate: '2026-09-01', _count: { _all: 2 } },
        { source: 'Quarentena, Stop and Go', sortDate: '2026-01-01', _count: { _all: 75 } },
    ];
    const result = buildEventInventory(groups, new Date('2026-08-31T12:00:00Z'));
    assert.equal(result.total, 1504);
    assert.equal(result.storedTotal, 1579);
    assert.equal(result.quarantined, 75);
    assert.equal(result.fpc, 1504);
    assert.equal(result.stopAndGo, 2);
    assert.equal(result.multiSource, 2);
    assert.equal(result.sources[0].exclusive, 1502);
    assert.equal(result.byYear[0].total, 376);
    assert.equal(result.byYear.reduce((sum, row) => sum + row.total, 0), result.total);
    assert.equal(result.past + result.upcoming, result.total);
});

test('Inventory handles zero data, repeated sources, unknown dates and Lisbon midnight', () => {
    assert.equal(buildEventInventory([]).total, 0);
    const result = buildEventInventory([
        { source: 'FPC, FPC', sortDate: '2026-08-31' },
        { source: 'Cabreira', sortDate: null },
    ], new Date('2026-08-31T23:30:00Z'));
    assert.equal(result.multiSource, 0);
    assert.equal(result.past, 1);
    assert.equal(result.undated, 1);
});

function fakeLeaseDB(initial = null) {
    let row = initial;
    return { systemLog: {
        async create({ data }) { if (row) throw Object.assign(new Error('unique'), { code: 'P2002' }); row = { ...data }; },
        async updateMany({ where, data }) {
            if (!row || (where.details && row.details !== where.details) || (where.createdAt && !(row.createdAt < where.createdAt.lt))) return { count: 0 };
            row = { ...row, ...data }; return { count: 1 };
        },
        async deleteMany({ where }) { if (row?.details === where.details) { row = null; return { count: 1 }; } return { count: 0 }; },
    } };
}

test('Concurrent runs are rejected and the lease is released after success or failure', async () => {
    const db = fakeLeaseDB();
    let finish;
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    const first = withScraperLock(async () => { started(); return new Promise(resolve => { finish = resolve; }); }, { db });
    await ready;
    await assert.rejects(withScraperLock(() => assert.fail('must not run'), { db }), { code: 'SCRAPER_ALREADY_RUNNING' });
    finish('ok');
    assert.equal(await first, 'ok');
    await assert.rejects(withScraperLock(() => { throw new Error('work failed'); }, { db }), /work failed/);
    assert.equal(await withScraperLock(() => 42, { db }), 42);
});

test('A crashed worker lease can be reclaimed, but database failures are not treated as permission', async () => {
    const db = fakeLeaseDB({ details: 'old', createdAt: new Date(Date.now() - SCRAPER_LEASE_MS - 1000) });
    assert.equal(await withScraperLock(() => 1, { db }), 1);
    const unavailable = { systemLog: { create: async () => { throw new Error('offline'); } } };
    await assert.rejects(withScraperLock(() => assert.fail('must not run'), { db: unavailable }), /offline/);
});
