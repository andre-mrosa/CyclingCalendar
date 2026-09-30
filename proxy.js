import { clerkMiddleware } from '@clerk/nextjs/server';
import { PUBLIC_RELEASE_APPROVED, maintenanceResponse } from './app/lib/contentReleasePolicy';
import { retiredContentResponse } from './app/lib/publicEvent';

const authenticatedMiddleware = clerkMiddleware();
export default function proxy(request, event) {
  const url = new URL(request.url);
  // These resources stay retired even if a later, separately approved release opens.
  if (url.pathname.startsWith('/media/events/')) return retiredContentResponse();
  if (url.pathname === '/sw.js') return maintenanceResponse(request.url);
  if (!PUBLIC_RELEASE_APPROVED) return maintenanceResponse(request.url);
  return authenticatedMiddleware(request, event);
}

export const config = {
  // Apply auth middleware consistently to pages, assets and API routes.
  matcher: ['/:path*'],
};
