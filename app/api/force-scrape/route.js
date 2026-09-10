import { startCalendarSync } from '@/app/lib/scrapers/startSync';
import { requireAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    const admin = await requireAdmin();
    if (!admin.authorized) return Response.json({ success: false, error: admin.error }, { status: admin.status });
    try {
        const { searchParams } = new URL(request.url);
        const result = await startCalendarSync({
            scope: 'manual', triggeredBy: 'ADMIN_MANUAL',
            fullHistorical: searchParams.get('history') === 'true',
            resume: searchParams.get('resume') === 'true'
        });
        return Response.json(result, { status: 202 });
    } catch (error) {
        const busy = error.code === 'SCRAPER_ALREADY_RUNNING';
        return Response.json({ success: false, alreadyRunning: busy, error: error.message },
            { status: busy ? 409 : 500, ...(busy ? { headers: { 'Retry-After': '30' } } : {}) });
    }
}
