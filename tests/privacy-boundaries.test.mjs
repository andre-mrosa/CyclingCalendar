import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { eraseAccountActivity } from '../app/lib/eraseAccountActivity.js';
let sequence = 0;
async function load(path, deps) {
    const key = `privacyAudit${sequence++}`;
    globalThis[key] = deps;
    const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try { return await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(deps)}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64')); }
    finally { delete globalThis[key]; }
}

test('webhook fails closed without secret/signature and never erases on forged requests', async () => {
    const original = process.env.CLERK_WEBHOOK_SECRET;
    let erases = 0;
    try {
        for (const scenario of ['missing-secret', 'missing-signature', 'forged-signature', 'invalid-id', 'valid']) {
            if (scenario === 'missing-secret') delete process.env.CLERK_WEBHOOK_SECRET;
            else process.env.CLERK_WEBHOOK_SECRET = 'mock';
            const route = await load('../app/api/webhooks/clerk/route.js', {
                headers: async () => new Headers(scenario === 'missing-signature' ? {} : { 'svix-id': 'x', 'svix-timestamp': 'x', 'svix-signature': 'x' }),
                Webhook: class { verify() { if (scenario === 'forged-signature') throw Error('Invalid'); return { type: 'user.deleted', data: { id: scenario === 'invalid-id' ? undefined : 'user_target' } }; } },
                prisma: {}, eraseAccountActivity: async (_, id) => { assert.equal(id, 'user_target'); erases++; },
                logWarn: () => {}, logError: () => {},
            });
            const result = await route.POST(new Request('https://site.test/api/webhooks/clerk', { method: 'POST', body: '{}' }));
            assert.equal(result.status, scenario === 'missing-secret' ? 503 : scenario === 'valid' ? 200 : 400);
            assert.equal(erases, scenario === 'valid' ? 1 : 0);
        }
    } finally { if (original === undefined) delete process.env.CLERK_WEBHOOK_SECRET; else process.env.CLERK_WEBHOOK_SECRET = original; }
});

test('erasure is transactionally scoped to the requested account and minimises the request record', async () => {
    const calls = [];
    const tx = Object.fromEntries(['favoriteAlert', 'analyticsSession', 'systemLog', 'accountDeletionRequest'].map(name => [name, {
        deleteMany: async arg => calls.push({ name, arg }),
        updateMany: async arg => calls.push({ name, arg }),
    }]));
    const db = { $transaction: async fn => fn(tx) };
    for (const id of [undefined, '', 'user_', 'someone']) await assert.rejects(() => eraseAccountActivity(db, id));
    assert.equal(calls.length, 0);
    await eraseAccountActivity(db, 'user_target');
    assert.equal(calls.length, 4);
    for (const { arg } of calls) assert.deepEqual(arg.where, { userId: 'user_target' });
    assert.equal(calls[3].arg.data.reason, null);
    assert.equal(calls[3].arg.data.userName, null);
    assert.equal(calls[3].arg.data.userEmail, 'removido');
});

test('analytics writes are opt-in, aggregate-only, and reject old personal payloads', async () => {
    let writes = 0;
    const db = { analyticsAggregate: { upsert: async ({ create }) => { writes++; assert.deepEqual(Object.keys(create).sort(), ['count', 'day', 'key', 'path', 'targetId', 'type']); assert.equal(create.type, 'PAGE_VIEW'); assert.equal(create.path, '/'); assert.equal(create.targetId, null); }, deleteMany: async () => ({ count: 0 }) }, event: { findUnique: async () => null } };
    const route = await load('../app/api/analytics/track/route.js', {
        cookies: async () => ({ get: name => ({ value: name === 'cc_analytics_consent' ? 'accepted-v1' : undefined }) }),
        prisma: db,
        ANALYTICS_CONSENT_ACCEPTED: 'accepted-v1', ANALYTICS_CONSENT_COOKIE: 'cc_analytics_consent',
        ANALYTICS_AGGREGATE_TYPES: ['SESSION_START', 'PAGE_VIEW', 'SEARCH', 'ICS_EXPORT', 'FAVORITE_TOGGLE', 'EVENT_OPEN'],
        analyticsAggregateKey: () => 'key', analyticsBucket: () => new Date('2026-10-01T00:00:00Z'),
        normalizeAnalyticsPath: value => value === '/' ? value : null,
    });
    const rejected = await load('../app/api/analytics/track/route.js', {
        cookies: async () => ({ get: name => ({ value: name === 'cc_analytics_consent' ? 'rejected-v1' : undefined }) }),
        prisma: db,
        ANALYTICS_CONSENT_ACCEPTED: 'accepted-v1', ANALYTICS_CONSENT_COOKIE: 'cc_analytics_consent',
        ANALYTICS_AGGREGATE_TYPES: ['SESSION_START', 'PAGE_VIEW', 'SEARCH', 'ICS_EXPORT', 'FAVORITE_TOGGLE', 'EVENT_OPEN'],
        analyticsAggregateKey: () => 'key', analyticsBucket: () => new Date('2026-10-01T00:00:00Z'), normalizeAnalyticsPath: value => value,
    });
    const oldPayload = JSON.stringify({ visitorId: 'persistent-id', sessionId: 'session-id', userEmail: 'person@example.test', type: 'PAGE_VIEW', path: '/' });
    assert.equal((await rejected.POST(new Request('https://site.test/api/analytics/track', { method: 'POST', body: oldPayload }))).status, 204);
    assert.equal(writes, 0);
    const response = await route.POST(new Request('https://site.test/api/analytics/track', { method: 'POST', body: oldPayload }));
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(writes, 1);
});
