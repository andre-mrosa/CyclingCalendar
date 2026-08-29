import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync-version
 * 
 * Public, lightweight endpoint that returns the timestamp of the last
 * successful scrape. The client uses this to invalidate its localStorage
 * events cache whenever a new sync has completed.
 * 
 * Response: { version: "2026-08-29T17:00:00.000Z" | null }
 */
export async function GET() {
    try {
        const latestSync = await prisma.systemLog.findFirst({
            where: {
                source: 'SCRAPER',
                message: { contains: 'Sincronização global concluída' }
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        });

        return Response.json(
            { version: latestSync ? latestSync.createdAt.toISOString() : null },
            {
                headers: {
                    // Cache for 60s at the CDN/browser level – scrapes are infrequent
                    'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
                }
            }
        );
    } catch (e) {
        return Response.json({ version: null }, { status: 200 });
    }
}
