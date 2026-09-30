import { assertContentProcessingApproved } from '../app/lib/contentReleasePolicy.js';
assertContentProcessingApproved();
// Dry run by default. --apply saves a backup before each optimistic update.
import { mkdirSync, writeFileSync } from 'node:fs';
import { prisma } from '../app/lib/db.js';
import { readPublicResource } from '../app/lib/safeRemote.js';
import { eventLinks, fpcDetailLink, prioritizeDetailChecks, needsFpcDetails } from '../app/lib/scrapers/detailQueue.js';
import { parseApedalarDetails, parseRecordePessoalDetails } from '../app/lib/scrapers/eventDetailParsers.js';
import { deepScrapeFPCWithRetry } from '../app/lib/scrapers/fpc.js';

const apply = process.argv.includes('--apply');
const backupDir = `maintenance/backups/details-${Date.now()}`;
const counts = { checked: 0, enriched: 0, unavailable: 0, conflicts: 0 };
if (apply) mkdirSync(backupDir, { recursive: true });
try {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const events = prioritizeDetailChecks(await prisma.event.findMany({ where: {
        sortDate: { gte: today }, source: { not: { contains: 'Quarentena' } },
    } }), today);
    for (const event of events) {
        let source, url;
        for (const value of (process.argv.includes('--fpc-only') ? [] : eventLinks(event))) {
            try {
                const candidate = new URL(value);
                if (!/^https?:$/.test(candidate.protocol) || candidate.username || candidate.password || candidate.port) continue;
                if (['apedalar.pt', 'www.apedalar.pt'].includes(candidate.hostname) && /^\/eventos\/[^/]+\/?$/.test(candidate.pathname)) {
                    source = 'Apedalar'; url = candidate.href; break;
                }
                if (['recordepessoal.pt', 'www.recordepessoal.pt'].includes(candidate.hostname) && /^\/(evento|inscricao)\//.test(candidate.pathname)) {
                    source = 'Recorde Pessoal'; candidate.pathname = candidate.pathname.replace('/inscricao/', '/evento/'); url = candidate.href; break;
                }
            } catch { /* Invalid source URL. */ }
        }
        if (!url && needsFpcDetails(event)) {
            url = fpcDetailLink(event); source = 'FPC';
        }
        if (!url) continue;
        counts.checked++;
        try {
            let parsed;
            if (source === 'FPC') parsed = { programa: await deepScrapeFPCWithRetry(url, event.id, { attempts: 2 }) };
            else {
                const { buffer } = await readPublicResource(url, { maxBytes: 3 * 1024 * 1024, timeoutMs: 20000, accept: 'text/html' });
                parsed = (source === 'Apedalar' ? parseApedalarDetails : parseRecordePessoalDetails)(buffer.toString('utf8'), url);
            }
            const data = {};
            // Preserve existing editorial data; only fill gaps and legacy placeholders.
            for (const field of ['description', 'programa', 'prices', 'organizador', 'image']) {
                if (parsed[field] && (!event[field] || (field === 'programa' && needsFpcDetails(event)))) data[field] = parsed[field];
            }
            if (parsed.extraLinks) {
                let links; try { links = JSON.parse(event.extraLinks || '[]'); } catch { links = []; }
                if (!Array.isArray(links)) links = [];
                for (const link of parsed.extraLinks) if (!links.some(existing => existing.link === link.link)) links.push(link);
                if (JSON.stringify(links) !== event.extraLinks) data.extraLinks = JSON.stringify(links);
            }
            if (!Object.keys(data).length) continue;
            if (apply) {
                writeFileSync(`${backupDir}/${counts.checked}.json`, JSON.stringify(event, null, 2));
                const result = await prisma.event.updateMany({ where: { id: event.id, updatedAt: event.updatedAt }, data: {
                    ...data, detailsCheckedAt: new Date(), lastVerifiedAt: new Date(), lastVerifiedSource: source,
                } });
                if (!result.count) { counts.conflicts++; continue; }
            }
            counts.enriched++;
            console.log(JSON.stringify({ id: event.id, source, fields: Object.keys(data), applied: apply }));
        } catch (error) {
            counts.unavailable++;
            console.log(JSON.stringify({ id: event.id, source, error: error.message }));
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log(JSON.stringify({ ...counts, applied: apply, backupDir: apply ? backupDir : null }));
} finally { await prisma.$disconnect(); await globalThis.pgPool?.end(); }
