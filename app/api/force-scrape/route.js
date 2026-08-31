import { runUnifiedScrapingPipeline } from '@/app/lib/scrapers/unifiedPipeline';
import { requireAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    const admin = await requireAdmin();
    if (!admin.authorized) return Response.json({ success: false, error: admin.error }, { status: admin.status });
    try {
        const { searchParams } = new URL(request.url);
        const fullHistorical = searchParams.get('history') === 'true';

        const result = await runUnifiedScrapingPipeline('ADMIN_MANUAL', { fullHistorical });
        return Response.json({ success: result.success, message: result.success ? 'Sincronização global concluída com sucesso' : 'Sincronização incompleta; consultar os erros', ...result }, { status: result.success ? 200 : 500 });
    } catch(e) {
        if (e.code === 'SCRAPER_ALREADY_RUNNING') return Response.json({ success: false, alreadyRunning: true, error: e.message }, { status: 409, headers: { 'Retry-After': '30' } });
        console.error('Erro na sincronização manual:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

