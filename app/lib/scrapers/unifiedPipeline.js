import { scrapeFPC, incrementalDeepScrapeFPC } from './fpc.js';
import { scrapeCabreira } from './cabreira.js';
import { scrapeStopAndGo } from './stopandgo.js';
import { scrapeClassificacoes } from './classificacoes.js';
import { prisma } from '../db.js';
import { isSameEvent } from '../merging/eventMatcher.js';
import { mergeEventRecords } from '../merging/eventMerger.js';
import { logInfo, logError } from '../logger.js';
import { translateAllPendingEvents } from '../translationService.js';

/**
 * Pipeline Universal de Scraping, Enriquecimento e Fusão de Provas
 * Usado tanto pelo CRON da Vercel (03:00) como pelo botão único no Painel de Gestão
 */
export async function runUnifiedScrapingPipeline(triggeredBy = 'CRON', options = {}) {
    const startTime = Date.now();

    const now = new Date();
    const currentYear = now.getFullYear();

    // Domingo (day 0) OU 1º dia do mês (date 1) OU pedido explícito de histórico
    const isWeeklyOrMonthly = now.getDay() === 0 || now.getDate() === 1;
    const shouldScrapePastYears = options.fullHistorical !== undefined 
        ? Boolean(options.fullHistorical) 
        : isWeeklyOrMonthly;

    let yearsToScrape;
    if (shouldScrapePastYears) {
        yearsToScrape = [
            currentYear.toString(),       // 2026 (presente)
            (currentYear + 1).toString(), // 2027 (futuro)
            (currentYear - 1).toString(), // 2025 (passado recente)
            (currentYear - 2).toString()  // 2024 (passado)
        ];
    } else {
        yearsToScrape = [
            currentYear.toString(),       // 2026 (presente ativo)
            (currentYear + 1).toString()  // 2027 (futuro)
        ];
    }

    const modeLabel = shouldScrapePastYears 
        ? `Auditoria Histórica (${yearsToScrape.join(', ')})` 
        : `Sincronização Rápida Ativa (${yearsToScrape.join(', ')})`;

    await logInfo('SCRAPER', `Iniciada sincronização global [${modeLabel}] via ${triggeredBy}...`);

    const stats = {
        mode: shouldScrapePastYears ? 'FULL_HISTORICAL' : 'DAILY_ACTIVE',
        sourcesScraped: ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net'],
        yearsScraped: yearsToScrape,
        fpcEvents: {},
        deepScrapedFpc: 0,
        mergedEvents: 0,
        errors: []
    };

    // 1, 2 & 3. Execução Paralela Concorrente (FPCiclismo + Cabreira Solutions + Stop and Go)
    await Promise.allSettled([
        // FPCiclismo
        (async () => {
            const fpcStart = Date.now();
            try {
                await logInfo('SCRAPER', `FPC: a consultar calendários oficiais (${yearsToScrape.join(', ')})...`);
                for (const yr of yearsToScrape) {
                    try {
                        stats.fpcEvents[yr] = await scrapeFPC(yr);
                    } catch (error) {
                        stats.errors.push(`FPC ${yr}: ${error.message}`);
                    }
                }
                const fpcDuration = ((Date.now() - fpcStart) / 1000).toFixed(1);
                await logInfo('SCRAPER', `FPC: ${Object.keys(stats.fpcEvents).length}/${yearsToScrape.length} épocas sincronizadas em ${fpcDuration}s.`);
            } catch (e) {
                stats.errors.push(`FPC error: ${e.message}`);
                await logError('SCRAPER', `Erro na sincronização FPC: ${e.message}`, e);
            }
        })(),

        // Cabreira Solutions
        (async () => {
            const cabStart = Date.now();
            try {
                await logInfo('SCRAPER', `Cabreira: a consultar provas e Granfondos...`);
                await scrapeCabreira(null);
                const cabDuration = ((Date.now() - cabStart) / 1000).toFixed(1);
                await logInfo('SCRAPER', `Cabreira: sincronização concluída com sucesso em ${cabDuration}s.`);
            } catch (e) {
                stats.errors.push(`Cabreira error: ${e.message}`);
                await logError('SCRAPER', `Erro na sincronização Cabreira: ${e.message}`, e);
            }
        })(),

        // Stop and Go
        (async () => {
            const sgStart = Date.now();
            try {
                await logInfo('SCRAPER', `Stop and Go: a consultar provas de BTT e Ciclismo...`);
                const sgCount = await scrapeStopAndGo({ years: yearsToScrape });
                const sgDuration = ((Date.now() - sgStart) / 1000).toFixed(1);
                await logInfo('SCRAPER', `Stop and Go: sincronização concluída (${sgCount || 0} provas) em ${sgDuration}s.`);
            } catch (e) {
                stats.errors.push(`Stop and Go error: ${e.message}`);
                await logError('SCRAPER', `Erro na sincronização Stop and Go: ${e.message}`, e);
            }
        })()
    ]);

    // 4. Classificações.net: Enriquecimento de Classificações e PDFs das provas já na BD
    const cnStart = Date.now();
    try {
        await logInfo('SCRAPER', `Classificações.net: a cruzar resultados e PDFs com provas oficiais...`);
        const classCount = await scrapeClassificacoes({ years: yearsToScrape });
        const cnDuration = ((Date.now() - cnStart) / 1000).toFixed(1);
        await logInfo('SCRAPER', `Classificações.net: sincronização concluída (${classCount || 0} provas enriquecidas) em ${cnDuration}s.`);
    } catch (e) {
        stats.errors.push(`Classificações.net error: ${e.message}`);
        await logError('SCRAPER', `Erro na sincronização Classificações.net: ${e.message}`, e);
    }

    // 5. Deep Scraping FPC (programas, regulamentos e anexos de forma rápida)
    const deepStart = Date.now();
    try {
        let totalDeep = 0;
        const maxBatches = shouldScrapePastYears ? 2 : 1;
        for (let batch = 0; batch < maxBatches; batch++) {
            const deepCount = await incrementalDeepScrapeFPC(10);
            totalDeep += deepCount;
            if (deepCount === 0) break;
        }
        stats.deepScrapedFpc = totalDeep;
        const deepDuration = ((Date.now() - deepStart) / 1000).toFixed(1);
        if (totalDeep > 0) {
            await logInfo('SCRAPER', `Deep Scraping FPC: ${totalDeep} programas/cartazes atualizados em ${deepDuration}s.`);
        } else {
            await logInfo('SCRAPER', `Deep Scraping FPC: programas e anexos atualizados em ${deepDuration}s.`);
        }
    } catch (e) {
        stats.errors.push(`Deep scrape error: ${e.message}`);
        await logError('SCRAPER', `Erro no Deep Scraping FPC: ${e.message}`, e);
    }

    // 5. Passagem Global de Unificação & Complementação de Duplicados
    const unifyStart = Date.now();
    try {
        await logInfo('SCRAPER', `Unificação: a verificar provas em comum para fusão multi-fonte...`);
        const allEvents = await prisma.event.findMany({ orderBy: { sortDate: 'asc' } });
        const mergedMap = new Set();
        let mergedCount = 0;

        for (let i = 0; i < allEvents.length; i++) {
            const primary = allEvents[i];
            if (mergedMap.has(primary.id)) continue;

            for (let j = i + 1; j < allEvents.length; j++) {
                const secondary = allEvents[j];
                if (mergedMap.has(secondary.id)) continue;

                if (isSameEvent(primary, secondary)) {
                    const mergedData = mergeEventRecords(primary, secondary);
                    await prisma.event.update({
                        where: { id: primary.id },
                        data: mergedData
                    });
                    await prisma.event.delete({
                        where: { id: secondary.id }
                    });
                    mergedMap.add(secondary.id);
                    mergedCount++;
                    Object.assign(primary, mergedData);
                }
            }
        }
        stats.mergedEvents = mergedCount;
        const unifyDuration = ((Date.now() - unifyStart) / 1000).toFixed(1);
        if (mergedCount > 0) {
            await logInfo('SCRAPER', `Unificação concluída: ${mergedCount} provas fundidas e complementadas com sucesso em ${unifyDuration}s.`);
        } else {
            await logInfo('SCRAPER', `Unificação concluída: todas as provas já estavam unificadas em ${unifyDuration}s.`);
        }
    } catch (e) {
        stats.errors.push(`Unify error: ${e.message}`);
        await logError('SCRAPER', `Erro na unificação de provas: ${e.message}`, e);
    }

    // 6. Tradução Automática das Provas Pendentes (para Inglês / outras línguas)
    const transStart = Date.now();
    try {
        await logInfo('SCRAPER', `Tradução: a verificar provas pendentes de tradução...`);
        const transResult = await translateAllPendingEvents('en', 100);
        stats.translations = transResult;
        const transDuration = ((Date.now() - transStart) / 1000).toFixed(1);
        await logInfo('SCRAPER', `Tradução concluída: ${transResult?.translatedCount || 0} eventos traduzidos em ${transDuration}s.`);
    } catch (e) {
        stats.errors.push(`Translation error: ${e.message}`);
        await logError('SCRAPER', `Erro na tradução de provas: ${e.message}`, e);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    await logInfo('SCRAPER', `Sincronização global concluída em ${durationSeconds}s.`, stats);

    return {
        success: stats.errors.length === 0,
        stats,
        durationSeconds
    };
}
