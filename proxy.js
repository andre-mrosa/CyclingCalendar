import { clerkMiddleware } from '@clerk/nextjs/server';
import { PUBLIC_RELEASE_APPROVED, maintenanceResponse } from './app/lib/contentReleasePolicy';
import { retiredContentResponse } from './app/lib/publicEvent';
import { isPublicBootAsset } from './app/lib/publicBootAssets';
import { NextResponse } from 'next/server';

const authenticatedMiddleware = clerkMiddleware();
export default function proxy(request, event) {
  const url = new URL(request.url);
  // These resources stay retired even if a later, separately approved release opens.
  if (url.pathname.startsWith('/media/events/')) return retiredContentResponse();
  if (!PUBLIC_RELEASE_APPROVED) return maintenanceResponse(request.url);
  if (isPublicBootAsset(url.pathname)) return NextResponse.next();
  return authenticatedMiddleware(request, event);
}

export const config = {
  // Keep release/retirement checks on every route; boot assets skip Clerk above.
  matcher: ['/:path*'],
};
