'use client';
import {useState} from 'react';
import useSWR,{useSWRConfig} from 'swr';
import {Panel,Notice,Button,Empty,dateTime} from './ui';
export default function Submissions({onReviewed}){
    const [filter,setFilter]=useState('PENDING'),[page,setPage]=useState(1);
    const {mutate:refreshCache}=useSWRConfig();
    const {data,error,isValidating,mutate}=useSWR(`/api/admin/submissions?status=${filter}&page=${page}`,async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Não foi possível consultar as submissões.');return r.json();});
    const [confirmed,setConfirmed]=useState({}),[notes,setNotes]=useState({}),[busy,setBusy]=useState(null),[message,setMessage]=useState('');
    const rows=data?.submissions||[];
    async function review(row,action){setBusy(row.id);setMessage('');try{const r=await fetch('/api/admin/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,action,confirmed:!!confirmed[row.id],note:notes[row.id]||''})});if(!r.ok)throw Error();await Promise.all([mutate(),refreshCache('/api/admin/submissions')]);setMessage('Revisão guardada.');onReviewed?.();}catch{setMessage('Não foi possível guardar. A submissão pode ter sido revista noutra sessão.');}finally{setBusy(null);}}
    return <Panel title="Revisão de provas" description="Confirma os dados e a representação do organizador antes de publicar." action={<label className="flex items-center gap-2 text-sm">Mostrar<select className="border border-line rounded-lg bg-surface p-2" value={filter} onChange={event=>{setFilter(event.target.value);setPage(1);}}><option value="PENDING">Por rever</option><option value="APPROVED">Aprovadas</option><option value="REJECTED">Não aprovadas</option><option value="ALL">Todas</option></select></label>}>
        {error&&<Notice error>{error.message}<Button onClick={()=>mutate()}>Tentar novamente</Button></Notice>}{message&&<Notice>{message}</Notice>}
        {!data&&!error&&<Empty busy/>}{data&&rows.length===0&&<Empty>Sem submissões nesta seleção.</Empty>}
        {rows.map(row=><section key={row.id} className="p-5 border-t border-line space-y-3"><strong>{row.payload.title}</strong><p>{row.organizerName||'Contacto removido'} · {row.userEmail||'Email removido'} · {dateTime(row.createdAt)}</p><p>{row.payload.start} — {row.payload.end} · {row.payload.place} · {row.payload.modality}</p><p>Escalões: {row.payload.categories.join(', ')||'Não indicados'}</p><p>{row.eventId?'Correção de uma prova existente':'Nova prova'}</p><a className="underline" href={row.payload.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar a referência fornecida ↗</a>
            {row.status==='PENDING'?<><label className="flex gap-2"><input type="checkbox" checked={!!confirmed[row.id]} onChange={e=>setConfirmed(old=>({...old,[row.id]:e.target.checked}))}/>Confirmei a representação, a referência e os dados factuais a publicar.</label><label className="block">Nota interna<input maxLength={1000} className="block rounded border border-line bg-surface p-2 w-full" value={notes[row.id]||''} onChange={e=>setNotes(old=>({...old,[row.id]:e.target.value}))}/></label><div className="flex flex-wrap gap-3"><Button disabled={!!busy||!confirmed[row.id]} onClick={()=>review(row,'approve')}>Aprovar e publicar</Button><Button disabled={!!busy} onClick={()=>review(row,'reject')}>Não aprovar</Button></div></>:<p>{row.status==='APPROVED'?'Aprovada':'Não aprovada'} · {row.reviewNote}</p>}
        </section>)}
    {data&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5 text-xs text-muted"><span>{data.total} resultados · Página {data.page} de {data.pages}</span><div className="flex gap-2"><Button disabled={data.page<=1||isValidating} onClick={()=>setPage(data.page-1)}>Anterior</Button><Button disabled={data.page>=data.pages||isValidating} onClick={()=>setPage(data.page+1)}>Seguinte</Button></div></div>}
    </Panel>;
}
