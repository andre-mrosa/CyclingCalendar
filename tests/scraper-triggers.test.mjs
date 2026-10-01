import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let sequence = 0;
async function loadRoute(path, dependencies) {
    const key = `scraperTrigger${sequence++}`;
    globalThis[key] = dependencies;
    const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try {
        return await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(dependencies)}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));
    } finally { delete globalThis[key]; }
}

const req = (path, authorization) => new Request(`https://calendar.test${path}`, {
    headers: authorization ? { authorization } : {},
});

test('scheduled scrape endpoint requires CRON_SECRET and starts only daily or weekly minimal runs', async t => {
    const previous = process.env.CRON_SECRET;
    t.after(() => { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
    let calls = 0;
    const route = await loadRoute('../app/api/cron/scrape/route.js', {
        startCalendarSync: async options => { calls++; return { accepted: true, ...options }; },
    });

    delete process.env.CRON_SECRET;
    assert.equal((await route.GET(req('/api/cron/scrape'))).status, 503);
    process.env.CRON_SECRET = 'cron-test-secret';
    assert.equal((await route.GET(req('/api/cron/scrape', 'Bearer wrong'))).status, 401);
    assert.equal((await route.GET(req('/api/cron/scrape?scope=manual', 'Bearer cron-test-secret'))).status, 400);
    assert.equal(calls, 0);

    const response = await route.GET(req('/api/cron/scrape?scope=daily', 'Bearer cron-test-secret'));
    assert.equal(response.status, 202);
    assert.equal((await response.json()).scope, 'daily');
    assert.equal(calls, 1);
});

test('manual scrape endpoint requires an administrator and queues the minimal pipeline', async () => {
    let calls = 0;
    const denied = await loadRoute('../app/api/force-scrape/route.js', {
        startCalendarSync: async () => { calls++; },
        requireAdmin: async () => ({ authorized: false, status: 403, error: 'Denied' }),
    });
    assert.equal((await denied.GET(req('/api/force-scrape'))).status, 403);
    assert.equal(calls, 0);

    const allowed = await loadRoute('../app/api/force-scrape/route.js', {
        startCalendarSync: async options => { calls++; return { accepted: true, ...options }; },
        requireAdmin: async () => ({ authorized: true }),
    });
    const response = await allowed.GET(req('/api/force-scrape'));
    assert.equal(response.status, 202);
    assert.equal((await response.json()).scope, 'manual');
    assert.equal(calls, 1);
});
