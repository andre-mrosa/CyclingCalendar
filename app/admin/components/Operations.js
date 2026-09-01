import { useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { Button, Empty, Notice, Panel, RefreshButton, Status, dateTime, entries, number } from './ui';
import styles from '../admin.module.css';

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
    const [fullHistorical, setFullHistorical] = useState(false);
    const run = running ? null : lastRun;
    const displayedRun = running ? currentRun : run;
    const currentSources = running || output ? sources : run?.sources;
    const currentSteps = running || output ? steps : run?.steps;
    const status = running ? (output?.status === 'loading' ? 'loading' : 'running') : output?.status || run?.status;
    return <div className={styles.stack}>
        <div className={styles.sectionHeading}><div><h2>Operações</h2><p>Sincronização das fontes, processamento e manutenção.</p></div><RefreshButton onClick={onRefresh} /></div>
        <Panel title="Sincronizar calendário" description="Recolhe as fontes configuradas, enriquece os dados e cruza provas de várias origens." action={<Status value={status} />}>
            <div className={styles.operationAction}><div><p>O processamento pode criar, atualizar ou fundir registos existentes. O total processado não corresponde ao crescimento do calendário.</p><small className={styles.muted}>Cabreira, Stop and Go e Classificações: diariamente às 02:00 UTC. FPC: domingos às 01:00 UTC, uma época de cada vez. Os pedidos FPC são sequenciais e repetidos até 3 vezes antes de ficarem pendentes para a execução seguinte.</small><div className={styles.historyOption}><label className={styles.toggle}><input type="checkbox" checked={fullHistorical} disabled={!!running} onChange={event => setFullHistorical(event.target.checked)} />Incluir os dois anos anteriores</label><small className={styles.muted}>Desativado: consulta o ano atual e o seguinte.</small></div></div><Button tone="primary" disabled={!!running} onClick={() => onRun(fullHistorical)}>{running ? <RefreshCw size={16} className={styles.spin} /> : <Play size={16} />}{running ? 'Sincronização em curso' : status === 'interrupted' ? 'Executar novamente' : 'Executar sincronização'}</Button></div>
        </Panel>
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
