'use client';
import {useState} from 'react';
import {useUser} from '@clerk/nextjs';
import useSWR from 'swr';
import {useTranslation} from '../i18n/useTranslation';
import {experienceText} from '../i18n/experienceCopy';
export default function EventParticipation({event}){
    const {user}=useUser(),{language}=useTranslation(),tr=key=>experienceText(language,key),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    const {data,error,mutate}=useSWR(user?['/api/planning/states',user.id]:null,async([url])=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();});
    if(!user)return <p className="text-xs text-muted mt-3">{tr('login')}</p>;
    const aliases=[event.id,...(event._allIds||[])],current=data?.states.find(row=>aliases.includes(row.eventId));
    async function change(status){setBusy(true);setMessage('');try{const r=await fetch('/api/planning/states',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:event.id,aliases,status})});if(!r.ok)throw Error();await mutate();setMessage(tr('saved'));}catch{setMessage(tr('error'));}finally{setBusy(false);}}
    return <div className="mt-3 space-y-1"><label className="block text-sm">{tr('personal')}<select className="block max-w-full rounded-lg border border-line bg-surface p-2 mt-1" value={current?.status||''} disabled={busy||!data||!!error} onChange={e=>change(e.target.value)}><option value="">{tr('none')}</option>{['interested','going','registered'].map(value=><option key={value} value={value}>{tr(value)}</option>)}</select></label><p className="text-xs text-muted">{tr('personalNote')}</p>{error&&<p role="alert" className="text-xs">{tr('error')}</p>}{message&&<p role="status" className="text-xs">{message}</p>}</div>;
}
