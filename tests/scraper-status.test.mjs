import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseScraperStatus, readLogDetails } from '../app/lib/admin/scraperStatus.js';
import { saveOrMergeEvent } from '../app/lib/merging/eventMerger.js';
import { AsyncLocalStorage } from 'node:async_hooks';

const base = Date.parse('2026-08-31T10:48:59Z');
let sequence = 0;
const row = (seconds, message, details, level = 'INFO') => ({
    id: `log-${sequence++}`, createdAt: new Date(base + seconds * 1000),
    source: 'SCRAPER', message, details: details === undefined ? null : JSON.stringify(details), level
});
const start = (runId) => row(0, 'Iniciada sincronização global [Sincronização Rápida Ativa (2026, 2027)]', runId ? { runId, event: 'run-start', years: ['2026', '2027'] } : undefined);
const finish = (seconds, details) => row(seconds, 'Sincronização global concluída em 100s.', details);
const parse = (startLog, logs, seconds = 120, extra = {}) => parseScraperStatus({ startLog, logs, now: base + seconds * 1000, ...extra });

test('unknown run and missing source counts are null, never fabricated zeroes', () => {
    const result = parse(null, []);
    assert.equal(result.lastRun, null);
    assert.equal(result.isRunning, false);
    for (const source of Object.values(result.sources)) {
        assert.equal(source.count, null);
        assert.equal(source.status, 'idle');
    }
    assert.deepEqual(result.logs, []);
});

test('legacy overlapping 375 + 375 FPC summaries count once per year', () => {
    const logs = [
        row(-24, 'Iniciada sincronização global'),
        row(54, 'Sincronização FPC 2026 concluída (375 eventos processados)'),
        row(76, 'Sincronização FPC 2026 concluída (375 eventos processados)'),
        row(80, 'Sincronização FPC 2027 concluída (0 eventos processados)'),
        row(81, 'Sincronização FPC 2027 concluída (0 eventos processados)'),
        row(82, 'Outra fonte concluída (900 eventos processados)'),
        finish(100, {})
    ];
    const result = parse(start(), logs.reverse());
    assert.equal(result.sources.fpc.count, 375);
    assert.equal(result.sources.fpc.metrics.created, null);
    assert.equal(result.scope, 'legacy-time-window');
    assert.match(result.sources.fpc.message, /não necessariamente novos/);
});

test('completion fpcEvents is authoritative, including zero and older-than-90m runs', () => {
    const completionLog = finish(100, { fpcEvents: { 2026: 375, 2027: 0 }, yearsScraped: ['2026', '2027'] });
    const result = parse(start(), [row(60, 'Sincronização FPC 2026 concluída (750 eventos processados)')], 86400, { completionLog });
    assert.equal(result.sources.fpc.count, 375);
    assert.equal(result.lastRun.status, 'success');
    assert.equal(result.lastRun.completedAt, completionLog.createdAt.toISOString());
    assert.equal(result.elapsedSeconds, 100);
    const emptySeason = parse(start(), [finish(100, { fpcEvents: { 2026: 0, 2027: 0 } })]);
    assert.equal(emptySeason.sources.fpc.count, 0);
});

test('strict run IDs exclude concurrent starts, foreign completions and unscoped logs', () => {
    const result = parse(start('second'), [
        row(3, 'Iniciada sincronização global', { runId: 'first' }),
        row(20, 'Sincronização FPC 2026 concluída (750 eventos processados)', { runId: 'first' }),
        row(30, 'Sincronização FPC 2026 concluída (900 eventos processados)'),
        finish(50, { runId: 'first', fpcEvents: { 2026: 750 } }),
        finish(100, { runId: 'second', fpcEvents: { 2026: 375, 2027: 0 } }),
        row(110, 'FPC: erro tardio', { runId: 'second' }, 'ERROR')
    ]);
    assert.equal(result.sources.fpc.count, 375);
    assert.equal(result.lastRun.runId, 'second');
    assert.equal(result.lastRun.status, 'success');
    assert.ok(result.logs.every(log => readLogDetails(log).runId === 'second'));
    assert.equal(result.logs.length, 2);
});

test('foreign completion cannot stop a currently active scoped run', () => {
    const result = parse(start('a'), [finish(100, { runId: 'b', fpcEvents: { 2026: 100 } })]);
    assert.equal(result.isRunning, true);
    assert.equal(result.lastRun, null);
    assert.equal(result.sources.fpc.count, null);
});

test('source/year snapshots and repeated persisted rows never double-count', () => {
    const year = row(20, 'FPC 2026', { runId: 'a', sourceId: 'fpc', year: '2026', event: 'source-year-complete', processed: 375, status: 'done' });
    const logs = [year, year, row(22, 'FPC 2027', { runId: 'a', sourceId: 'fpc', year: '2027', event: 'source-year-complete', processed: 0, status: 'done' })];
    assert.equal(parse(start('a'), logs).sources.fpc.count, 375);
});

test('authoritative completion count also replaces an earlier progress processed metric', () => {
    const result = parse(start('a'), [row(10, 'FPC progress', { runId: 'a', sourceId: 'fpc', event: 'stage-progress', metrics: { processed: 25, updated: 25 } }),
        finish(100, { runId: 'a', fpcEvents: { 2026: 375, 2027: 0 }, errors: [null] })]);
    assert.equal(result.sources.fpc.metrics.processed, 375);
    assert.equal(result.sources.fpc.metrics.updated, null);
});

test('structured completion alone restores stages, metrics and partial outcomes', () => {
    const fpcMetrics = { processed: 375, created: 10, updated: 350, merged: 10, quarantined: 5 };
    const result = parse(start('a'), [finish(100, {
        runId: 'a', status: 'partial', yearsScraped: ['2026', '2027'], fpcEvents: { 2026: 375, 2027: 0 },
        sources: { fpc: { status: 'done', count: 375, duration: '70s', metrics: fpcMetrics },
            cabreira: { status: 'error', count: 3, message: 'HTTP 503' }, stopandgo: { status: 'done', count: 20 } },
        steps: { translation: { status: 'error', count: null, message: 'offline' } },
        errors: ['Cabreira: HTTP 503', 'Translation error: offline']
    })]);
    assert.equal(result.lastRun.status, 'partial');
    assert.equal(result.sources.cabreira.status, 'error');
    assert.equal(result.steps.translation.status, 'error');
    assert.equal(result.steps.classificacoes.status, 'idle');
    assert.deepEqual(result.sources.fpc.metrics, fpcMetrics);
    assert.equal(result.stepDurations[1], '70s');
    assert.equal(result.metrics.processed, 398);
    assert.equal(result.metrics.created, null);
});

test('logged partial errors survive later success text and completion stats', () => {
    const result = parse(start(), [
        row(10, 'Erro durante o scraping da Cabreira Solutions: HTTP 503', undefined, 'ERROR'),
        row(15, 'Cabreira: sincronização concluída com sucesso em 5s.'),
        row(30, 'Classificações.net: a cruzar resultados'),
        finish(100, { fpcEvents: { 2026: 375 }, errors: ['FPC 2027: timeout'] })
    ]);
    assert.equal(result.lastRun.status, 'partial');
    assert.equal(result.sources.fpc.status, 'error');
    assert.equal(result.sources.cabreira.status, 'error');
    assert.equal(result.sources.stopandgo.status, 'idle');
    assert.equal(result.sources.stopandgo.count, null);
});

test('critical completion is error and never marks unfinished sources done', () => {
    const result = parse(start(), [row(2, 'FPC: a consultar calendários'), row(5, 'Falha crítica na sincronização', undefined, 'ERROR')]);
    assert.equal(result.lastRun.status, 'error');
    assert.equal(result.sources.fpc.status, 'error');
    assert.equal(result.sources.cabreira.status, 'idle');
});

test('stale activity means possibly interrupted, without a completion time or exact resume claim', () => {
    const result = parse(start(), [row(5, 'FPC: a consultar calendários')], 86400);
    assert.equal(result.lastRun.status, 'interrupted');
    assert.equal(result.lastRun.completedAt, null);
    assert.equal(result.sources.fpc.status, 'error');
    assert.match(result.message, /possivelmente interrompida/);
    assert.doesNotMatch(result.message, /exatamente|de onde ficou/);
});

test('malformed details fall back to named legacy logs and chronological latest counts', () => {
    const broken = { ...finish(100), details: '{"fpcEvents":' };
    const result = parse(start(), [broken, row(60, 'Sincronização FPC 2026 concluída (375 eventos processados)'), row(30, 'Sincronização FPC 2026 concluída (300 eventos processados)')]);
    assert.equal(result.sources.fpc.count, 375);
    assert.deepEqual(readLogDetails(broken), {});
});

test('legacy scope never includes a later run or a previous completion within two seconds', () => {
    const result = parse(start(), [finish(-1, { fpcEvents: { 2026: 999 } }), row(10, 'Iniciada sincronização global'), finish(20, { fpcEvents: { 2026: 750 } })]);
    assert.equal(result.lastRun.status, 'interrupted');
    assert.equal(result.sources.fpc.count, null);
});

test('legacy progress correctly recognizes source finishes without marking next stages done', () => {
    const result = parse(start(), [row(10, 'Stop and Go: a consultar provas de BTT e Ciclismo...'), row(11, 'FPC: 1/2 épocas sincronizadas em 4.0s.'), row(20, 'Tradução: a verificar provas pendentes de tradução...')]);
    assert.equal(result.sources.stopandgo.status, 'running');
    assert.equal(result.sources.fpc.status, 'error');
    assert.equal(result.steps.translation.status, 'running');
    assert.equal(result.steps.unification.status, 'idle');
});

// Substitute only module boundaries. Tests never connect to a database, invoke
// a real scraper or acquire a real lease.
async function isolatedModule(relativePath, dependencies) {
    const key = `scraperStatusTest${sequence++}`;
    globalThis[key] = dependencies;
    const original = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    const source = `const { ${Object.keys(dependencies).join(', ')} } = globalThis[${JSON.stringify(key)}];\n` + original.replace(/^import .*;\r?$/gm, '');
    try { return await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`); }
    finally { delete globalThis[key]; }
}

const loggerDb = { systemLog: {
    create: async () => { throw new Error('Unexpected log write'); },
    deleteMany: async () => { throw new Error('Unexpected cleanup'); }
} };
const { withScraperLogContext, logInfo, logError, cleanOldLogs } = await isolatedModule('../app/lib/logger.js', { prisma: loggerDb, AsyncLocalStorage });

test('API queries old start separately, scopes logs and fetches completion outside bounded history', async () => {
    const startLog = start('api-run');
    const completionLog = finish(100, { runId: 'api-run', fpcEvents: { 2026: 375, 2027: 0 } });
    const calls = [];
    const db = { systemLog: {
        findFirst: async query => { calls.push(query); return calls.length === 1 ? startLog : completionLog; },
        findMany: async query => { calls.push(query); return []; }
    } };
    const route = await isolatedModule('../app/api/admin/scraper-status/route.js', {
        prisma: db, requireAdmin: async () => ({ authorized: true }), parseScraperStatus, readLogDetails
    });
    const result = await (await route.GET()).json();
    assert.equal(calls[0].where.createdAt, undefined);
    assert.equal(calls[1].where.details.contains, 'api-run');
    assert.equal(calls[2].where.source, undefined); // helper errors share the run ID
    assert.equal(calls[2].take, 300);
    assert.equal(calls[2].where.createdAt.lte, completionLog.createdAt);
    assert.equal(result.lastRun.sources.fpc.count, 375);
});

test('API authorizes before reading logs', async () => {
    const route = await isolatedModule('../app/api/admin/scraper-status/route.js', {
        prisma: {}, requireAdmin: async () => ({ authorized: false, status: 403, error: 'Forbidden' }), parseScraperStatus, readLogDetails
    });
    assert.equal((await route.GET()).status, 403);
});

function captureLogs(t) {
    const logs = [];
    t.mock.method(loggerDb.systemLog, 'create', async ({ data }) => { const log = { ...data, id: `captured-${sequence++}`, createdAt: new Date() }; logs.push(log); return log; });
    t.mock.method(console, 'log', () => {});
    t.mock.method(console, 'error', () => {});
    return logs;
}

test('AsyncLocalStorage scopes overlapping runs and source/year errors without leaking context', async t => {
    const logs = captureLogs(t);
    const errors = [];
    await Promise.all(['a', 'b'].map(runId => withScraperLogContext({ runId, onError: error => errors.push({ runId, ...error }) }, async () => {
        await withScraperLogContext({ sourceId: 'fpc', year: '2026' }, async () => {
            await Promise.resolve();
            await logInfo('SCRAPER', 'Sincronização FPC 2026 concluída (375 eventos processados)');
            await logError('SCRAPER', 'failure', new Error('network'));
        });
        await logInfo('SCRAPER', 'global completion');
    })));
    await logInfo('SCRAPER', 'outside');
    assert.equal(errors.length, 2);
    for (const runId of ['a', 'b']) {
        const scoped = logs.filter(log => readLogDetails(log).runId === runId);
        assert.equal(scoped.length, 3);
        assert.equal(readLogDetails(scoped[0]).sourceId, 'fpc');
        assert.equal(readLogDetails(scoped[1]).year, '2026');
        assert.equal(readLogDetails(scoped[2]).sourceId, undefined);
    }
    assert.equal(readLogDetails(logs.at(-1)).runId, undefined);
});

test('cleanup always excludes the active lease even with days=0', async t => {
    let query;
    t.mock.method(loggerDb.systemLog, 'deleteMany', async input => { query = input; return { count: 4 }; });
    assert.equal(await cleanOldLogs(0), 4);
    assert.equal(query.where.id.not, 'operational-scraper-lease');
});

test('oversized diagnostics keep valid JSON and run attribution', async t => {
    const logs = captureLogs(t);
    await withScraperLogContext({ runId: 'large', sourceId: 'fpc', year: '2026' }, () => logError('SCRAPER', 'failure', { stack: 'x'.repeat(60000) }));
    assert.equal(readLogDetails(logs[0]).runId, 'large');
    assert.equal(readLogDetails(logs[0]).detailsTruncated, true);
    assert.ok(logs[0].details.length < 50000);
});

test('save metrics report every outcome once and never report rejected writes', async () => {
    const event = { id: 'new', title: 'Gran Fondo Test', date: '12 JUL 2026', sortDate: new Date('2026-07-12'), source: 'FPC' };
    for (const action of ['created', 'updated', 'merged', 'quarantined']) {
        const outcomes = [];
        const existing = { ...event, id: action === 'merged' ? 'other' : 'new', source: action === 'quarantined' ? 'Quarentena' : 'FPC' };
        const db = { event: {
            findUnique: async () => ['updated', 'quarantined'].includes(action) ? existing : null,
            findMany: async () => action === 'merged' ? [existing] : [],
            update: async ({ data }) => ({ ...existing, ...data }),
            create: async ({ data }) => data
        } };
        assert.equal((await saveOrMergeEvent(db, event, { onResult: result => outcomes.push(result.action) })).action, action);
        assert.deepEqual(outcomes, [action]);
    }
    let reported = false;
    const db = { event: { findUnique: async () => null, findMany: async () => [], create: async () => { throw new Error('write failed'); } } };
    await assert.rejects(saveOrMergeEvent(db, event, { onResult: () => { reported = true; } }), /write failed/);
    assert.equal(reported, false);
    db.event.create = async ({ data }) => data;
    assert.equal((await saveOrMergeEvent(db, event, { onResult: () => { throw new Error('telemetry'); } })).action, 'created');
});

async function pipelineFixture(overrides = {}) {
    return isolatedModule('../app/lib/scrapers/unifiedPipeline.js', {
        randomUUID: () => 'fixture-run', withScraperLogContext, logInfo, logError,
        withScraperLock: work => work(),
        scrapeFPC: async (_year, { onResult }) => { await onResult({ action: 'updated' }); return 1; },
        scrapeCabreira: async (_year, { onResult }) => { await onResult({ action: 'created' }); return 1; },
        scrapeStopAndGo: async ({ onResult }) => { await onResult({ action: 'quarantined' }); return 1; },
        scrapeClassificacoes: async () => 0, incrementalDeepScrapeFPC: async () => 0,
        translateAllPendingEvents: async () => ({ success: true, translatedCount: 0 }),
        prisma: { event: { findMany: async () => [] } },
        isSameEvent: () => false, mergeEventRecords: () => ({}), ...overrides
    });
}

test('pipeline acquires only one lease before any run log and publishes complete metrics', async t => {
    const logs = captureLogs(t);
    let locks = 0;
    const pipeline = await pipelineFixture({ withScraperLock: async work => { locks++; assert.equal(logs.length, 0); return work(); } });
    const result = await pipeline.runUnifiedScrapingPipeline('TEST', { fullHistorical: false });
    assert.equal(locks, 1);
    assert.equal(result.success, true);
    const summary = readLogDetails(logs.at(-1));
    assert.equal(summary.status, 'success');
    assert.equal(summary.sources.fpc.metrics.updated, 2);
    assert.equal(summary.sources.cabreira.metrics.created, 1);
    assert.equal(summary.sources.stopandgo.metrics.quarantined, 1);
    assert.ok(logs.every(log => readLogDetails(log).runId === 'fixture-run'));
    assert.ok(logs.some(log => readLogDetails(log).year));
    const status = parseScraperStatus({ startLog: logs[0], completionLog: logs.at(-1), now: Date.now(), logs: [] });
    assert.equal(status.lastRun.status, 'success');
    assert.equal(status.sources.fpc.count, 2);
});

test('pipeline cannot label swallowed/logged source and enrichment errors as success', async t => {
    const logs = captureLogs(t);
    const pipeline = await pipelineFixture({
        scrapeCabreira: async () => { await logError('SCRAPER', 'Cabreira: event failed'); return 0; },
        scrapeClassificacoes: async () => { await logError('SCRAPER', 'Classificações.net: offline'); return 0; },
        translateAllPendingEvents: async () => ({ success: false, error: 'offline' })
    });
    const result = await pipeline.runUnifiedScrapingPipeline('TEST', { fullHistorical: false });
    assert.equal(result.success, false);
    const summary = readLogDetails(logs.at(-1));
    assert.equal(summary.status, 'partial');
    assert.equal(summary.sources.cabreira.status, 'error');
    assert.equal(summary.steps.classificacoes.status, 'error');
    assert.equal(summary.steps.translation.status, 'error');
});

test('lock conflict propagates without writing a phantom start', async t => {
    const logs = captureLogs(t);
    const conflict = Object.assign(new Error('running'), { code: 'SCRAPER_ALREADY_RUNNING' });
    const pipeline = await pipelineFixture({ withScraperLock: async () => { throw conflict; } });
    await assert.rejects(pipeline.runUnifiedScrapingPipeline(), error => error === conflict);
    assert.equal(logs.length, 0);
});

test('unification moves missing translations and fills empty fields before atomic deletion', async t => {
    captureLogs(t);
    const calls = [];
    const tx = {
        event: { update: async () => calls.push('event-update'), delete: async () => calls.push('event-delete') },
        eventTranslation: {
            findMany: async () => [{ id: 'en-old', language: 'en', title: 'English' }, { id: 'fr-old', language: 'fr', title: 'Français', description: 'Description' }],
            findUnique: async ({ where }) => where.eventId_language.language === 'en' ? null : { title: 'Retained title', description: null },
            update: async query => calls.push(query)
        }
    };
    const pipeline = await pipelineFixture({
        isSameEvent: () => true,
        prisma: { event: { findMany: async () => [{ id: 'primary' }, { id: 'secondary' }] },
            $transaction: async work => { calls.push('begin'); await work(tx); calls.push('commit'); } }
    });
    const result = await pipeline.runUnifiedScrapingPipeline('TEST', { fullHistorical: false });
    assert.equal(result.stats.mergedEvents, 1);
    assert.deepEqual(calls, ['begin', 'event-update',
        { where: { id: 'en-old' }, data: { eventId: 'primary' } },
        { where: { eventId_language: { eventId: 'primary', language: 'fr' } }, data: { description: 'Description' } },
        'event-delete', 'commit']);
});

test('a failed unification transaction reports partial and does not count a merge', async t => {
    const logs = captureLogs(t);
    const pipeline = await pipelineFixture({ isSameEvent: () => true,
        prisma: { event: { findMany: async () => [{ id: 'primary' }, { id: 'secondary' }] },
            $transaction: async () => { throw new Error('transaction rolled back'); } }
    });
    const result = await pipeline.runUnifiedScrapingPipeline('TEST', { fullHistorical: false });
    assert.equal(result.success, false);
    assert.equal(result.stats.mergedEvents, null);
    assert.equal(readLogDetails(logs.at(-1)).steps.unification.status, 'error');
});
