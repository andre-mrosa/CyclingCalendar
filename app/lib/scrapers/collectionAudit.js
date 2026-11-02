// Account for every discovered candidate, including pages which never reach a save.
// Only operational counts and source URLs are retained, never page bodies.
export function createCollectionAudit(source, options = {}, {logInfo,logError}) {
    const outcomes = new Map();
    return {
        discover(keys) { for (const key of keys) if (!outcomes.has(key)) outcomes.set(key, null); },
        resolve(key, reason) { outcomes.set(key, reason); },
        async fail(key, reason) {
            outcomes.set(key, 'failed');
            await logError('SCRAPER', `${source}: ${reason} em ${key}`, {event:'candidate-failure', url:key});
        },
        async finish() {
            const counts = {discovered:outcomes.size, saved:0, past:0, nonCycling:0, outsideYears:0, unavailable:0, failed:0, unresolved:0};
            for (const value of outcomes.values()) counts[value || 'unresolved']++;
            if (counts.unresolved) await logError('SCRAPER', `${source}: ${counts.unresolved} candidatos sem resultado confirmado; recolha incompleta`);
            await logInfo('SCRAPER', `${source}: balanço da descoberta`, {event:'source-coverage', coverage:counts});
            await options.onCoverage?.(counts);
            return counts;
        },
    };
}

// Wait for all in-flight requests before closing the source stage/lease.
export async function settleSourceBatch(items, work) {
    const results=await Promise.allSettled(items.map(work));
    const failure=results.find(result=>result.status==='rejected');
    if (failure) throw failure.reason;
}
