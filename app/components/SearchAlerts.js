'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {useUser} from '@clerk/nextjs';
import useSWR from 'swr';
import {useTranslation} from '../i18n/useTranslation';
import {trustText} from '../i18n/trustCopy';
import {searchUrl} from '../utils/savedSearches';
const paths=['/','/nacionais','/internacionais','/regionais','/tacas','/lazer'];
export default function SearchAlerts({filters,apply}){
    const {user}=useUser(),path=usePathname(),{language}=useTranslation(),tr=key=>trustText(language,key);
    const [name,setName]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    const {data,error,mutate}=useSWR(user?['/api/alerts/searches',user.id]:null,async([url])=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();return r.json();});
    async function change(method,body){setBusy(true);setMessage('');try{const r=await fetch('/api/alerts/searches',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error();await mutate();setMessage(tr('saved'));return true;}catch{setMessage(tr('error'));return false;}finally{setBusy(false);}}
    const supported=paths.includes(path)&&!filters.origin&&!filters.maxDistanceFilter&&filters.pastEventsFilter!=='passados';
    return <section id="search-alerts" className="mt-6 pt-5 border-t border-line space-y-3"><h3 className="font-semibold">{tr('alerts')}</h3><p className="text-sm text-muted">{tr('alertNote')}</p>
        {!user?<p>{tr('login')}</p>:<>
            {error&&<p role="alert">{tr('error')}</p>}{data&&!data.available&&<p>{tr('unavailable')}</p>}
            {!supported?<p>{tr('searchUnsupported')}</p>:<div className="space-y-3"><label className="block">{tr('alertName')}<input className="block w-full rounded-lg border border-line bg-surface p-2 mt-1" value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label><label className="flex gap-2 items-start"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{tr('emailConsent')}</label><button type="button" className="rounded-lg border border-line px-3 py-2" disabled={busy||!consent||!name.trim()||!data?.available||(data?.alerts.length||0)>=10} onClick={async()=>{if(await change('POST',{name,path,filters,consent,language})){setName('');setConsent(false);}}}>{busy?tr('saving'):tr('enableAlert')}</button></div>}
            {data?.alerts.length===0&&<p>{tr('noAlerts')}</p>}
            <ul className="space-y-3">{data?.alerts.map(alert=><li key={alert.id} className="rounded-lg border border-line p-3"><strong>{alert.name}</strong><span className="text-xs ml-2">{tr(alert.enabled?'enabled':'paused')}</span><div className="flex flex-wrap gap-3 mt-2"><button type="button" className="underline" onClick={()=>{if(alert.path===path)apply(alert.filters);else if(paths.includes(alert.path))window.location.assign(searchUrl(new URL(alert.path,window.location.origin),alert.filters));}}>{({pt:'Ver filtros',en:'View filters',es:'Ver filtros',fr:'Voir les filtres'})[language]}</button><button type="button" className="underline" disabled={busy||(!alert.enabled&&!data.available)} onClick={()=>change('PUT',{id:alert.id,enabled:!alert.enabled,consent:true})}>{tr(alert.enabled?'pause':'resume')}</button><button type="button" className="underline" disabled={busy} onClick={()=>change('DELETE',{id:alert.id})}>{tr('remove')}</button></div></li>)}</ul>
        </>}
        {message&&<p role="status">{message}</p>}
    </section>;
}
