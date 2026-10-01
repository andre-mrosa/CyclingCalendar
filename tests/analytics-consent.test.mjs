import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadConsentRoute(choice = undefined) {
    const key = `analyticsConsent${Math.random().toString(36).slice(2)}`;
    const calls = [];
    globalThis[key] = {
        ANALYTICS_CONSENT_ACCEPTED: 'accepted-v1', ANALYTICS_CONSENT_COOKIE: 'cc_analytics_consent',
        ANALYTICS_CONSENT_MAX_AGE: 15552000, ANALYTICS_CONSENT_REJECTED: 'rejected-v1',
        cookies: async () => ({ get: () => ({ value: choice }), set: (...args) => calls.push(args) }),
    };
    const source = (await readFile(new URL('../app/api/analytics/consent/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    const route = await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(globalThis[key])}}=globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));
    delete globalThis[key];
    return { route, calls };
}

test('consent endpoint reports only the saved accepted/rejected choice', async () => {
    assert.deepEqual(await (await loadConsentRoute('accepted-v1')).route.GET().then(response => response.json()), { choice: 'accepted' });
    assert.deepEqual(await (await loadConsentRoute('rejected-v1')).route.GET().then(response => response.json()), { choice: 'rejected' });
    assert.deepEqual(await (await loadConsentRoute()).route.GET().then(response => response.json()), { choice: null });
});

test('consent choice is same-origin, strictly valued, and saved in a protected cookie', async () => {
    const { route, calls } = await loadConsentRoute();
    const crossOrigin = await route.POST(new Request('https://site.test/api/analytics/consent', { method: 'POST', headers: { origin: 'https://attacker.test' }, body: '{"choice":"accepted"}' }));
    assert.equal(crossOrigin.status, 403);
    const invalid = await route.POST(new Request('https://site.test/api/analytics/consent', { method: 'POST', body: '{"choice":"yes"}' }));
    assert.equal(invalid.status, 400);
    assert.equal(calls.length, 0);

    const accepted = await route.POST(new Request('https://site.test/api/analytics/consent', { method: 'POST', headers: { origin: 'https://site.test' }, body: '{"choice":"accepted"}' }));
    assert.equal(accepted.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'cc_analytics_consent');
    assert.equal(calls[0][1], 'accepted-v1');
    assert.equal(calls[0][2].httpOnly, true);
    assert.equal(calls[0][2].sameSite, 'strict');
});
