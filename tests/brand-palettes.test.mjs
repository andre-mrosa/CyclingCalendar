import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { COLOR_PALETTES, DEFAULT_PALETTE, normalizePalette, paletteCSS, paletteBootstrap } from '../app/lib/colorPalettes.js';
import { brandSVG } from '../app/lib/brand.js';

function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
    const values = [luminance(a), luminance(b)].sort((a, b) => a - b);
    return (values[1] + 0.05) / (values[0] + 0.05);
}
test('Every palette meets 4.5:1 for accent text, filled buttons and hero copy in both themes', () => {
    for (const p of COLOR_PALETTES) {
        for (const [fg, bg] of [
            [p.accent, '#ffffff'], [p.accent, '#f5f7f9'], [p.accent, '#edf1f5'], [p.accent, p.soft],
            [p.nightAccent, '#111d2a'], [p.nightAccent, '#020617'], [p.nightAccent, '#172534'], [p.nightAccent, p.nightSoft],
            [p.nightAccent, '#152a3e'], ['#e7eef4', '#152a3e'],
        ]) assert.ok(contrast(fg, bg) >= 4.5, `${p.id}: ${fg} on ${bg} = ${contrast(fg, bg)}`);
    }
});
test('Only curated identifiers are accepted and CSS leaves semantic colors alone', () => {
    for (const v of [null, undefined, '', {}, 'unknown', '__proto__', 'red;display:none']) assert.equal(normalizePalette(v), DEFAULT_PALETTE);
    const css = paletteCSS();
    for (const p of COLOR_PALETTES) {
        assert.equal(normalizePalette(p.id), p.id);
        assert.ok(css.includes(`:root.dark[data-palette="${p.id}"]`));
    }
    assert.doesNotMatch(css, /--(?:success|warning|error|background|foreground|site-surface|site-soft|site-nav|site-line|site-logo-bg)/);
});
function bootstrap(raw, blocked = false) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(paletteBootstrap, {
        document,
        localStorage: { getItem() { if (blocked) throw Error('Blocked storage'); return raw; } },
    });
    return document.documentElement.dataset.palette;
}
test('Neutral surfaces retain readable text in both modes, independently of the accent', async () => {
    const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
    for (const selector of [/:root\s*\{([^}]+)\}/, /\.dark\s*\{([^}]+)\}/]) {
        const block = css.match(selector)[1];
        const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m => [m[1], m[2]]));
        for (const bg of ['background', 'site-surface', 'site-soft', 'site-nav']) {
            for (const fg of ['foreground', 'site-muted']) assert.ok(contrast(tokens[fg], tokens[bg]) >= 4.5, fg + ' on ' + bg);
        }
    }
});
test('First paint restores all palettes and handles old, corrupt or unavailable storage', () => {
    for (const p of COLOR_PALETTES) assert.equal(bootstrap(JSON.stringify({ state: { colorPalette: p.id } })), p.id);
    for (const raw of [null, 'not json', '{}', 'null', '{"state":{"language":"pt"}}', '{"state":{"colorPalette":"invalid"}}']) {
        assert.equal(bootstrap(raw), DEFAULT_PALETTE);
    }
    assert.equal(bootstrap(null, true), DEFAULT_PALETTE);
});
test('Palette persists without resetting existing language, filters or tab preferences', async () => {
    const values = new Map([['cycling-calendar-settings', JSON.stringify({
        state: { language: 'fr', defaultRegiao: 'AC Minho', hiddenTabs: ['Lazer'], colorPalette: 'violet' }, version: 0,
    })]]);
    const previousWindow = globalThis.window;
    globalThis.window = { localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } };
    try {
        const { useSettingsStore } = await import('../app/store/useSettingsStore.js');
        assert.equal(useSettingsStore.getState().colorPalette, 'violet');
        useSettingsStore.getState().setColorPalette('atlantic');
        const saved = JSON.parse(values.get('cycling-calendar-settings')).state;
        assert.equal(saved.colorPalette, 'atlantic');
        assert.equal(saved.language, 'fr');
        assert.equal(saved.defaultRegiao, 'AC Minho');
        assert.deepEqual(saved.hiddenTabs, ['Lazer']);
        useSettingsStore.setState({ colorPalette: 'forest' });
        values.set('cycling-calendar-settings', JSON.stringify({ state: saved, version: 0 }));
        await useSettingsStore.persist.rehydrate();
        assert.equal(useSettingsStore.getState().colorPalette, 'atlantic');
        useSettingsStore.getState().setColorPalette('invalid');
        assert.equal(useSettingsStore.getState().colorPalette, DEFAULT_PALETTE);
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});
test('All four languages include readable palette labels and icon-free UI copy', async () => {
    for (const lang of ['pt', 'en', 'es', 'fr']) {
        const { default: copy } = await import(`../app/i18n/locales/${lang}.js`);
        for (const key of ['title', 'desc', ...COLOR_PALETTES.map(p => p.id)]) assert.ok(copy[`settings_palette_${key}`]);
        assert.doesNotMatch(copy.summary_routes_distances + copy.settings_gdpr_pending_title, /[\u{1F300}-\u{1FAFF}]/u);
    }
});
test('Published vector and install metadata use the same new identity', async () => {
    assert.equal(await readFile(new URL('../public/brand.svg', import.meta.url), 'utf8'), brandSVG());
    const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
    assert.equal(manifest.theme_color, '#0b1422');
    assert.equal(manifest.icons.find(i => i.purpose === 'maskable').src, '/brand-maskable.png');
    for (const icon of manifest.icons) assert.ok((await readFile(new URL('../public' + icon.src, import.meta.url))).length > 0);
});
