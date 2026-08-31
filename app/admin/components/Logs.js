import { Copy, Download, Search } from 'lucide-react';
import { Button, Empty, Panel, RefreshButton, Status, dateTime, number } from './ui';
import styles from '../admin.module.css';

export default function Logs({ logs, busy, search, setSearch, level, setLevel, source, setSource, autoRefresh, setAutoRefresh, refresh, expanded, setExpanded, copied, onCopy, onClear, clearing }) {
    const exportLogs = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `cycling-calendar-logs-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Logs do sistema</h2><p>Filtre, inspecione e exporte os registos apresentados.</p></div><div className={styles.actions}><Button onClick={exportLogs} disabled={!logs.length || busy}><Download size={15} />Exportar seleção</Button><RefreshButton busy={busy} onClick={refresh} /></div></div>
        <div className={styles.toolbar}><label className={styles.search}><Search size={17} /><input aria-label="Pesquisar logs" placeholder="Pesquisar mensagem, erro ou email…" value={search} onChange={event => setSearch(event.target.value)} /></label><label className={styles.inlineField}>Nível<select value={level} onChange={event => setLevel(event.target.value)}><option value="ALL">Todos</option><option value="ERROR">Erros</option><option value="WARN">Avisos</option><option value="INFO">Informação</option></select></label><label className={styles.inlineField}>Origem<select value={source} onChange={event => setSource(event.target.value)}><option value="ALL">Todas</option>{['SCRAPER', 'CRON', 'SYSTEM', 'API'].map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div className={styles.sectionHeading}><span className={styles.muted}>{number(logs.length)} registos · até 150 por pesquisa</span><label className={styles.toggle}><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />Atualizar a cada 10 s</label></div>
        <Panel>{!logs.length ? <Empty busy={busy}>Nenhum registo corresponde aos filtros.</Empty> : <div className={styles.logList}>{logs.map(log => <article key={log.id} className={styles.logRow}><button type="button" className={styles.logToggle} aria-expanded={expanded === log.id} aria-controls={`log-${log.id}`} onClick={() => setExpanded(expanded === log.id ? null : log.id)}><span className={styles.logMeta}><Status value={log.level} /><span>{log.source}</span><time>{dateTime(log.createdAt)}</time></span><span className={styles.logMessage}>{log.message}</span><span className={styles.logDetailLabel}>{expanded === log.id ? 'Fechar detalhes −' : 'Ver detalhes +'}</span></button>{expanded === log.id && <div id={`log-${log.id}`} className={styles.logDetails}><div className={styles.sectionHeading}><span className={styles.muted}>Detalhes do registo</span><Button onClick={() => onCopy(log)}><Copy size={14} />{copied === log.id ? 'Copiado' : 'Copiar'}</Button></div><pre>{typeof log.details === 'object' && log.details !== null ? JSON.stringify(log.details, null, 2) : log.details || 'Sem detalhes adicionais.'}</pre></div>}</article>)}</div>}</Panel>
        <details className={styles.details}><summary>Manutenção do histórico</summary><div className={styles.sectionHeading}><p className={styles.muted}>A limpeza afeta o histórico do sistema, independentemente dos filtros acima. Será pedida confirmação.</p><div className={styles.actions}><Button disabled={clearing} onClick={() => onClear(false)}>Limpar com mais de 30 dias</Button><Button tone="danger" disabled={clearing} onClick={() => onClear(true)}>Eliminar todos os logs</Button></div></div></details>
    </div>;
}
