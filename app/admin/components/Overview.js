import { ArrowUpRight } from 'lucide-react';
import { Button, Empty, Metric, Panel, RefreshButton, Status, dateTime, number } from './ui';
import styles from '../admin.module.css';

function Ranking({ title, rows = [], labelKey, description }) {
    const max = Math.max(1, ...rows.map(row => row.count || 0));
    return <Panel title={title} description={description}>{rows.length ? <ol className={styles.ranking}>{rows.slice(0, 5).map((row, index) => <li key={row.id || row[labelKey] || index}><div><span>{row.title || row[labelKey] || 'Desconhecido'}</span><strong>{number(row.count)}</strong></div><div className={styles.bar}><span style={{ width: `${Math.max(0, row.count / max * 100)}%` }} /></div></li>)}</ol> : <Empty>Sem atividade registada neste período.</Empty>}</Panel>;
}

export default function Overview({ stats, busy, refreshing, timeframe, setTimeframe, autoRefresh, setAutoRefresh, refresh, navigate, pendingDeletions, lastRun, running }) {
    const analytics = stats?.analytics;
    const syncStatus = running ? 'running' : lastRun?.status || 'unknown';

    return <div className={styles.stack}>
        <div className={styles.sectionHeading}>
            <div><h2>Resumo</h2><p>O essencial sobre o calendário, as sincronizações e a utilização do site.</p></div>
            <RefreshButton busy={busy || refreshing} onClick={refresh} />
        </div>

        <div className={styles.metrics}>
            <Metric label="Provas publicadas" value={stats?.events?.total} note={`${number(stats?.events?.quarantined)} em quarentena`} />
            <Metric label="Próximas provas" value={stats?.events?.upcoming} note="No calendário publicado" />
            <Metric label="Contas" value={stats?.users?.total} note={`${number(pendingDeletions)} pedidos de eliminação`} />
            <Metric label="Erros" value={stats?.logs?.errors} note="Registos de erro do sistema" accent={stats?.logs?.errors > 0} />
        </div>

        <Panel title="Última sincronização" description={running ? 'A recolha está a decorrer no servidor.' : lastRun ? `Terminou ${dateTime(lastRun.completedAt || lastRun.completionTime)}.` : 'Ainda não há um resumo de execução disponível.'} action={<Button onClick={() => navigate('operations')}>Abrir sincronização <ArrowUpRight size={15} /></Button>}>
            <div className={styles.operationAction}><Status value={syncStatus} /><span className={styles.muted}>{running ? 'A consultar o estado automaticamente.' : 'A sincronização automática segue o horário configurado.'}</span></div>
        </Panel>

        <div className={styles.sectionHeading}>
            <div><h2>Utilização do calendário</h2><p>Contagens agregadas, apenas de pessoas que aceitaram estatísticas. Sem IDs de visitante, pesquisas, localização ou dispositivo.</p></div>
            <div className={styles.actions}>
                <label className={styles.toggle}><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />Atualizar a cada minuto</label>
                <label className={styles.inlineField}>Período<select value={timeframe} onChange={event => setTimeframe(event.target.value)}><option value="today">Hoje</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="13m">13 meses</option></select></label>
            </div>
        </div>

        <div className={`${styles.metrics} ${styles.threeMetrics}`}>
            <Metric label="Sessões" value={analytics?.sessions} note="Visitas iniciadas após consentimento" />
            <Metric label="Páginas vistas" value={analytics?.pageViews} note="Navegação em páginas públicas" />
            <Metric label="Ações" value={analytics?.interactions} note="Pesquisas, favoritos, exportações e provas abertas" />
        </div>

        <div className={styles.twoColumns}>
            <Ranking title="Páginas mais vistas" rows={analytics?.topPages} labelKey="path" description="Contagens de páginas públicas" />
            <Ranking title="Provas mais abertas" rows={analytics?.topEvents} labelKey="title" description="Aberturas de ligações para as páginas originais" />
        </div>

        <details className={styles.details}><summary>Ver divisão das ações</summary><dl className={styles.definitionList}>
            <div><dt>Pesquisas (sem guardar os termos)</dt><dd>{number(analytics?.searches)}</dd></div>
            <div><dt>Favoritos alterados</dt><dd>{number(analytics?.favoriteChanges)}</dd></div>
            <div><dt>Exportações de calendário</dt><dd>{number(analytics?.calendarExports)}</dd></div>
        </dl></details>
    </div>;
}
