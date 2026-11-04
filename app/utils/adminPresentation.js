export const runEntries = value => Array.isArray(value) ? value : Object.entries(value || {}).map(([id, row]) => ({ ...row, id: row.id || id }));
export function runSummary(run, running = false) {
    let status = running ? 'running' : run?.status || 'unknown';
    const problems = runEntries(run?.sources).filter(row => ['error','failed','partial','interrupted','ERROR'].includes(row.status));
    if (!running && ['success','done'].includes(status) && problems.length) status = 'partial';
    const text = { running:'A sincronização está em curso.', success:'A última sincronização terminou com sucesso.', done:'A última sincronização terminou com sucesso.', partial:'A última sincronização ficou incompleta.', error:'A última sincronização terminou com erro.', failed:'A última sincronização terminou com erro.', interrupted:'A última sincronização foi interrompida.', unknown:'Ainda não há uma sincronização confirmada.' }[status] || 'O resultado da sincronização precisa de confirmação.';
    return { status, problems, text, attention: ['partial','error','failed','interrupted','ERROR'].includes(status) || problems.length > 0 };
}
export function duration(value) {
    const parsed = typeof value === 'string' && /^\d+(?:\.\d+)?s$/.test(value) ? Number.parseFloat(value) : Number(value);
    if (value == null || !Number.isFinite(parsed)) return '—';
    const seconds = Math.max(0, Math.round(parsed));
    return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
export function sourceScope(value = '') {
    const [source, scope] = value.split(':');
    return `${source}${scope ? ` · ${scope === 'active' ? 'época ativa' : scope}` : ''}`;
}
