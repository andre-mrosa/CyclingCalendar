// Read-only real-page smoke test: catch server errors hidden by client hydration.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const id = process.argv[2];
const base = process.env.EVENT_PAGE_TEST_URL || 'http://localhost:3102';
(async () => {
    if (!id) throw new Error('Pass an event ID with a registration link and two schedule tables');
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'pt-PT' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/analytics/**', route => route.fulfill({ json: { success: true } }));
        const response = await page.goto(base + '/events/' + encodeURIComponent(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('h1').first().waitFor();
        await page.waitForTimeout(1500);
        assert.equal(response.status(), 200, 'Standalone page must return HTTP 200');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No horizontal page overflow');
        assert.ok(await page.locator('table').count() >= 2, 'Both category schedules are retained');
        assert.deepEqual(errors, [], 'No hydration or runtime errors');
        mkdirSync('maintenance/mobile-review', { recursive: true });
        await page.screenshot({ path: 'maintenance/mobile-review/event-page-390.png', fullPage: false });
        console.log(JSON.stringify({ status: response.status(), title: await page.locator('h1').first().innerText(), tables: await page.locator('table').count(), mobileOverflow: false, errors }));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
