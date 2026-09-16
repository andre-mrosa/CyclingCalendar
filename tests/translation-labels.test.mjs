import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const app = new URL('../app/', import.meta.url);
async function translationKeys(directory) {
    const keys = new Set();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
        if (entry.isDirectory() && !['i18n', 'generated', '.well-known'].includes(entry.name)) {
            for (const key of await translationKeys(path)) keys.add(key);
        } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
            const source = await readFile(path, 'utf8');
            for (const match of source.matchAll(/\bt\(\s*['"]([^'"`]+)['"]/g)) keys.add(match[1]);
        }
    }
    return keys;
}
const keys = await translationKeys(app);
for (const language of ['pt', 'en', 'es', 'fr']) {
    test(`${language}: UI labels exist and have valid text encoding`, async () => {
        const source = await readFile(new URL(`i18n/locales/${language}.js`, app), 'utf8');
        const { default: messages } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
        assert.deepEqual([...keys].filter(key => typeof messages[key] !== 'string' || !messages[key].trim()), [], 'Missing UI translations');
        assert.deepEqual(Object.entries(messages).filter(([, value]) => typeof value === 'string' && value.includes('\uFFFD')).map(([key]) => key), [], 'Corrupted characters in UI text');
    });
}
