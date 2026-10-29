import { translations } from '../i18n/translations.js';
export function validateCalendarTranslations() {
    const keys = Object.keys(translations.pt);
    const placeholders = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
    for (const [language, labels] of Object.entries(translations)) {
        for (const key of keys) {
            if (typeof labels[key] !== 'string' || !labels[key].trim() || labels[key].includes('\uFFFD') ||
                placeholders(labels[key]) !== placeholders(translations.pt[key])) throw new Error(`Tradução inválida: ${language}/${key}`);
        }
    }
    return { success:true, validatedLanguages:Object.keys(translations).length, validatedLabels:keys.length, preservedOriginalTitles:true };
}
