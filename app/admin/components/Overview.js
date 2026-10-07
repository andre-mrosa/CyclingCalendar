import { ArrowUpRight, Activity } from 'lucide-react';
import { Button, Empty, Metric, Panel, RefreshButton, Status, dateTime, number } from './ui';

function Ranking({ title, rows = [], labelKey, description }) {
    const max = Math.max(1, ...rows.map(row => row.count || 0));
    return (
        <Panel title={title} description={description} className="h-full">
            {rows.length ? (
                <ol className="p-6 space-y-5">
                    {rows.slice(0, 5).map((row, index) => (
                        <li key={row.id || row[labelKey] || index}>
                            <div className="flex justify-between items-baseline gap-4 text-sm mb-2">
                                <span className="font-medium text-ink truncate">{row.title || row[labelKey] || 'Desconhecido'}</span>
                                <strong className="font-bold tabular-nums text-ink">{number(row.count)}</strong>
                            </div>
                            <div className="h-1.5 bg-soft rounded-full overflow-hidden">
                                <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${Math.max(0, row.count / max * 100)}%` }} />
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <Empty>Sem atividade registada neste período.</Empty>
            )}
        </Panel>
    );
}

export default function Overview({ stats, busy, refreshing, timeframe, setTimeframe, autoRefresh, setAutoRefresh, refresh, navigate, pendingDeletions, lastRun, running }) {
    const analytics = stats?.analytics;
    const syncStatus = running ? 'running' : lastRun?.status || 'unknown';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-ink">Resumo</h2>
                    <p className="text-sm text-muted mt-1">O essencial sobre o calendário, as sincronizações e a utilização do site.</p>
                </div>
                <RefreshButton busy={busy || refreshing} onClick={refresh} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Metric label="Provas publicadas" value={stats?.events?.total} note={`${number(stats?.events?.quarantined)} em quarentena`} />
                <Metric label="Próximas provas" value={stats?.events?.upcoming} note="No calendário publicado" />
                <Metric label="Contas" value={stats?.users?.total} note={`${number(pendingDeletions)} pedidos de eliminação`} />
                <Metric label="Erros" value={stats?.logs?.errors} note="Registos de erro do sistema" accent={stats?.logs?.errors > 0} />
            </div>

            <Panel 
                title="Última sincronização" 
                description={running ? 'A recolha está a decorrer no servidor.' : lastRun ? `Terminou ${dateTime(lastRun.completedAt || lastRun.completionTime)}.` : 'Ainda não há um resumo de execução disponível.'} 
                action={<Button onClick={() => navigate('operations')}>Ver detalhes <ArrowUpRight size={15} /></Button>}
            >
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="flex items-center gap-4">
                        <Status value={syncStatus} />
                        <span className="text-sm text-muted">{running ? 'A consultar o estado automaticamente.' : 'A sincronização automática segue o horário configurado.'}</span>
                    </div>
                </div>
            </Panel>

            <div className="pt-4 border-t border-line">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2"><Activity size={20} className="text-brand"/> Utilização do calendário</h2>
                        <p className="text-sm text-muted mt-1 max-w-2xl">Contagens agregadas, apenas de pessoas que aceitaram estatísticas. Sem IDs de visitante, pesquisas, localização ou dispositivo.</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer hover:text-ink transition-colors">
                            <input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} className="rounded border-gray-300 text-brand focus:ring-brand accent-brand w-4 h-4" />
                            Atualizar ao vivo
                        </label>
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <span className="hidden sm:inline">Período</span>
                            <select value={timeframe} onChange={event => setTimeframe(event.target.value)} className="bg-surface border border-line text-ink rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand font-medium">
                                <option value="today">Hoje</option>
                                <option value="7d">Últimos 7 dias</option>
                                <option value="30d">Últimos 30 dias</option>
                                <option value="13m">Últimos 13 meses</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Metric label="Sessões" value={analytics?.sessions} note="Visitas iniciadas após consentimento" />
                    <Metric label="Páginas vistas" value={analytics?.pageViews} note="Navegação em páginas públicas" />
                    <Metric label="Interações" value={analytics?.interactions} note="Pesquisas, favoritos, exportações e cliques" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Ranking title="Páginas mais vistas" rows={analytics?.topPages} labelKey="path" description="Contagens de páginas públicas" />
                    <Ranking title="Provas mais abertas" rows={analytics?.topEvents} labelKey="title" description="Aberturas de ligações para as páginas originais" />
                </div>
                
                <details className="mt-6 group border border-line bg-surface rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-muted group-open:text-ink group-open:border-b group-open:border-line flex items-center justify-between hover:bg-soft transition-colors">
                        Ver divisão das ações
                        <span className="transition group-open:rotate-180">
                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <div className="px-6 py-2 divide-y divide-line">
                        <div className="flex justify-between items-center py-3 text-sm">
                            <dt className="text-muted">Pesquisas (sem guardar os termos)</dt>
                            <dd className="font-semibold tabular-nums text-ink">{number(analytics?.searches)}</dd>
                        </div>
                        <div className="flex justify-between items-center py-3 text-sm">
                            <dt className="text-muted">Favoritos alterados</dt>
                            <dd className="font-semibold tabular-nums text-ink">{number(analytics?.favoriteChanges)}</dd>
                        </div>
                        <div className="flex justify-between items-center py-3 text-sm">
                            <dt className="text-muted">Exportações de calendário</dt>
                            <dd className="font-semibold tabular-nums text-ink">{number(analytics?.calendarExports)}</dd>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
}
