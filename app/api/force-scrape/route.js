import { runUnifiedScrapingPipeline } from '@/app/lib/scrapers/unifiedPipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    try {
        const result = await runUnifiedScrapingPipeline('ADMIN_MANUAL');
        return Response.json({ success: result.success, message: 'Sincronização global concluída', ...result });
    } catch(e) {
        console.error('Erro na sincronização manual:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

