import { NextResponse } from 'next/server';

// In-memory cache for translations to ensure 0ms latency on repeated queries
const translationCache = new Map();
const MAX_CACHE_SIZE = 5000;

function getCached(key) {
    return translationCache.get(key) || null;
}

function setCached(key, value) {
    if (translationCache.size >= MAX_CACHE_SIZE) {
        // Simple eviction of the oldest 500 entries
        const keysToDelete = Array.from(translationCache.keys()).slice(0, 500);
        keysToDelete.forEach(k => translationCache.delete(k));
    }
    translationCache.set(key, value);
}

async function translateSingle(text, sourceLang = 'pt', targetLang = 'en') {
    if (!text || typeof text !== 'string' || !text.trim()) return '';
    const trimmed = text.trim();
    if (sourceLang === targetLang) return trimmed;

    const cacheKey = `${sourceLang}:${targetLang}:${trimmed}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            next: { revalidate: 86400 } // Cache 24h
        });

        if (!res.ok) {
            return trimmed;
        }

        const data = await res.json();
        // data format: [[["Translated chunk 1", "Source chunk 1", null, null, 10]], ...]
        if (Array.isArray(data) && Array.isArray(data[0])) {
            const translated = data[0].map(item => item[0]).filter(Boolean).join('');
            if (translated) {
                setCached(cacheKey, translated);
                return translated;
            }
        }
    } catch (err) {
        console.warn('Translation error for text:', trimmed.slice(0, 30), err.message);
    }

    return trimmed;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { text, texts, sourceLang = 'pt', targetLang = 'en' } = body;

        if (Array.isArray(texts)) {
            const results = await Promise.all(
                texts.map(t => translateSingle(t, sourceLang, targetLang))
            );
            return NextResponse.json({ success: true, translations: results });
        }

        if (typeof text === 'string') {
            const translation = await translateSingle(text, sourceLang, targetLang);
            return NextResponse.json({ success: true, translation });
        }

        return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
