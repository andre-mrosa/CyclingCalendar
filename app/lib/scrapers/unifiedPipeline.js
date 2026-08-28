import { scrapeFPC, incrementalDeepScrapeFPC } from './fpc.js';
import { scrapeCabreira } from './cabreira.js';
import { prisma } from '../db.js';
import { isSameEvent } from '../merging/eventMatcher.js';
import { mergeEventRecords } from '../merging/eventMerger.js';
import { logInfo, logError } from '../logger.js';

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
            (currentYear - 2).toString(), // 2024 (passado)
            (currentYear - 1).toString(), // 2025 (passado recente)
            currentYear.toString(),       // 2026 (presente)
            (currentYear + 1).toString()  // 2027 (futuro)
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
        sourcesScraped: ['FPC', 'Cabreira'],
        yearsScraped: yearsToScrape,
        deepScrapedFpc: 0,
        mergedEvents: 0,
        errors: []
    };

    // 1. Scraping FPC (Anos Selecionados)
    try {
        await logInfo('SCRAPER', `FPC: a consultar calendários oficiais (${yearsToScrape.join(', ')})...`);
        for (const yr of yearsToScrape) {
            await scrapeFPC(yr);
        }
        await logInfo('SCRAPER', `FPC: sincronização de calendários concluída com sucesso.`);
    } catch (e) {
        stats.errors.push(`FPC error: ${e.message}`);
        await logError('SCRAPER', `Erro na sincronização FPC: ${e.message}`, e);
    }

    // 2. Scraping Cabreira Solutions (Passadas, Presentes e Futuras)
    try {
        await logInfo('SCRAPER', `Cabreira: a consultar provas e Granfondos...`);
        await scrapeCabreira(null);
        await logInfo('SCRAPER', `Cabreira: sincronização concluída com sucesso.`);
    } catch (e) {
        stats.errors.push(`Cabreira error: ${e.message}`);
        await logError('SCRAPER', `Erro na sincronização Cabreira: ${e.message}`, e);
    }

    // 3. Deep Scraping FPC (programas, regulamentos e anexos de forma rápida)
    try {
        let totalDeep = 0;
        const maxBatches = shouldScrapePastYears ? 2 : 1;
        for (let batch = 0; batch < maxBatches; batch++) {
            const deepCount = await incrementalDeepScrapeFPC(10);
            totalDeep += deepCount;
            if (deepCount === 0) break;
        }
        stats.deepScrapedFpc = totalDeep;
        if (totalDeep > 0) {
            await logInfo('SCRAPER', `Deep Scraping FPC: ${totalDeep} programas/cartazes atualizados.`);
        }
    } catch (e) {
        stats.errors.push(`Deep scrape error: ${e.message}`);
        await logError('SCRAPER', `Erro no Deep Scraping FPC: ${e.message}`, e);
    }

    // 4. Passagem Global de Unificação & Complementação de Duplicados
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
        if (mergedCount > 0) {
            await logInfo('SCRAPER', `Unificação concluída: ${mergedCount} provas fundidas e complementadas com sucesso.`);
        } else {
            await logInfo('SCRAPER', `Unificação concluída: todas as provas já estavam unificadas.`);
        }
    } catch (e) {
        stats.errors.push(`Unify error: ${e.message}`);
        await logError('SCRAPER', `Erro na unificação de provas: ${e.message}`, e);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    await logInfo('SCRAPER', `Sincronização global concluída em ${durationSeconds}s.`, stats);

    return {
        success: stats.errors.length === 0,
        stats,
        durationSeconds
    };
}
