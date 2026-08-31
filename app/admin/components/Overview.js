import { ArrowUpRight } from 'lucide-react';
import { Button, Empty, Metric, Panel, RefreshButton, Status, dateTime, number } from './ui';
import styles from '../admin.module.css';

function Ranking({ title, rows = [], labelKey, countKey = 'count', unit = 'sessões' }) {
    const max = Math.max(1, ...rows.map(row => row[countKey] || 0));
    return <Panel title={title} description={unit}>{rows.length ? <ol className={styles.ranking}>{rows.map((row, index) => <li key={index}><div><span>{row[labelKey] || 'Desconhecido'}{row.city && row.country ? ` · ${row.country}` : ''}</span><strong>{number(row[countKey])}</strong></div><div className={styles.bar}><span style={{ width: `${Math.max(0, (row[countKey] || 0) / max * 100)}%` }} /></div></li>)}</ol> : <Empty>Sem atividade neste período.</Empty>}</Panel>;
}

export default function Overview({ stats, busy, refreshing, timeframe, setTimeframe, autoRefresh, setAutoRefresh, refresh, navigate, pendingDeletions, lastRun, running }) {
    const analytics = stats?.analytics;
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Visão geral</h2><p>Uma leitura rápida do calendário e da sua audiência.</p></div><RefreshButton busy={busy || refreshing} onClick={refresh} /></div>
        <div className={styles.overviewSummary}>
            <div><span className={styles.eyebrow}>Calendário publicado</span><strong>{number(stats?.events?.total)} <small>provas únicas</small></strong><p>{number(stats?.events?.upcoming)} próximas · {number(stats?.events?.quarantined)} em quarentena</p><Button onClick={() => navigate('inventory')}>Explorar inventário <ArrowUpRight size={15} /></Button></div>
            <div><span className={styles.eyebrow}>Última sincronização</span><Status value={running ? 'running' : lastRun?.status} /><p>{running ? 'Acompanhe as fontes e etapas em tempo real.' : lastRun ? dateTime(lastRun.completedAt || lastRun.completionTime) : 'Ainda sem resumo disponível.'}</p><Button onClick={() => navigate('operations')}>Ver operações <ArrowUpRight size={15} /></Button></div>
            <div><span className={styles.eyebrow}>A acompanhar</span><p><strong>{number(pendingDeletions)}</strong> pedidos de eliminação</p><p><strong>{number(stats?.logs?.errors)}</strong> erros nos logs</p><div className={styles.actions}><Button onClick={() => navigate('users')}>Utilizadores</Button><Button onClick={() => navigate('logs')}>Logs</Button></div></div>
        </div>
        <div className={styles.sectionHeading}><div><h2>Audiência e atividade</h2><p>Tráfego de administradores excluído. O período aplica-se à audiência.</p></div><div className={styles.actions}><label className={styles.toggle}><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />Atualizar a cada 15 s</label><label className={styles.inlineField}>Período<select value={timeframe} onChange={event => setTimeframe(event.target.value)}><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="all">Todo o período</option></select></label></div></div>
        <div className={styles.metrics}>
            <Metric label="Visitantes únicos" value={analytics?.uniqueVisitors} note="Dispositivos distintos" />
            <Metric label="Visualizações" value={analytics?.totalPageViews} note={`${number(analytics?.totalSessions)} sessões`} />
            <Metric label="Tempo médio" value={analytics?.avgDurationFormatted} note="Duração por sessão" />
            <Metric label="Interações" value={analytics?.totalEvents} note="Provas, pesquisas e favoritos" />
        </div>
        {!analytics && <Empty busy={busy}>Não foi possível obter a audiência. Tente atualizar.</Empty>}
        <div className={styles.twoColumns}><Ranking title="Principais cidades" rows={analytics?.cities} labelKey="city" /><Ranking title="Países" rows={analytics?.countries} labelKey="country" /></div>
        <div className={styles.threeColumns}><Ranking title="Provas mais consultadas" rows={analytics?.topEvents} labelKey="title" countKey="clicks" unit="Cliques em provas" /><Ranking title="Pesquisas frequentes" rows={analytics?.topSearches} labelKey="query" unit="Pesquisas" /><Ranking title="Páginas mais visitadas" rows={analytics?.topPages} labelKey="path" countKey="views" unit="Visualizações" /></div>
        <details className={styles.details}><summary>Tecnologia e sessões recentes</summary><div className={styles.stack}>
            <div className={styles.threeColumns}><Ranking title="Dispositivos" rows={analytics?.devices} labelKey="device" /><Ranking title="Navegadores" rows={analytics?.browsers} labelKey="browser" /><Ranking title="Sistemas operativos" rows={analytics?.os} labelKey="os" /></div>
            <Panel title="Sessões recentes" description="Últimas sessões registadas, independentemente do período selecionado.">{analytics?.recentSessions?.length ? <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Localização</th><th>Dispositivo</th><th>Navegador / sistema</th><th>Páginas</th><th>Última atividade</th></tr></thead><tbody>{analytics.recentSessions.map(session => <tr key={session.id}><td>{session.city || '—'} · {session.country || '—'}</td><td>{session.device}</td><td>{session.browser} / {session.os}</td><td>{number(session.pageViewsCount)}</td><td>{dateTime(session.lastActiveAt)}</td></tr>)}</tbody></table></div> : <Empty>Sem sessões recentes.</Empty>}</Panel>
        </div></details>
        <Panel title="Atividade do sistema" action={<Button onClick={() => navigate('logs')}>Ver todos os logs <ArrowUpRight size={15} /></Button>}>{stats?.logs?.recent?.length ? <ul className={styles.activityList}>{stats.logs.recent.slice(0, 4).map(log => <li key={log.id}><Status value={log.level} /><div><p>{log.message}</p><small>{log.source} · {dateTime(log.createdAt)}</small></div></li>)}</ul> : <Empty>Sem registos recentes.</Empty>}</Panel>
    </div>;
}
