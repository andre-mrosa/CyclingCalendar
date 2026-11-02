'use client';
import {useState} from 'react';
import {useUser} from '@clerk/nextjs';
import useSWR from 'swr';
import {useTranslation} from '../i18n/useTranslation';
import {experienceText} from '../i18n/experienceCopy';
import {AlertCircle,LoaderCircle} from 'lucide-react';
import styles from './favoritePlanning.module.css';
export default function EventParticipation({event}){
    const {user}=useUser(),{language,t}=useTranslation(),tr=key=>experienceText(language,key),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    const {data,error,mutate}=useSWR(user?['/api/planning/states',user.id]:null,async([url])=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();const body=await r.json();if(!Array.isArray(body.states))throw Error();return body;});
    if(!user)return null;
    const aliases=[event.id,...(event._allIds||[])],current=data?.states.find(row=>aliases.includes(row.eventId));
    async function change(status){setBusy(true);setMessage('');try{const r=await fetch('/api/planning/states',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:event.id,aliases,status})});if(!r.ok)throw Error();await mutate();setMessage('saved');}catch{setMessage('error');}finally{setBusy(false);}}
    return <span className={styles.participation} data-active={!!current?.status} onClick={e=>e.stopPropagation()}>
        <select className={styles.participationSelect} aria-label={`${tr('personal')}: ${event.title}`} title={tr('personal')} value={current?.status||''} disabled={busy||!data||!!error} onChange={e=>change(e.target.value)}><option value="">{tr('none')}</option>{['interested','going','registered'].map(value=><option key={value} value={value}>{tr(value)}</option>)}</select>
        {busy&&<LoaderCircle size={12} className={styles.participationSaving} aria-hidden="true"/>}
        {(error||message==='error')&&<button type="button" className={styles.participationRetry} title={tr('error')} aria-label={`${t('btn_try_again')}: ${event.title}`} onClick={()=>{setMessage('');mutate();}}><AlertCircle size={15} aria-hidden="true"/></button>}
        <span role={error||message==='error'?'alert':'status'} className="sr-only">{error?tr('error'):message?tr(message):''}</span>
    </span>;
}
