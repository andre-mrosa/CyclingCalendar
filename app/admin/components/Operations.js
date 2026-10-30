import { Play, RefreshCw } from 'lucide-react';
import { Button, Empty, Notice, Panel, RefreshButton, Status, dateTime, entries, number } from './ui';
import styles from '../admin.module.css';
import SourceQuality from './SourceQuality';
import Submissions from './Submissions';

const metricLabels = { processed: 'Processados', created: 'Criados', updated: 'Atualizados', merged: 'Fundidos', quarantined: 'Em quarentena' };
function RunMetrics({ metrics }) {
    if (!metrics) return null;
    return <dl className={styles.runMetrics}>{Object.entries(metricLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(metrics[key])}</dd></div>)}</dl>;
}

function PipelineItems({ title, items, sources = false }) {
    return <Panel title={title} description={sources ? 'Contagens desta execução. Processados não significa novos.' : 'Estado comunicado pelo servidor para cada etapa.'}>
        {entries(items).length ? <ul className={styles.pipelineList}>{entries(items).map(item => <li key={item.id}><div className={styles.pipelineHeading}><div><strong>{item.name || item.id}</strong><p>{item.desc}</p></div><Status value={item.status} /></div><div className={styles.pipelineMeta}><span>{number(item.metrics?.processed ?? item.count)} processados</span><span>{item.duration == null ? 'Duração não disponível' : typeof item.duration === 'number' ? `${item.duration} s` : item.duration}</span></div>{item.message && <p className={styles.muted}>{item.message}</p>}<RunMetrics metrics={item.metrics} /></li>)}</ul> : <Empty>Sem detalhe disponível.</Empty>}
    </Panel>;
}

export default function Operations({ running, output, sources, steps, activeStep, elapsed, lastRun, currentRun, logs, onRun, onRefresh, onLogs, onClear, clearing, statusError }) {

    const run = running ? null : lastRun;
    const displayedRun = running ? currentRun : run;
    const currentSources = running || output ? sources : run?.sources;
    const currentSteps = running || output ? steps : run?.steps;
    const status = running ? (output?.status === 'loading' ? 'loading' : 'running') : output?.status || run?.status;
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Operações</h2><p>Sincronização das fontes, processamento e manutenção.</p></div><RefreshButton onClick={onRefresh} /></div>
        <Panel title="Sincronizar calendário" description="Recolhe as fontes ativas, atualiza o calendário e valida os idiomas da interface." action={<Status value={status} />}>
            <div className={styles.operationAction}><div><p>O processamento pode criar, atualizar ou fundir registos existentes. O total processado não corresponde ao crescimento do calendário.</p><small className={styles.muted}>Todas as fontes: diariamente às 02:00 UTC. A FPC é consultada uma época de cada vez. As recusas de acesso não provocam novas tentativas imediatas. O controlo de qualidade assinala recolhas incompletas e alterações anormais.</small><p className={styles.muted}>Consulta o ano atual e o seguinte.</p></div><Button tone="primary" disabled={!!running} onClick={() => onRun(false)}>{running ? <RefreshCw size={16} className={styles.spin} /> : <Play size={16} />}{running ? 'Sincronização em curso' : status === 'interrupted' ? 'Executar novamente' : 'Executar sincronização'}</Button></div>
            {!running && ['error', 'interrupted'].includes(status) && <p><Button onClick={() => onRun(false, true)}>Retomar etapas pendentes</Button> <small className={styles.muted}>Continua a partir da última etapa registada, sem repetir as anteriores.</small></p>}
        </Panel>
        <SourceQuality />
        <Submissions />
        {statusError && <Notice error>{statusError}</Notice>}
        {output && <Notice error={['error', 'interrupted', 'partial', 'unknown'].includes(output.status)}><Status value={output.status} /><span>{output.message}</span></Notice>}
        <Panel title={running ? 'Execução atual' : 'Última execução'} description={running ? `Tempo decorrido: ${number(elapsed)} s · Etapa ativa: ${activeStep || 'a iniciar'}` : 'Resumo persistido pelo servidor.'} action={run && <Status value={run.status} />}>
            {running || run ? <><dl className={styles.runMetrics}><div><dt>Início</dt><dd>{dateTime(displayedRun?.startedAt || displayedRun?.startTime)}</dd></div><div><dt>Conclusão</dt><dd>{running ? 'Em execução' : dateTime(run?.completedAt || run?.completionTime)}</dd></div><div><dt>Duração</dt><dd>{number(running ? elapsed : run?.durationSeconds)} s</dd></div><div><dt>Anos abrangidos</dt><dd>{displayedRun?.years?.join(', ') || '—'}</dd></div></dl><RunMetrics metrics={displayedRun?.metrics} /><p className={styles.footnote}>— significa que a métrica não foi disponibilizada; não significa zero. Métricas de processamento e de inventário têm âmbitos diferentes.</p></> : <Empty>Ainda não há um resumo de execução disponível.</Empty>}
        </Panel>
        <div className={styles.twoColumns}><PipelineItems title="Fontes de dados" items={currentSources || run?.sources} sources /><PipelineItems title="Etapas de processamento" items={currentSteps || run?.steps} /></div>
        <Panel title="Registo da execução" description="Mensagens recentes do pipeline." action={<Button onClick={onLogs}>Abrir logs</Button>}><div className={styles.runLog}>{logs.length ? logs.map((log, index) => <div key={log.id || index}><time>{dateTime(log.createdAt)}</time><Status value={log.level} /><span>{log.message}</span></div>) : <Empty>{running ? 'A aguardar mensagens do servidor…' : 'Consulte o separador Logs para ver o histórico.'}</Empty>}</div></Panel>
        <Panel title="Manutenção de logs" description="Remove apenas registos com mais de 30 dias. A ação exige confirmação." action={<Button disabled={clearing} onClick={onClear}>Limpar logs antigos</Button>} />
    </div>;
}
