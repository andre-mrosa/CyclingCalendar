// Read-only audit by default. --apply-plan=path backs up event records first.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prisma } from '../app/lib/db.js';
import { fetchFPCCalendar } from '../app/lib/scrapers/fpc.js';
import { parseStopAndGoEvent } from '../app/lib/scrapers/stopandgo.js';
import { readStopAndGoHeader, stopAndGoEventUrl } from '../app/lib/scrapers/stopandgoParser.js';
import { getAmbito } from '../app/lib/scrapers/utils.js';
import { saveOrMergeEvent } from '../app/lib/merging/eventMerger.js';
import { isOfficialNationalChampionship } from '../app/utils/eventClassifier.js';

const applyPlan = process.argv.find(arg => arg.startsWith('--apply-plan='))?.slice('--apply-plan='.length);
const apply = Boolean(applyPlan);
const currentYear = new Date().getFullYear();
const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
try {
    if (applyPlan) {
        const plan = JSON.parse(await readFile(applyPlan, 'utf8'));
        if (plan.version !== 1) throw new Error('Formato de plano inválido');
        const folder = new URL('./backups/', import.meta.url);
        await mkdir(folder, { recursive: true });
        const snapshot = new URL(`calendar-before-repair-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, folder);
        const stored = await prisma.event.findMany({ include: { translations: true } });
        await writeFile(snapshot, JSON.stringify({ createdAt: new Date(), events: stored, plan: plan.summary }), { flag: 'wx' });
        console.log(`Snapshot de recuperação: ${fileURLToPath(snapshot)}`);
        for (const event of plan.quarantine) await prisma.event.update({ where: { id: event.id, source: 'Stop and Go' }, data: { source: 'Quarentena' } });
        for (const event of plan.updates) await prisma.event.update({ where: { id: event.id, source: 'Stop and Go' }, data: event.data });
        for (const event of plan.nationalCorrections) await prisma.event.update({ where: { id: event.id }, data: { ambito: event.ambito } });
        for (let i = 0; i < plan.calendars.length; i++) {
            await saveOrMergeEvent(prisma, plan.calendars[i]);
            if ((i + 1) % 100 === 0) console.log(`FPC: ${i + 1}/${plan.calendars.length} guardados`);
        }
        const after = await prisma.event.findMany({ where: { sortDate: { gte: new Date(`${currentYear}-01-01`), lt: new Date(`${currentYear + 1}-01-01`) }, ambito: 'Campeonato Nacional' }, select: { id: true, title: true, source: true, details: true } });
        console.log(JSON.stringify({ repaired: true, currentYearChampionships: after.length, invalidNationalEntries: after.filter(e => !isOfficialNationalChampionship(e)), quarantined: plan.quarantine.length }));
    } else {
    const calendars = [];
    for (const year of years) {
        const events = await fetchFPCCalendar(year);
        calendars.push(...events);
        console.log(JSON.stringify({ fpcYear: year, events: events.length, championships: events.filter(isOfficialNationalChampionship).length }));
    }
    const stored = await prisma.event.findMany({ include: { translations: true } });
    const stopAndGo = stored.filter(e => e.source === 'Stop and Go');
    const quarantine = [], updates = [], unresolved = [];
    for (let i = 0; i < stopAndGo.length; i += 2) {
        await Promise.all(stopAndGo.slice(i, i + 2).map(async event => {
            const url = stopAndGoEventUrl(event.link);
            if (!url) { unresolved.push({ id: event.id, reason: 'URL ausente' }); return; }
            try {
                const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const html = await response.text();
                const header = readStopAndGoHeader(html);
                if (!header.title || !header.knownModality) throw new Error('Modalidade não confirmada');
                if (!header.cycling) {
                    quarantine.push({ id: event.id, title: event.title, modality: header.modality });
                    return;
                }
                // Preserve actual historical cycling events; fix their year rather
                // than assigning them to this year's calendar or deleting them.
                const fresh = parseStopAndGoEvent(html, url, { years: [header.year] });
                if (!fresh) throw new Error('Data não confirmada');
                updates.push({ id: event.id, data: {
                    title: fresh.title, date: fresh.date, sortDate: fresh.sortDate,
                    details: fresh.details, tag: fresh.tag, ambito: fresh.ambito,
                    regiao: fresh.regiao, distrito: fresh.distrito
                } });
            } catch (error) { unresolved.push({ id: event.id, reason: error.message }); }
        }));
        if ((i + 2) % 16 === 0 || i + 2 >= stopAndGo.length) console.log(`Stop and Go: ${Math.min(i + 2, stopAndGo.length)}/${stopAndGo.length} verificados`);
        if (i + 2 < stopAndGo.length) await new Promise(resolve => setTimeout(resolve, 1200));
    }
    const nationalCorrections = stored.filter(e => e.ambito === 'Campeonato Nacional' && !isOfficialNationalChampionship(e))
        .map(e => ({ id: e.id, title: e.title, ambito: getAmbito(e.title, e.details || '', e.tag || '', e.source) }));
    const summary = {
        apply, officialEvents: calendars.length,
        currentYearChampionships: calendars.filter(e => e.sortDate.getUTCFullYear() === currentYear && isOfficialNationalChampionship(e)).map(e => ({ title: e.title, date: e.date, tag: e.tag })),
        quarantine, stopAndGoUpdates: updates.length, nationalCorrections, unresolved
    };
    console.log(JSON.stringify(summary, null, 2));
    const folder = new URL('./backups/', import.meta.url);
    await mkdir(folder, { recursive: true });
    const planFile = new URL(`repair-plan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, folder);
    await writeFile(planFile, JSON.stringify({ version: 1, createdAt: new Date(), calendars, quarantine, updates, nationalCorrections, summary }), { flag: 'wx' });
    console.log(`Plano de recuperação (sem alterações na BD): ${fileURLToPath(planFile)}`);
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
    await globalThis.pgPool.end();
}
