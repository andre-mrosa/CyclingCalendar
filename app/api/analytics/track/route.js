import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/db';
import { ANALYTICS_CONSENT_ACCEPTED, ANALYTICS_CONSENT_COOKIE } from '@/app/lib/analyticsConsent';
import { ANALYTICS_AGGREGATE_TYPES, analyticsAggregateKey, analyticsBucket, normalizeAnalyticsPath } from '@/app/lib/analyticsAggregate';

export const dynamic = 'force-dynamic';
let lastRetentionCleanup = 0;

export async function POST(request) {
    const cookieStore = await cookies();
    if (cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value !== ANALYTICS_CONSENT_ACCEPTED || cookieStore.get('cc_admin_device')?.value === '1') {
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const raw = await request.text();
        if (raw.length > 2048) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
        const payload = JSON.parse(raw);
        if (!ANALYTICS_AGGREGATE_TYPES.includes(payload.type)) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

        const type = payload.type;
        const path = type === 'SESSION_START' ? '*' : normalizeAnalyticsPath(payload.path);
        if (!path) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

        let targetId = null;
        if (type === 'EVENT_OPEN' && typeof payload.targetId === 'string' && payload.targetId.length > 0 && payload.targetId.length <= 180 && !/[\u0000-\u001f\u007f]/.test(payload.targetId)) {
            const event = await prisma.event.findUnique({ where: { id: payload.targetId }, select: { id: true, source: true } });
            if (event && !event.source?.includes('Quarentena')) targetId = event.id;
        }

        const day = analyticsBucket();
        const key = analyticsAggregateKey(day, type, path, targetId);
        await prisma.analyticsAggregate.upsert({
            where: { key },
            create: { key, day, type, path, targetId, count: 1 },
            update: { count: { increment: 1 } },
        });

        const now = Date.now();
        if (now - lastRetentionCleanup > 24 * 60 * 60 * 1000) {
            lastRetentionCleanup = now;
            const cutoff = analyticsBucket();
            cutoff.setUTCMonth(cutoff.getUTCMonth() - 13);
            prisma.analyticsAggregate.deleteMany({ where: { day: { lt: cutoff } } }).catch(() => {});
        }
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Analytics aggregate write failed:', error?.message);
        return Response.json({ success: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
