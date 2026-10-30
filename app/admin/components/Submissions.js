'use client';
import {useState} from 'react';
import useSWR from 'swr';
import {Panel,Notice,Button,Empty,dateTime} from './ui';
export default function Submissions(){
    const {data,error,mutate}=useSWR('/api/admin/submissions',async url=>{const r=await fetch(url);if(!r.ok)throw Error('Não foi possível consultar as submissões.');return r.json();});
    const [confirmed,setConfirmed]=useState({}),[notes,setNotes]=useState({}),[busy,setBusy]=useState(null),[message,setMessage]=useState('');
    async function review(row,action){setBusy(row.id);setMessage('');try{const r=await fetch('/api/admin/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,action,confirmed:!!confirmed[row.id],note:notes[row.id]||''})});if(!r.ok)throw Error();await mutate();setMessage('Revisão guardada.');}catch{setMessage('Não foi possível guardar. A submissão pode ter sido revista noutra sessão.');}finally{setBusy(null);}}
    return <Panel title="Submissões de organizadores" description="A conta tem email verificado; a representação e os factos precisam de revisão. Nada é publicado automaticamente.">
        {error&&<Notice error>{error.message}</Notice>}{message&&<Notice>{message}</Notice>}
        {!data&&!error&&<p>A consultar…</p>}{data?.submissions.length===0&&<Empty>Sem submissões.</Empty>}
        {data?.submissions.map(row=><section key={row.id} className="py-5 border-t border-line space-y-2"><strong>{row.payload.title}</strong><p>{row.organizerName||'Contacto removido'} · {row.userEmail||'Email removido'} · {dateTime(row.createdAt)}</p><p>{row.payload.start} — {row.payload.end} · {row.payload.place} · {row.payload.modality}</p><p>Escalões: {row.payload.categories.join(', ')||'Não indicados'}</p><p>{row.eventId?'Correção de: '+row.eventId:'Nova prova'}</p><a className="underline" href={row.payload.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar a referência fornecida ↗</a>
            {row.status==='PENDING'?<><label className="flex gap-2"><input type="checkbox" checked={!!confirmed[row.id]} onChange={e=>setConfirmed(old=>({...old,[row.id]:e.target.checked}))}/>Confirmei a representação, a referência e os dados factuais a publicar.</label><label className="block">Nota interna<input maxLength={1000} className="block rounded border border-line bg-surface p-2 w-full" value={notes[row.id]||''} onChange={e=>setNotes(old=>({...old,[row.id]:e.target.value}))}/></label><div className="flex flex-wrap gap-3"><Button disabled={busy===row.id||!confirmed[row.id]} onClick={()=>review(row,'approve')}>Aprovar e publicar</Button><Button disabled={busy===row.id} onClick={()=>review(row,'reject')}>Não aprovar</Button></div></>:<p>{row.status==='APPROVED'?'Aprovada':'Não aprovada'} · {row.reviewNote}</p>}
        </section>)}
    </Panel>;
}
