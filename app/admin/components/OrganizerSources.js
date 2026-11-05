'use client';
import useSWR from 'swr';
import {useState} from 'react';
import {Panel,Button,dateTime,Notice} from './ui';
const fetcher=async url=>{const response=await fetch(url);if(!response.ok)throw Error('Estado das organizações indisponível');return response.json();};
export default function OrganizerSources(){
 const {data,error,mutate}=useSWR('/api/admin/organizers',fetcher,{refreshInterval:30000});const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function start(){setBusy(true);try{const response=await fetch('/api/admin/organizers',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const value=await response.json();if(!response.ok)throw Error(value.error);setMessage('Consulta agendada. Organizações já consultadas neste mês são ignoradas.');await mutate();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <Panel title="Organizações · recolha mensal" description="MQ Series e Bairrada 150. Consulta no dia 1; não fazem parte da recolha diária." action={<Button disabled={busy} onClick={start}>Consultar organizações devidas</Button>}>
  {error&&<Notice error>{error.message}</Notice>}{message&&<p role="status">{message}</p>}
  {data?.sources?.map(source=><div key={source.id} className="py-4 border-b border-line"><strong>{source.name}</strong><p>{source.status==='not-run'?'Ainda sem recolha':source.status==='running'?'Consulta em curso':source.message}</p><p className="text-sm text-muted">Última consulta: {dateTime(source.lastAttemptAt)} · Último sucesso: {dateTime(source.lastSuccessAt)} · Próxima: {dateTime(source.nextCheckAt)}</p>{source.error&&<p role="alert">{source.error}</p>}{source.warnings?.map(warning=><p key={warning}>{warning}</p>)}{source.events?.map(event=><p key={event.id} className="text-sm">{event.title} · {event.date}</p>)}</div>)}
 </Panel>;
}
