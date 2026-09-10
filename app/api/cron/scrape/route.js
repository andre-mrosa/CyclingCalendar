import { startCalendarSync } from '@/app/lib/scrapers/startSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    if (process.env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'daily';
    // Old self-invocations must never start a second workflow.
    if (searchParams.has('stage') || searchParams.has('runId') || !['daily', 'weekly'].includes(scope)) {
        return Response.json({ success: false, error: 'As etapas são geridas pela fila de sincronização.' }, { status: 400 });
    }
    try {
        const now = new Date();
        const result = await startCalendarSync({ scope, triggeredBy: `CRON_VERCEL_${scope.toUpperCase()}`,
            fullHistorical: scope === 'weekly' && (now.getDay() === 0 || now.getDate() === 1) });
        return Response.json(result, { status: 202 });
    } catch (error) {
        if (error.code === 'SCRAPER_ALREADY_RUNNING') return Response.json({ success: true, skipped: true, message: error.message });
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
