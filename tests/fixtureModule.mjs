// Test-only loader: keep the legacy parsers/retry algorithms covered using
// synthetic fixtures without providing any production override of the hold.
import { readFile } from 'node:fs/promises';
export async function fixtureModule(relativePath) {
    const url = new URL(relativePath, import.meta.url);
    let source = await readFile(url, 'utf8');
    source = source.replace(/^import \{ assertSourceApproved \} from .*;\r?$/m, 'const assertSourceApproved = () => {};');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)];
    for (const [, specifier] of imports) {
        const resolved = specifier.startsWith('.') ? new URL(specifier, url).href : import.meta.resolve(specifier);
        source = source.replaceAll(`from '${specifier}'`, `from '${resolved}'`).replaceAll(`from "${specifier}"`, `from "${resolved}"`);
    }
    return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
