'use client';
import {useState} from 'react';
import {useUser} from '@clerk/nextjs';
import useSWR from 'swr';
import {useTranslation} from '../i18n/useTranslation';
import {experienceText} from '../i18n/experienceCopy';
import styles from './favoritePlanning.module.css';
export default function FavoriteChangeControls(){
    const {user}=useUser(),{language}=useTranslation(),tr=key=>experienceText(language,key),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    const {data,error,mutate}=useSWR(user?['/api/alerts/changes',user.id]:null,async([url])=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();});
    async function change(enabled){setBusy(true);setMessage('');try{const r=await fetch('/api/alerts/changes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled,consent,language})});if(!r.ok)throw Error();await mutate(await r.json(),false);setConsent(false);setMessage(tr('saved'));}catch{setMessage(tr('error'));}finally{setBusy(false);}}
    return <section className={styles.panel}><h2>{tr('changes')}</h2><p>{tr('changeNote')}</p>{!user?<p>{tr('login')}</p>:<>{error&&<p role="alert">{tr('error')}</p>}{data&&!data.available&&<p>{tr('unavailable')}</p>}{data?.needsReview&&<p role="alert">{tr('review')}</p>}{data?.enabled?<><p>{tr('enabled')}</p><button type="button" disabled={busy} onClick={()=>change(false)}>{tr('disable')}</button></>:<><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{tr('changeConsent')}</label><button className="mt-3" type="button" disabled={busy||!consent||!data?.available} onClick={()=>change(true)}>{tr('enable')}</button></>}</>}{message&&<p role="status">{message}</p>}</section>;
}
