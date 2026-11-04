// Account for every discovered candidate, including pages which never reach a save.
// Only operational counts and source URLs are retained, never page bodies.
export function createCollectionAudit(source, options = {}, {logInfo,logError}) {
    const outcomes = new Map(options.coverageState || []);
    function counts() {
        const value = {discovered:outcomes.size, saved:0, past:0, nonCycling:0, outsideYears:0, unavailable:0, failed:0, unresolved:0};
        for (const reason of outcomes.values()) value[reason || 'unresolved']++;
        return value;
    }
    return {
        checkpoint() { return [...outcomes]; },
        counts,
        discover(keys) { for (const key of keys) if (!outcomes.has(key)) outcomes.set(key, null); },
        resolve(key, reason) { outcomes.set(key, reason); },
        async fail(key, reason) {
            outcomes.set(key, 'failed');
            await logError('SCRAPER', `${source}: ${reason} em ${key}`, {event:'candidate-failure', url:key});
        },
        async finish() {
            const coverage = counts();
            if (coverage.unresolved) await logError('SCRAPER', `${source}: ${coverage.unresolved} candidatos sem resultado confirmado; recolha incompleta`);
            await logInfo('SCRAPER', `${source}: balanço da descoberta`, {event:'source-coverage', coverage});
            await options.onCoverage?.(coverage);
            return coverage;
        },
    };
}

// Wait for all in-flight requests before closing the source stage/lease.
export async function settleSourceBatch(items, work) {
    const results=await Promise.allSettled(items.map(work));
    const failure=results.find(result=>result.status==='rejected');
    if (failure) throw failure.reason;
}
