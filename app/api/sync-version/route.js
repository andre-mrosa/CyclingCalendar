import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync-version
 * 
 * Public, lightweight endpoint that returns the timestamp of the last
 * completed scrape or event edit. The client refreshes the calendar when
 * this timestamp changes.
 * 
 * Response: { version: "2026-08-29T17:00:00.000Z" | null }
 */
export async function GET() {
    try {
        const [latestSync, latestEvent] = await Promise.all([prisma.systemLog.findFirst({
            where: {
                source: 'SCRAPER',
                message: { contains: 'Sincronização global concluída' }
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        }), prisma.event.findFirst({ orderBy:{ updatedAt:'desc' }, select:{ updatedAt:true } })]);
        const version = [latestSync?.createdAt, latestEvent?.updatedAt].filter(Boolean).sort((a,b) => b.getTime() - a.getTime())[0];

        return Response.json(
            { version: version ? version.toISOString() : null },
            {
                headers: {
                    // Share for 60s at the CDN; clients always recheck.
                    'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=30'
                }
            }
        );
    } catch (e) {
        return Response.json({ error: 'Sync version unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
