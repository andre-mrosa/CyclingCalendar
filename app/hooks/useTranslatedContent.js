import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';

const clientTranslationCache = new Map();

/**
 * Hook to translate dynamic scraped text (titles, descriptions, details)
 * when the app language is set to 'en'.
 */
export function useTranslatedContent(text) {
    const { language } = useTranslation();
    const [translated, setTranslated] = useState(text);

    useEffect(() => {
        if (!text || typeof text !== 'string' || language !== 'en') {
            setTranslated(text);
            return;
        }

        const cacheKey = `en:${text.trim()}`;
        if (clientTranslationCache.has(cacheKey)) {
            setTranslated(clientTranslationCache.get(cacheKey));
            return;
        }

        let isMounted = true;
        fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, sourceLang: 'pt', targetLang: 'en' })
        })
        .then(res => res.json())
        .then(data => {
            if (isMounted && data.success && data.translation) {
                clientTranslationCache.set(cacheKey, data.translation);
                setTranslated(data.translation);
            }
        })
        .catch(err => {
            console.warn('Failed to translate content:', err);
        });

        return () => {
            isMounted = false;
        };
    }, [text, language]);

    return translated || text;
}
