import useSWR from 'swr';
import { useTranslation } from '../i18n/useTranslation';
const translate = async ([, text]) => {
    const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, sourceLang: 'pt', targetLang: 'en' }) });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error('Translation unavailable');
    return data.translation;
};
export function useTranslatedContent(text) {
    const { language } = useTranslation();
    const { data } = useSWR(language === 'en' && typeof text === 'string' && text.trim() ? ['translation-en', text] : null, translate, { revalidateOnFocus: false });
    return language === 'en' ? data || text : text;
}
