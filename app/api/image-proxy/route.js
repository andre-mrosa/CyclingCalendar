import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return new NextResponse('URL de imagem obrigatória', { status: 400 });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(imageUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Protocolo inválido');
            }
        } catch (e) {
            return new NextResponse('URL inválida', { status: 400 });
        }

        // Fetch imagem sem referer do cliente (ou com referer do próprio site de origem) para contornar hotlink protection
        const originReferer = `${parsedUrl.protocol}//${parsedUrl.host}/`;
        const res = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': originReferer,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            return new NextResponse(`Falha ao obter imagem (${res.status})`, { status: res.status });
        }

        const contentType = res.headers.get('content-type') || 'image/png';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (err) {
        console.error('Image proxy error:', err);
        return new NextResponse('Erro interno ao carregar imagem', { status: 500 });
    }
}
