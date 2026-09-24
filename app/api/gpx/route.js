import { parseGpxElevation } from '../../utils/gpxParser.js';
import { readPublicResource } from '../../lib/safeRemote.js';
import { readLocalGpx } from '../../lib/localGpx.js';
const cache = new Map();
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) return Response.json({ error: 'URL do GPX é obrigatória' }, { status: 400 });
    try {
        const cached = cache.get(url);
        if (cached && cached.expires > Date.now()) return Response.json(cached.data);
        const buffer = url.startsWith('/') ? await readLocalGpx(url) : (await readPublicResource(url)).buffer;
        if (!buffer) return Response.json({ error: 'GPX não encontrado' }, { status: 404 });
        const data = parseGpxElevation(buffer.toString('utf8'));
        if (!data) return Response.json({ error: 'GPX sem pontos de elevação válidos' }, { status: 422 });
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(url, { data, expires: Date.now() + 3600000 });
        return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    } catch { return Response.json({ error: 'URL ou GPX não permitido' }, { status: 400 }); }
}
