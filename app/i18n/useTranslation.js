"use client";

import { useCallback } from 'react';
import { useClientReady } from '../hooks/useBrowserState';
import { useSettingsStore } from '../store/useSettingsStore';
import { translations } from './translations';

/**
 * Hook to access current language and translation function.
 * Auto-detects device language on first load:
 * - If device is in Portuguese (starts with 'pt'), defaults to 'pt'.
 * - Otherwise defaults to English ('en').
 */
export function useTranslation() {
    const { language: storedLanguage, setLanguage: setStoreLanguage } = useSettingsStore();
    const mounted = useClientReady();
    const deviceLang = mounted ? navigator.language.toLowerCase() : 'pt';
    const detected = ['pt', 'es', 'fr'].find(lang => deviceLang.startsWith(lang)) || 'en';
    const activeLang = mounted ? (storedLanguage || detected) : 'pt';
    const setLanguage = setStoreLanguage;
    const t = useCallback((key, params = {}) => {
        const langDict = translations[activeLang] || translations.pt;
        let text = langDict[key] || translations.pt[key] || key;
        
        // Replace {variable} placeholders if provided
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([paramKey, val]) => {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
            });
        }
        return text;
    }, [activeLang]);

    return {
        t,
        language: activeLang,
        setLanguage,
        isMounted: mounted
    };
}
