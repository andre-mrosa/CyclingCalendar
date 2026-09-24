import { readLocalGpx } from '../../lib/localGpx.js';
import { readPublicResource } from '../../lib/safeRemote.js';
export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const id = params.get('eventId'), url = params.get('url');
    const title = (params.get('title') || 'track').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'track';
    try {
        let buffer = null;
        if (id && /^[a-zA-Z0-9_-]+$/.test(id)) buffer = await readLocalGpx('/media/events/' + id + '/track.gpx');
        if (!buffer && url?.startsWith('/')) buffer = await readLocalGpx(url);
        if (!buffer && url && !url.startsWith('/')) {
            const remote = new URL(url);
            if (!remote.pathname.toLowerCase().endsWith('.gpx')) return new Response('URL GPX inválida', { status: 400 });
            buffer = (await readPublicResource(url)).buffer;
        }
        if (!buffer) return new Response('Track GPX não disponível', { status: 404 });
        if (!/<gpx[\s>]/i.test(buffer.subarray(0, 4096).toString())) return new Response('Ficheiro GPX inválido', { status: 415 });
        return new Response(buffer, { headers: { 'Content-Type': 'application/gpx+xml; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + title + '.gpx"', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=86400' } });
    } catch { return new Response('URL ou ficheiro não permitido', { status: 400 }); }
}
