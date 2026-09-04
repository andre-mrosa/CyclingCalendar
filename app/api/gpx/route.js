import { NextResponse } from 'next/server';
import { parseGpxElevation } from '../../utils/gpxParser.js';

// Cache simples em memória para evitar re-descarregar ficheiros GPX frequentemente
const gpxCache = new Map();
const MAX_CACHE_SIZE = 100;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const gpxUrl = searchParams.get('url');

        if (!gpxUrl) {
            return NextResponse.json({ error: 'URL do GPX é obrigatória' }, { status: 400 });
        }

        // Validação de segurança: apenas permitir URLs HTTP/HTTPS válidas
        let parsedUrl;
        try {
            parsedUrl = new URL(gpxUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Protocolo inválido');
            }
        } catch (e) {
            return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
        }

        // Verificar cache
        if (gpxCache.has(gpxUrl)) {
            return NextResponse.json(gpxCache.get(gpxUrl), {
                headers: {
                    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
                }
            });
        }

        // Fetch do GPX
        const response = await fetch(gpxUrl, {
            headers: { 'User-Agent': 'CyclingCalendar/2.0 (GPX Elevation Parser)' },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Falha ao transferir GPX (HTTP ${response.status})` }, { status: 502 });
        }

        const xmlText = await response.text();
        const data = parseGpxElevation(xmlText);

        if (!data) {
            return NextResponse.json({ error: 'Ficheiro GPX sem pontos de elevação válidos' }, { status: 422 });
        }

        // Guardar em cache
        if (gpxCache.size >= MAX_CACHE_SIZE) {
            const firstKey = gpxCache.keys().next().value;
            gpxCache.delete(firstKey);
        }
        gpxCache.set(gpxUrl, data);

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
            }
        });
    } catch (err) {
        return NextResponse.json({ error: 'Erro ao processar ficheiro GPX: ' + err.message }, { status: 500 });
    }
}
