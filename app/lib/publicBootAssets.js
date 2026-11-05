// Exact public resources only: account pages and APIs still use Clerk.
export function isPublicBootAsset(pathname) {
    return pathname.startsWith('/_next/static/') || pathname === '/sw.js' ||
        /^\/(?:offline(?:-model)?\.(?:html|css|js)|manifest\.json|icon-(?:192x192|512x512)\.png|brand-maskable\.png)$/.test(pathname);
}
