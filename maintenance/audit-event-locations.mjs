// Read-only audit: node maintenance/audit-event-locations.mjs snapshot.json report.md
import fs from 'node:fs';
import { withEventLocation } from '../app/lib/eventLocation.js';
import { formatEventLocation, normalizeLocation } from '../app/utils/eventLocation.js';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node maintenance/audit-event-locations.mjs snapshot.json report.md');
const snapshot = JSON.parse(fs.readFileSync(input, 'utf8'));
const events = (Array.isArray(snapshot) ? snapshot : snapshot.events).map(withEventLocation);
const counts = Object.fromEntries(['start', 'locality', 'district', 'unknown'].map(precision => [precision, events.filter(event => event.locationInfo.precision === precision).length]));
const cell = value => String(value || '').replace(/[|\r\n]/g, ' ');
const rows = events.filter(event => event.locationInfo.precision === 'start').map(event => `| ${cell(event.title)} | ${cell(event.details?.split('|')[0])} | ${cell(formatEventLocation(event))} | ${event.link || ''} |`);
const issues = events.flatMap(event => {
    const reasons = [];
    if (['unknown', 'district'].includes(event.locationInfo.precision)) reasons.push('Local da prova por confirmar');
    if (!event.distrito) reasons.push('Distrito em falta');
    if (event.title?.length > 10 && normalizeLocation(event.details).includes(normalizeLocation(event.title))) reasons.push('Localização pode conter texto do título');
    return reasons.length ? [`| ${cell(event.title)} | ${cell(event.details)} | ${reasons.join('; ')} | ${event.link || ''} |`] : [];
});
fs.writeFileSync(output, `# Auditoria de localizações — ${new Date().toISOString().slice(0,10)}\n\n${events.length} provas. Classificação: ${JSON.stringify(counts)}.\n\nA classificação descreve os dados publicados, não valida coordenadas. A ausência de um alerta não confirma o local exato. Programas só são avaliados quando constam do snapshot.\n\n## Locais de partida encontrados nos programas\n\n| Prova | Localidade anterior | Apresentação proposta | Fonte |\n|---|---|---|---|\n${rows.join('\n')}\n\n## Revisão pendente\n\n| Prova | Localização guardada | Motivo | Fonte |\n|---|---|---|---|\n${issues.join('\n')}\n`);
console.log(JSON.stringify({ events: events.length, counts, flagged: issues.length, report: output }));
