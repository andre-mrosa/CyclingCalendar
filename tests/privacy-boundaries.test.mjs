import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { eraseAccountActivity } from '../app/lib/eraseAccountActivity.js';
import { POST as track } from '../app/api/analytics/track/route.js';
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

test('old clients cannot resume detailed analytics collection', async () => {
    const response = await track(new Request('https://site.test/api/analytics/track', { method: 'POST', body: '{"visitorId":"legacy"}' }));
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
});
