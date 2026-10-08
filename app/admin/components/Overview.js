import { ArrowUpRight, Activity, CalendarDays, Users, AlertTriangle, TrendingUp, Download, Heart, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button, Empty, Status, dateTime, number } from './ui';

function TopEventCard({ title, count, max, index }) {
    return (
        <div className="flex items-center gap-4 group">
            <div className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-bold shrink-0">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium text-ink truncate pr-4">{title}</p>
                    <span className="text-sm font-semibold text-brand tabular-nums shrink-0">{number(count)} <span className="text-muted text-xs font-normal">aberturas</span></span>
                </div>
                <div className="h-1.5 w-full bg-soft rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(0, (count / max) * 100)}%` }} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, trend, subtitle, alert }) {
    return (
        <div className={`p-6 rounded-2xl border ${alert ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-surface border-line shadow-sm'} flex flex-col relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${alert ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-brand-soft text-brand'}`}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        <TrendingUp size={12} /> {trend}
                    </span>
                )}
            </div>
            <h3 className="text-sm font-medium text-muted">{title}</h3>
            <div className="mt-1 flex items-baseline gap-2">
                <strong className={`text-3xl font-bold tracking-tight ${alert ? 'text-red-700 dark:text-red-400' : 'text-ink'}`}>{number(value)}</strong>
            </div>
            {subtitle && <p className="text-xs text-muted mt-2">{subtitle}</p>}
        </div>
    );
}

export default function Overview({ stats, busy, refreshing, timeframe, setTimeframe, autoRefresh, setAutoRefresh, refresh, navigate, pendingDeletions, lastRun, running }) {
    const analytics = stats?.analytics;
    const events = stats?.events;
    const syncStatus = running ? 'running' : lastRun?.status || 'unknown';
    const isSyncError = ['error', 'failed', 'ERROR'].includes(syncStatus);
    
    const maxEventViews = Math.max(1, ...(analytics?.topEvents?.map(e => e.count) || [0]));

    return (
        <div className="space-y-8 animate-in fade-in duration-700 fill-mode-both">
            {/* Actionable Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-surface p-6 sm:p-8 rounded-2xl border border-line shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 text-brand-soft opacity-50 dark:opacity-10 pointer-events-none">
                    <Activity size={240} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight text-ink mb-2">Ponto de Situação</h2>
                    <p className="text-muted max-w-xl text-sm leading-relaxed">
                        Bem-vindo ao centro de comando. Tens <strong>{number(events?.upcoming)} provas futuras</strong> publicadas e o sistema 
                        {running ? ' está a sincronizar dados neste momento' : ' sincronizou com sucesso recentemente'}.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    <Button onClick={() => navigate('operations')} tone={isSyncError ? 'danger' : 'default'} className="bg-white">
                        {isSyncError ? 'Verificar Falha no Scraper' : 'Forçar Sincronização'}
                    </Button>
                    <Button tone="primary" onClick={() => navigate('inventory')}>
                        Gerir Calendário
                    </Button>
                </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard 
                    title="Provas Futuras" 
                    value={events?.upcoming} 
                    icon={CalendarDays}
                    subtitle={`${number(events?.total)} no total histórico`}
                />
                <StatCard 
                    title="Em Quarentena" 
                    value={events?.quarantined} 
                    icon={AlertTriangle}
                    alert={events?.quarantined > 0}
                    subtitle={events?.quarantined > 0 ? 'Requer revisão manual!' : 'Tudo limpo'}
                />
                <StatCard 
                    title="Comunidade" 
                    value={stats?.users?.total} 
                    icon={Users}
                    subtitle={pendingDeletions > 0 ? `${number(pendingDeletions)} contas para apagar` : 'Utilizadores registados'}
                />
                <div className="p-6 rounded-2xl border border-line bg-surface shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl ${running ? 'bg-blue-100 text-blue-600 animate-pulse' : isSyncError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {running ? <RefreshButton busy={true}/> : isSyncError ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <span className="text-xs font-medium text-muted flex items-center gap-1"><Clock size={12}/> Automático</span>
                    </div>
                    <h3 className="text-sm font-medium text-muted">Scraper (Automação)</h3>
                    <div className="mt-1">
                        <Status value={syncStatus} />
                    </div>
                    <p className="text-xs text-muted mt-3 truncate">Última: {dateTime(lastRun?.completedAt || lastRun?.completionTime)}</p>
                </div>
            </div>

            <div className="pt-8 border-t border-line">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-ink">Impacto e Audiência</h3>
                        <p className="text-sm text-muted mt-1">Como os ciclistas interagem com o calendário.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-surface border border-line p-1.5 rounded-xl">
                        <select value={timeframe} onChange={event => setTimeframe(event.target.value)} className="bg-transparent text-sm text-ink font-medium px-3 py-1.5 focus:outline-none cursor-pointer">
                            <option value="today">Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="13m">Últimos 13 meses</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6">
                            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-6">Métricas de Engajamento</h4>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Sessões Totais</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.sessions)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Search size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Pesquisas Realizadas</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.searches)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Heart size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Favoritos Guardados</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.favoriteChanges)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Download size={16}/></div>
                                        <span className="text-sm font-medium text-ink">Exportações p/ Agenda</span>
                                    </div>
                                    <span className="font-bold text-ink">{number(analytics?.calendarExports)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Events Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">Provas Mais Procuradas</h4>
                                <span className="text-xs text-muted font-medium bg-soft px-2 py-1 rounded-md">Top 5</span>
                            </div>
                            
                            {analytics?.topEvents?.length ? (
                                <div className="flex-1 flex flex-col justify-center space-y-6">
                                    {analytics.topEvents.slice(0, 5).map((event, i) => (
                                        <TopEventCard key={event.id} title={event.title} count={event.count} max={maxEventViews} index={i} />
                                    ))}
                                </div>
                            ) : (
                                <Empty busy={busy}>Ainda não há dados de visualizações suficientes.</Empty>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
