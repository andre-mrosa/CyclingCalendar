'use client';
import useSWR from 'swr';
import {useState} from 'react';
import {Panel,Button,dateTime,Notice,Status,Empty} from './ui';
import styles from '../admin.module.css';
const fetcher=async url=>{const response=await fetch(url);if(!response.ok)throw Error('Estado das organizações indisponível');return response.json();};
export default function OrganizerSources(){
 const {data,error,mutate}=useSWR('/api/admin/organizers',fetcher,{refreshInterval:30000});const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function start(){setBusy(true);try{const response=await fetch('/api/admin/organizers',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const value=await response.json();if(!response.ok)throw Error(value.error);setMessage('Consulta agendada. As organizações já verificadas neste mês são ignoradas.');await mutate();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <Panel title="Organizações" description="Recolha mensal · dia 1 às 05:00 UTC.">
  {error&&<Notice error>{error.message}</Notice>}{message&&<Notice>{message}</Notice>}
  {!data&&!error&&<Empty busy/>}
  {data?.sources?.map(source=><article key={source.id} className={styles.organizerSource}>
   <div className={styles.organizerHeading}><h4>{source.name}</h4><Status value={source.status==='running'?'running':source.status==='error'?'error':source.status==='not-run'?'pending':'done'}/></div>
   <p>{source.message||'Ainda sem recolha'}</p>
   <dl><div><dt>Próxima consulta</dt><dd>{dateTime(source.nextCheckAt)}</dd></div><div><dt>Última consulta</dt><dd>{dateTime(source.lastAttemptAt)}</dd></div></dl>
   {source.error&&<Notice error>{source.error}</Notice>}{source.warnings?.map(warning=><p key={warning} className={styles.warning}>{warning}</p>)}
   {source.events?.length>0&&<details><summary>{source.events.length} provas verificadas</summary><ul>{source.events.map(event=><li key={event.id}><span>{event.title}</span><small>{event.date}</small></li>)}</ul></details>}
  </article>)}
  <div className={styles.organizerAction}><Button disabled={busy} onClick={start}>{busy?'A agendar…':'Consultar organizações devidas'}</Button></div>
 </Panel>;
}
