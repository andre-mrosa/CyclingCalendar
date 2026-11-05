import { Play, RefreshCw, Clock3 } from 'lucide-react';
import { Button, Empty, Notice, Panel, RefreshButton, Status, dateTime, entries, number } from './ui';
import styles from '../admin.module.css';
import { duration } from '../../utils/adminPresentation';
import SourceRetry from './SourceRetry';
import OrganizerSources from './OrganizerSources';

const metricLabels={processed:'Verificados',created:'Criados',updated:'Atualizados',merged:'Fundidos',quarantined:'Em quarentena'};
function RunMetrics({metrics}){
 return metrics?<dl className={styles.runMetrics}>{Object.entries(metricLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{number(metrics[key])}</dd></div>)}</dl>:null;
}
function PipelineItems({title,items,sources=false,active=false}){
 return <Panel title={title} description={sources?'Resultado de cada fonte nesta execução.':'Etapas comunicadas pelo servidor.'}>
  {entries(items).length?<ul className={styles.pipelineList}>{entries(items).map(item=>{
   const total=item.coverage?.discovered,settled=total-(item.coverage?.unresolved||0),continuing=active&&total>settled;
   return <li key={item.id}>
    <div className={styles.pipelineHeading}><div><strong>{item.name||item.id}</strong><p>{item.desc}</p></div><Status value={continuing?'running':item.status}>{continuing?(item.status==='error'?'A recolher · com avisos':'A recolher'):undefined}</Status></div>
    <div className={styles.pipelineMeta}><span>{number(item.metrics?.processed??item.count)} verificados</span><span>{item.duration==null?'A aguardar resultado':duration(item.duration)}</span></div>
    {total>0&&<div className={styles.sourceProgress}><div><span>Páginas analisadas</span><strong>{number(settled)} / {number(total)}</strong></div><progress aria-label="Páginas analisadas" value={settled} max={total}/></div>}
    {item.message&&<p className={styles.pipelineMessage}>{item.message}</p>}
    <details className={styles.details}><summary>Ver contagens</summary><RunMetrics metrics={item.metrics}/></details>
   </li>;
  })}</ul>:<Empty busy={active}>{active?'A aguardar a primeira etapa…':'Sem fontes nesta execução.'}</Empty>}
 </Panel>;
}
export default function Operations({running,output,sources,steps,activeStep,elapsed,lastRun,currentRun,logs,onRun,onRefresh,onLogs,onClear,clearing,statusError}){
 const run=running?null:lastRun,displayedRun=running?currentRun:run;
 const currentSources=running||output?sources:run?.sources,currentSteps=running||output?steps:run?.steps;
 const status=running?(output?.status==='loading'?'loading':'running'):output?.status||run?.status;
 return <div className={styles.stack}>
  <SourceRetry/>
  <div className={styles.sectionHeading}><div><h2>{running?'Recolha em curso':'Estado da recolha'}</h2><p>{running?'O servidor continua a trabalhar mesmo com o navegador fechado.':'Consulta o último resultado ou inicia uma nova recolha.'}</p></div><RefreshButton onClick={onRefresh}/></div>
  {statusError&&<Notice error>{statusError}</Notice>}
  {output&&<Notice error={['error','interrupted','partial','unknown'].includes(output.status)}><Status value={output.status}/><span>{output.message}</span></Notice>}
  <div className={styles.operationsLayout}>
   <div className={styles.stack}>
    <Panel title={running?'Execução atual':'Última execução'} description={running?`Etapa: ${activeStep||'a iniciar'} · ${duration(elapsed)}`:'Contagens da última recolha registada.'} action={<Status value={status}/> }>
     {running||run?<><dl className={`${styles.runMetrics} ${styles.runDates}`}><div><dt>Início</dt><dd>{dateTime(displayedRun?.startedAt||displayedRun?.startTime)}</dd></div><div><dt>Conclusão</dt><dd>{running?'Em execução':dateTime(run?.completedAt||run?.completionTime)}</dd></div><div><dt>Duração</dt><dd>{duration(running?elapsed:run?.durationSeconds)}</dd></div><div><dt>Épocas</dt><dd>{displayedRun?.years?.join(', ')||'—'}</dd></div></dl><RunMetrics metrics={displayedRun?.metrics}/><p className={styles.footnote}>Verificados inclui provas já existentes. «—» significa contagem indisponível.</p></>:<Empty>Ainda sem resultado confirmado.</Empty>}
    </Panel>
    <PipelineItems title="Fontes desta execução" items={currentSources||run?.sources} sources active={!!running}/>
    <details className={styles.detailsCard}><summary>Etapas de processamento</summary><PipelineItems title="Processamento" items={currentSteps||run?.steps}/></details>
   </div>
   <aside className={styles.stack} aria-label="Agendamento e ações de recolha">
    <Panel title="Recolha semanal" description="FPC, Cabreira, Stop and Go, Recorde Pessoal e Apedalar.">
     <div className={styles.scheduleCard}><div className={styles.scheduleTime}><Clock3 size={19}/><span>Quarta-feira<strong>01:00 UTC</strong></span></div><p>01:00 no inverno · 02:00 no verão<br/>Portugal continental</p><p>Ano atual e seguinte.</p><Button tone="primary" disabled={!!running} onClick={()=>onRun(false)}>{running?<RefreshCw size={15} className={styles.spin}/>:<Play size={15}/>}Executar todas as fontes</Button><Button disabled={!!running} onClick={()=>onRun(false,false,'stopandgo')}><Play size={15}/>Executar apenas Stop and Go</Button>{!running&&['error','interrupted'].includes(status)&&<Button onClick={()=>onRun(false,true)}>Retomar etapas pendentes</Button>}<small>Os períodos de espera das fontes são sempre respeitados.</small></div>
    </Panel>
    <OrganizerSources/>
   </aside>
  </div>
  <details className={styles.detailsCard}><summary>Mensagens da execução</summary><Panel title="Registo da execução" description="Mensagens recentes do servidor." action={<Button onClick={onLogs}>Abrir registos</Button>}><div className={styles.runLog}>{logs.length?logs.map((log,index)=><div key={log.id||index}><time>{dateTime(log.createdAt)}</time><Status value={log.level}/><span>{log.message}</span></div>):<Empty>{running?'A aguardar mensagens…':'Consulta Registos para ver o histórico.'}</Empty>}</div></Panel></details>
  <details className={styles.detailsCard}><summary>Como funciona e manutenção</summary><div className={styles.detailsBody}><p className={styles.muted}>A recolha pode criar, atualizar ou fundir provas. Recusas de acesso não provocam tentativas imediatas; os dados anteriores são conservados. As organizações têm um agendamento mensal separado.</p><div className={styles.maintenanceAction}><Button disabled={clearing} onClick={onClear}>Limpar registos com mais de 30 dias</Button></div></div></details>
 </div>;
}
