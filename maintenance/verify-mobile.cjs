// Local browser regression check. Uses fixtures; never writes to the live service.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.MOBILE_TEST_URL || 'http://localhost:3100';
const event = { id: 'mobile-fixture', title: 'Maratona de São João', date: '27 SET 2027', sortDate: '2027-09-27T00:00:00.000Z', tag: 'BTT', ambito: 'Lazer', source: 'FPC', distrito: 'Porto', details: 'Porto', escaloes: ['Todos (Aberto)'], licenca: 'Aberta', link: 'https://example.org/prova', extraLinks: [], translations: [], lat: 41.15, lng: -8.6, lastVerifiedAt: '2026-09-25T09:00:00Z', lastVerifiedSource: 'FPC' };
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const results = [];
    fs.mkdirSync('maintenance/mobile-review', { recursive: true });
    try {
        for (const width of [320, 390, 430]) {
            const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-PT' });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/api/events**', route => route.fulfill({ json: route.request().url().includes('/api/events/') ? { success: true, event } : { success: true, events: [event] } }));
            await page.route('**/api/analytics/**', route => route.fulfill({ json: { success: true } }));
            await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await page.getByText('Maratona de São João', { exact: true }).first().waitFor({ timeout: 45000 });
            await page.getByText('Guardar e partilhar pesquisa', { exact: true }).click();
            await page.getByRole('searchbox').fill('São João');
            await page.getByLabel('Nome da pesquisa').fill('BTT fim de semana');
            await page.getByRole('button', { name: 'Guardar pesquisa', exact: true }).click();
            await page.getByText('Pesquisa guardada.', { exact: true }).waitFor();
            await page.getByRole('button', { name: 'Partilhar', exact: true }).click();
            const shared = await page.locator('input[readonly]').inputValue();
            assert.equal(JSON.parse(new URL(shared).searchParams.get('filters')).searchTerm, 'São João');
            const checkWidth = async name => {
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px overflow: ${name}`);
                results.push(`${width}px ${name}: no horizontal overflow`);
            };
            await checkWidth('saved search');
            await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
            await page.screenshot({ path: `maintenance/mobile-review/search-${width}.png`, fullPage: true, animations: 'disabled' });
            await page.goto(shared, { waitUntil: 'domcontentloaded' });
            await page.getByRole('searchbox').waitFor();
            await page.waitForFunction(() => document.querySelector('input[type=search]')?.value === 'São João');
            await page.getByText('Maratona de São João', { exact: true }).first().click();
            await page.getByRole('dialog').waitFor();
            await page.waitForFunction(() => { const el = document.querySelector('[role=dialog]'); return el && getComputedStyle(el).opacity === '1' && getComputedStyle(el.parentElement).opacity === '1'; });
            await page.getByText(/Última consulta bem-sucedida/).waitFor();
            await page.getByText('Inscrições: prazo desconhecido — consulta a organização.', { exact: true }).waitFor();
            await checkWidth('race detail');
            assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
            await page.screenshot({ path: `maintenance/mobile-review/detail-${width}.png`, fullPage: false, animations: 'disabled' });
            await page.getByRole('button', { name: 'Fechar', exact: true }).click();
            await page.getByRole('dialog').waitFor({ state: 'detached' });
            await page.getByRole('button', { name: 'Mais filtros', exact: true }).click();
            await checkWidth('expanded filters');
            assert.deepEqual(errors, []);
            await context.close();
        }
        console.log(results.join('\n'));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
