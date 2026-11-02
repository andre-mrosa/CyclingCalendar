'use client';
import {useState} from 'react';
import {useParticipationStates,participationFor} from '../hooks/useParticipationStates';
import {useTranslation} from '../i18n/useTranslation';
import {experienceText} from '../i18n/experienceCopy';
import {AlertCircle,LoaderCircle} from 'lucide-react';
import styles from './favoritePlanning.module.css';
export default function EventParticipation({event}){
    const {user,data,states,error,mutate}=useParticipationStates(),{language,t}=useTranslation(),tr=key=>experienceText(language,key),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    if(!user)return null;
    const aliases=[event.id,...(event._allIds||[])],current=participationFor(event,states);
    async function change(status){setBusy(true);setMessage('');try{const r=await fetch('/api/planning/states',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:event.id,aliases,status})});if(!r.ok)throw Error();await mutate();setMessage('saved');}catch{setMessage('error');}finally{setBusy(false);}}
    return <span className={styles.participation} data-active={!!current?.status} onClick={e=>e.stopPropagation()}>
        <select className={styles.participationSelect} aria-label={`${tr('personal')}: ${event.title}`} title={tr('personal')} value={current?.status||''} disabled={busy||!data||!!error} onChange={e=>change(e.target.value)}><option value="">{tr('none')}</option>{['interested','going','registered'].map(value=><option key={value} value={value}>{tr(value)}</option>)}</select>
        {busy&&<LoaderCircle size={12} className={styles.participationSaving} aria-hidden="true"/>}
        {(error||message==='error')&&<button type="button" className={styles.participationRetry} title={tr('error')} aria-label={`${t('btn_try_again')}: ${event.title}`} onClick={()=>{setMessage('');mutate();}}><AlertCircle size={15} aria-hidden="true"/></button>}
        <span role={error||message==='error'?'alert':'status'} className="sr-only">{error?tr('error'):message?tr(message):''}</span>
    </span>;
}
