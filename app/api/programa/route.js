import { prisma } from '@/app/lib/db';
import { sanitizeRichHtml } from '@/app/lib/sanitizeHtml';
// Public reads never scrape a caller-selected URL or write to an event.
export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const id = params.get('id'), url = params.get('url');
    if (!id && !url) return Response.json({ error: 'ID ou URL obrigatório' }, { status: 400 });
    try {
        const event = await prisma.event.findFirst({
            where: { ...(id ? { id } : { link: url }), NOT: { source: { contains: 'Quarentena' } } },
            select: { programa: true },
        });
        if (!event) return Response.json({ error: 'Prova não encontrada' }, { status: 404 });
        return Response.json({ success: true, programa: sanitizeRichHtml(event.programa), additionalLinks: [] });
    } catch { return Response.json({ error: 'Programa temporariamente indisponível' }, { status: 503 }); }
}
