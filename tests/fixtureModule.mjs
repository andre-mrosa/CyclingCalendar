// Resolve local imports for synthetic scraper fixtures; optional mocks prevent DB/log writes.
import { readFile } from 'node:fs/promises';
export async function fixtureModule(relativePath, mocks = {}) {
    const url = new URL(relativePath, import.meta.url);
    let source = await readFile(url, 'utf8');
    const key = 'scraperFixture' + Math.random().toString(36).slice(2);
    globalThis[key] = mocks;
    source = source.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\r?$/gm, (line, names, specifier) =>
        Object.hasOwn(mocks, specifier) ? `const {${names}} = globalThis[${JSON.stringify(key)}][${JSON.stringify(specifier)}];` : line);
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)];
    for (const [, specifier] of imports) {
        const resolved = specifier.startsWith('.') ? new URL(specifier, url).href : import.meta.resolve(specifier);
        source = source.replaceAll(`from '${specifier}'`, `from '${resolved}'`).replaceAll(`from "${specifier}"`, `from "${resolved}"`);
    }
    try { return await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')); }
    finally { delete globalThis[key]; }
}
