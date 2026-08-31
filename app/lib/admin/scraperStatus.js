const SOURCE_DEFS = {
    fpc: ['FPCiclismo', 'Calendários FPC · eventos processados, não novos'],
    cabreira: ['Cabreira Solutions', 'Granfondos & Provas · eventos processados, não novos'],
    stopandgo: ['Stop & Go', 'Sitemap Ciclismo/BTT · eventos processados, não novos']
};
const STEP_DEFS = {
    classificacoes: ['Resultados & PDFs', 'Classificações.net'],
    deepScrape: ['Deep Scraping FPC', 'Programas & Cartazes'],
    unification: ['Unificação & Fusão', 'Deduplicação Multi-Fonte'],
    translation: ['Tradução Multilíngue', 'EN / ES / FR']
};
const METRICS = ['processed', 'created', 'updated', 'merged', 'quarantined'];
const validCount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const timestamp = log => new Date(log?.createdAt).getTime();
const isStart = log => /Iniciada sincronização global/i.test(log?.message || '') || readLogDetails(log).event === 'run-start';
const isCompletion = log => /sincronização global concluída|falha crítica na sincronização/i.test(log?.message || '') || readLogDetails(log).event === 'run-complete';

export function readLogDetails(log) {
    try {
        const parsed = typeof log?.details === 'string' ? JSON.parse(log.details) : log?.details;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
}

function entities(definitions) {
    return Object.fromEntries(Object.entries(definitions).map(([id, [name, desc]]) => [id,
        { id, name, desc, status: 'idle', count: null, duration: null, message: 'Sem informação' }]));
}

function entityId(message) {
    if (/deep scrap/i.test(message)) return 'deepScrape';
    if (/classificaç/i.test(message)) return 'classificacoes';
    if (/unificaç|unify/i.test(message)) return 'unification';
    if (/traduç|translation/i.test(message)) return 'translation';
    if (/fpc/i.test(message)) return 'fpc';
    if (/cabreira/i.test(message)) return 'cabreira';
    if (/stop\s*(and|&)\s*go|stopandgo/i.test(message)) return 'stopandgo';
    return null;
}

function applySnapshot(target, snapshot) {
    if (!target || !snapshot || typeof snapshot !== 'object') return;
    if (['idle', 'running', 'done', 'error'].includes(snapshot.status)) target.status = snapshot.status;
    if (Object.hasOwn(snapshot, 'count')) target.count = validCount(snapshot.count);
    if (typeof snapshot.duration === 'string') target.duration = snapshot.duration;
    if (typeof snapshot.message === 'string') target.message = snapshot.message;
    if (snapshot.metrics && typeof snapshot.metrics === 'object') {
        target.metrics = Object.fromEntries(METRICS.map(key => [key, validCount(snapshot.metrics[key])]));
        if (target.count === null && target.metrics.processed !== null) target.count = target.metrics.processed;
    }
}

/** Pure reconstruction: callers supply the clock and bounded persisted logs.
 * Legacy time scopes cannot disambiguate concurrent runs; new scopes require an
 * exact runId. Counts are processed operations, never database inventory.
 */
export function parseScraperStatus({ startLog = null, completionLog = null, logs = [], now, staleAfterMs = 15 * 60 * 1000 }) {
    const sources = entities(SOURCE_DEFS);
    const steps = entities(STEP_DEFS);
    const all = { ...sources, ...steps };
    const empty = { success: true, isRunning: false, activeStep: 0, elapsedSeconds: 0,
        sources, steps, stepDurations: {}, logs: [], lastRun: null };
    if (!startLog || !Number.isFinite(timestamp(startLog))) return empty;
    const startTime = timestamp(startLog);
    const startDetails = readLogDetails(startLog);
    const runId = startDetails.runId || null;
    const candidates = [startLog, ...logs, ...(completionLog ? [completionLog] : [])];
    const seen = new Set();
    let scoped = candidates.filter(log => {
        const time = timestamp(log);
        if (!Number.isFinite(time) || time < startTime || time > now) return false;
        const id = readLogDetails(log).runId;
        if (runId ? id !== runId : Boolean(id)) return false;
        const key = log.id || JSON.stringify([time, log.message, log.details]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a, b) => timestamp(a) - timestamp(b));
    // A newer start ends a legacy time scope. Never reach backwards by 2 seconds.
    const nextStart = scoped.find(log => isStart(log) && timestamp(log) > startTime);
    if (nextStart) scoped = scoped.filter(log => timestamp(log) < timestamp(nextStart));
    const completion = scoped.filter(isCompletion).at(-1);
    if (completion) scoped = scoped.filter(log => timestamp(log) <= timestamp(completion));
    const completionDetails = readLogDetails(completion);
    const stats = completionDetails.stats || completionDetails;
    const rawYears = stats.yearsScraped || stats.years || startDetails.years || (startLog.message?.match(/\b20\d{2}\b/g) || []);
    const years = [...new Set(Array.isArray(rawYears) ? rawYears.map(String) : [])];
    sources.fpc.desc = `Calendários FPC${years.length ? ` ${years.join(', ')}` : ''} · processados, não novos`;
    const yearCounts = new Map();
    const errors = new Map();
    let hasErrors = false;
    const recordError = (id, message) => {
        hasErrors = true;
        if (all[id]) errors.set(id, message);
    };

    for (const log of scoped) {
        const message = log.message || '';
        const details = readLogDetails(log);
        const id = details.sourceId || details.stepId || entityId(message);
        const target = all[id];
        if (log.level === 'ERROR') recordError(id, message);
        if (typeof details.event === 'string' && details.event.startsWith('stage-')) {
            applySnapshot(target, details);
            if (details.status === 'error') recordError(id, details.message || message);
            continue;
        }
        if (details.event === 'source-year-complete' && id === 'fpc') {
            if (details.year != null && validCount(details.processed) !== null) yearCounts.set(String(details.year), details.processed);
            if (details.metrics) applySnapshot(target, { metrics: details.metrics });
            if (details.status === 'error') recordError(id, message);
            continue;
        }
        if (!target || isStart(log) || isCompletion(log)) continue;
        const duration = message.match(/em\s*([\d.]+)s/i);
        if (duration) target.duration = `${duration[1]}s`;
        if (/a consultar|a recolher|a cruzar|a verificar|início da sincronização/i.test(message)) target.status = 'running';

        // Only named source/year summaries count. Repeated summaries replace,
        // never add, the same year's value (including an explicit zero).
        const fpc = message.match(/sincronização FPC\s+(20\d{2})\s+concluída\s*\((\d+)\s+eventos processados\)/i);
        if (id === 'fpc' && fpc) yearCounts.set(fpc[1], Number(fpc[2]));
        if (id === 'fpc' && /FPC:.*(?:calendários concluída|épocas sincronizadas)/i.test(message)) {
            const seasons = message.match(/(\d+)\/(\d+) épocas/i);
            target.status = seasons && seasons[1] !== seasons[2] ? 'error' : 'done';
            if (target.status === 'error') recordError(id, message);
        }
        const patterns = {
            cabreira: /(\d+) provas (?:atualizadas|processadas)/i,
            stopandgo: /(?:concluída\s*\((\d+)\s*provas|(\d+)\s*provas de ciclismo)/i,
            classificacoes: /(?:concluída\s*\((\d+)\s*provas|(\d+)\s*(?:já sincronizadas|provas oficiais enriquecidas))/i,
            deepScrape: /(\d+)\s*programas/i,
            unification: /(\d+)\s*provas fundidas/i,
            translation: /(\d+)\s*eventos traduzidos/i
        };
        const count = patterns[id] && message.match(patterns[id]);
        if (count) target.count = Number(count[1] ?? count[2]);
        if (id !== 'fpc' && /concluída|com sucesso|já sincronizadas|deep scraping fpc:.*atualizados/i.test(message) && log.level !== 'ERROR') target.status = 'done';
    }

    if (yearCounts.size) {
        sources.fpc.count = [...yearCounts.values()].reduce((sum, count) => sum + count, 0);
        if (years.length && years.every(year => yearCounts.has(year))) sources.fpc.status = 'done';
    }
    // Completion snapshots survive log truncation and supersede regex guesses.
    for (const [id, snapshot] of Object.entries(stats.sources || {})) applySnapshot(sources[id], snapshot);
    for (const [id, snapshot] of Object.entries(stats.steps || {})) applySnapshot(steps[id], snapshot);
    if (stats.fpcEvents && typeof stats.fpcEvents === 'object' && !Array.isArray(stats.fpcEvents)) {
        const values = Object.values(stats.fpcEvents).map(validCount).filter(value => value !== null);
        if (values.length) {
            sources.fpc.count = values.reduce((sum, count) => sum + count, 0);
            if (sources.fpc.metrics && sources.fpc.metrics.processed !== sources.fpc.count) {
                // An earlier progress snapshot is not a final action breakdown.
                sources.fpc.metrics = { processed: sources.fpc.count, created: null, updated: null, merged: null, quarantined: null };
            }
            if (years.length && years.every(year => validCount(stats.fpcEvents[year]) !== null) && sources.fpc.status !== 'error') sources.fpc.status = 'done';
        }
    }
    for (const [id, count] of [['deepScrape', stats.deepScrapedFpc], ['unification', stats.mergedEvents], ['translation', stats.translations?.translatedCount]]) {
        if (validCount(count) !== null) steps[id].count = count;
    }
    for (const error of Array.isArray(stats.errors) ? stats.errors : []) {
        if (error == null) continue;
        const message = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        recordError(error.sourceId || error.stepId || entityId(message), message);
    }
    if (stats.translations?.success === false) recordError('translation', stats.translations.error || 'Falha na tradução');
    for (const [id, message] of errors) Object.assign(all[id], { status: 'error', message });
    if (Object.values(all).some(target => target.status === 'error')) hasErrors = true;

    const latestTime = timestamp(scoped.at(-1)) || startTime;
    const isRunning = !completion && !nextStart && now - latestTime <= staleAfterMs;
    let status = completion
        ? (/falha crítica/i.test(completion.message) || completionDetails.status === 'error' ? 'error'
            : hasErrors || completionDetails.status === 'partial' ? 'partial' : 'success')
        : isRunning ? null : 'interrupted';
    const endTime = completion ? timestamp(completion) : isRunning ? now : latestTime;
    const durationSeconds = validCount(completionDetails.durationSeconds) ?? Math.max(0, Number(((endTime - startTime) / 1000).toFixed(1)));
    for (const target of Object.values(all)) {
        if (!isRunning && target.status === 'running') {
            target.status = 'error';
            if (status === 'success') status = 'partial';
            target.message = completion ? 'Sem confirmação de conclusão' : 'Sem atividade recente; conclusão não confirmada';
        } else if (target.status !== 'error' && target.count !== null) {
            target.message = `${target.count} processados${sources[target.id] ? ' (não necessariamente novos)' : ''}`;
        }
        if (sources[target.id]) target.metrics = { created: null, updated: null, merged: null, quarantined: null, ...target.metrics, processed: target.count };
    }
    const ordered = Object.values(all);
    const stepDurations = Object.fromEntries(ordered.map((target, index) => [index + 1, target.duration]));
    const active = ordered.findIndex(target => target.status === 'running');
    const metrics = Object.fromEntries(METRICS.map(key => {
        const values = Object.values(sources).map(source => source.metrics[key]);
        return [key, values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null];
    }));
    const lastRun = status ? {
        runId, status, years, startedAt: new Date(startTime).toISOString(),
        completedAt: completion ? new Date(timestamp(completion)).toISOString() : null,
        durationSeconds, sources, steps, metrics,
        // Older consumers used these names.
        startTime, completionTime: completion ? timestamp(completion) : null
    } : null;
    return {
        ...empty, isRunning, activeStep: active < 0 ? 0 : active + 1,
        elapsedSeconds: Math.floor(durationSeconds), sources, steps, stepDurations,
        logs: [...scoped].reverse().slice(0, 25), lastRun,
        runId, years, metrics, completed: Boolean(completion), interrupted: status === 'interrupted',
        status, durationSeconds, startTime, completionTime: completion ? timestamp(completion) : null,
        allSourcesDone: Object.values(sources).every(source => source.status === 'done'),
        message: status === 'interrupted' ? 'Sem atividade recente; execução possivelmente interrompida. Uma nova sincronização volta a consultar as fontes.' : completion?.message || null,
        scope: runId ? 'runId' : 'legacy-time-window'
    };
}
