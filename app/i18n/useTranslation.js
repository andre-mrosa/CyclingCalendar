"use client";

import { useEffect, useState } from 'react';
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
    const [activeLang, setActiveLang] = useState('pt');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (storedLanguage) {
            setActiveLang(storedLanguage);
        } else {
            // Auto-detect from device browser settings
            const deviceLang = typeof navigator !== 'undefined' 
                ? (navigator.language || (navigator.languages && navigator.languages[0]) || 'pt').toLowerCase() 
                : 'pt';
            
            const detected = deviceLang.startsWith('pt') ? 'pt' : 'en';
            setActiveLang(detected);
        }
    }, [storedLanguage]);

    const setLanguage = (newLang) => {
        setStoreLanguage(newLang);
        setActiveLang(newLang);
    };

    const t = (key, params = {}) => {
        const langDict = translations[activeLang] || translations.pt;
        let text = langDict[key] || translations.pt[key] || key;
        
        // Replace {variable} placeholders if provided
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([paramKey, val]) => {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
            });
        }
        return text;
    };

    return {
        t,
        language: activeLang,
        setLanguage,
        isMounted: mounted
    };
}
