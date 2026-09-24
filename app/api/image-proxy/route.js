import { readPublicResource, rasterImageType } from '../../lib/safeRemote.js';
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) return new Response('URL de imagem obrigatória', { status: 400 });
    try {
        const { buffer } = await readPublicResource(url, { accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif' });
        const type = rasterImageType(buffer);
        if (!type) return new Response('Formato de imagem não permitido', { status: 415 });
        return new Response(buffer, { headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=604800' } });
    } catch { return new Response('Imagem indisponível ou URL não permitida', { status: 400 }); }
}
