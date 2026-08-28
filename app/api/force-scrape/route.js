import { runUnifiedScrapingPipeline } from '@/app/lib/scrapers/unifiedPipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const fullHistorical = searchParams.get('history') === 'true';

        const result = await runUnifiedScrapingPipeline('ADMIN_MANUAL', { fullHistorical });
        return Response.json({ success: result.success, message: 'Sincronização global concluída com sucesso', ...result });
    } catch(e) {
        console.error('Erro na sincronização manual:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

