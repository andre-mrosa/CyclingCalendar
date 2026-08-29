import { prisma } from './db.js';
import { logInfo, logWarn, logError } from './logger.js';

/**
 * Translates a single text string using Google Translate engine.
 */
export async function translateText(text, sourceLang = 'pt', targetLang = 'en') {
    if (!text || typeof text !== 'string' || !text.trim()) return '';
    const trimmed = text.trim();
    if (sourceLang === targetLang) return trimmed;

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!res.ok) {
            return trimmed;
        }

        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
            const translated = data[0].map(item => item[0]).filter(Boolean).join('');
            if (translated) {
                return translated;
            }
        }
    } catch (err) {
        logWarn('TRANSLATION_SERVICE', `Failed to translate chunk: "${trimmed.slice(0, 30)}..."`, { error: err.message });
    }

    return trimmed;
}

/**
 * Translates an event's translatable fields to the target language.
 */
export async function translateEvent(event, targetLang = 'en') {
    if (!event) return null;

    const titleEn = await translateText(event.title, 'pt', targetLang);
    const detailsEn = event.details ? await translateText(event.details, 'pt', targetLang) : null;
    const descriptionEn = event.description ? await translateText(event.description, 'pt', targetLang) : null;
    const programaEn = event.programa ? await translateText(event.programa, 'pt', targetLang) : null;

    return {
        title: titleEn || event.title,
        details: detailsEn || event.details,
        description: descriptionEn || event.description,
        programa: programaEn || event.programa,
        language: targetLang
    };
}

/**
 * Translates and stores/updates an event's translation in the database.
 */
export async function translateAndStoreEvent(event, targetLang = 'en', prismaClient = prisma) {
    if (!event || !event.id) return null;

    try {
        const translatedData = await translateEvent(event, targetLang);
        if (!translatedData) return null;

        const record = await prismaClient.eventTranslation.upsert({
            where: {
                eventId_language: {
                    eventId: event.id,
                    language: targetLang
                }
            },
            update: {
                title: translatedData.title,
                details: translatedData.details,
                description: translatedData.description,
                programa: translatedData.programa
            },
            create: {
                eventId: event.id,
                language: targetLang,
                title: translatedData.title,
                details: translatedData.details,
                description: translatedData.description,
                programa: translatedData.programa
            }
        });

        return record;
    } catch (err) {
        logError('TRANSLATION_SERVICE', `Error storing translation for event ${event.id}`, { error: err.message });
        return null;
    }
}

/**
 * Translates pending events in batches.
 */
export async function translateAllPendingEvents(targetLang = 'en', batchSize = 100) {
    try {
        // Find events that do NOT have a translation for targetLang
        const pendingEvents = await prisma.event.findMany({
            where: {
                translations: {
                    none: {
                        language: targetLang
                    }
                }
            },
            take: batchSize
        });

        logInfo('TRANSLATION_SERVICE', `Found ${pendingEvents.length} events pending translation to ${targetLang}`);

        let translatedCount = 0;
        for (const event of pendingEvents) {
            await translateAndStoreEvent(event, targetLang);
            translatedCount++;
            // Small pause between events to be respectful
            await new Promise(r => setTimeout(r, 40));
        }

        logInfo('TRANSLATION_SERVICE', `Successfully translated ${translatedCount} events to ${targetLang}`);
        return { success: true, count: translatedCount, totalPending: pendingEvents.length };
    } catch (err) {
        logError('TRANSLATION_SERVICE', `Batch translation error for ${targetLang}`, { error: err.message });
        return { success: false, error: err.message };
    }
}
