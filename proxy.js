import { clerkMiddleware } from '@clerk/nextjs/server';
import { PUBLIC_RELEASE_APPROVED, maintenanceResponse } from './app/lib/contentReleasePolicy';
import { retiredContentResponse } from './app/lib/publicEvent';

const authenticatedMiddleware = clerkMiddleware();
export default function proxy(request, event) {
  const url = new URL(request.url);
  // These resources stay retired even if a later, separately approved release opens.
  if (url.pathname.startsWith('/media/events/')) return retiredContentResponse();
  if (url.pathname === '/sw.js') return maintenanceResponse(request.url);
  // Local development only; production builds cannot bypass the release hold.
  const localPreview = process.env.NODE_ENV === 'development' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!PUBLIC_RELEASE_APPROVED && !localPreview) return maintenanceResponse(request.url);
  return authenticatedMiddleware(request, event);
}

export const config = {
  // Include assets, APIs, feeds and workflow callbacks during the publication hold.
  matcher: ['/:path*'],
};
