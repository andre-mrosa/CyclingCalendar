'use client';
import {useState,useEffect} from 'react';
import {useUser,SignInButton} from '@clerk/nextjs';
import useSWR from 'swr';
import Link from 'next/link';
import {useTranslation} from '../i18n/useTranslation';
import {trustText} from '../i18n/trustCopy';
import {RACE_TAXONOMY} from '../utils/eventClassifier';
import {SPECIFIC_CATEGORIES,categoryStatus} from '../utils/categoryEvidence';
import {translateEscalao,translateTag} from '../i18n/formatters';
import {eventDateDisplay} from '../utils/eventDateDisplay';
const initial={organizerName:'',title:'',start:'',end:'',place:'',modality:'BTT',categories:[],sourceUrl:'',eventId:'',declaration:false};
export default function OrganizerPage(){
    const {language}=useTranslation(),tr=key=>trustText(language,key),{user,isLoaded}=useUser();
    const [form,setForm]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
    useEffect(()=>{
        const id=new URLSearchParams(window.location.search).get('event');if(!id||id.length>500)return;
        let current=true;
        fetch('/api/events/'+encodeURIComponent(id)).then(r=>r.ok?r.json():null).then(data=>{if(!current||!data?.event)return;const event=data.event,dates=eventDateDisplay(event);setForm(old=>({...old,eventId:id,title:event.title,start:dates.start||'',end:dates.end||'',place:event.distrito||'',modality:event.tag||'BTT',sourceUrl:event.link,categories:categoryStatus(event).status==='published'?categoryStatus(event).labels:[]}));}).catch(()=>{});
        return()=>{current=false;};
    },[]);
    const {data,mutate}=useSWR(user?'/api/organizer/submissions':null,async url=>{const r=await fetch(url);if(!r.ok)throw Error();return r.json();});
    const set=(key,value)=>setForm(old=>({...old,[key]:value}));
    async function submit(event){event.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/api/organizer/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});if(!r.ok)throw Error();setMessage(tr('pending'));setForm(initial);mutate();}catch{setMessage(tr('error'));}finally{setBusy(false);}}
    const verified=user?.primaryEmailAddress?.verification?.status==='verified';
    return <article className="max-w-3xl mx-auto px-4 py-10 space-y-6"><h1 className="text-3xl font-bold">{tr('organizer')}</h1><p className="text-muted">{tr('organizerIntro')}</p>
        {isLoaded&&!verified?<div className="rounded-xl bg-soft p-4"><p>{tr('login')}</p>{!user&&<SignInButton mode="modal"><button type="button" className="underline mt-2">{tr('login')}</button></SignInButton>}</div>:verified?<form onSubmit={submit} className="space-y-4">
            {[['organizerName','organizerName','text'],['title','title','text'],['start','start','date'],['end','end','date'],['place','place','text'],['sourceUrl','source','url'],['eventId','eventId','text']].map(([key,label,type])=><label key={key} className="block text-sm font-medium">{tr(label)}<input className="block mt-1 w-full rounded-xl border border-line bg-surface p-3" type={type} required={!['end','eventId'].includes(key)} value={form[key]} maxLength={key==='eventId'?500:key==='sourceUrl'?2000:250} onChange={e=>set(key,e.target.value)} /></label>)}
            <label className="block">{tr('modality')}<select className="block w-full rounded-xl border border-line bg-surface p-3" value={form.modality} onChange={e=>set('modality',e.target.value)}>{RACE_TAXONOMY.flatMap(group=>[group.discipline,...group.specialities]).map(value=><option key={value} value={value}>{translateTag(value,language)}</option>)}</select></label>
            <fieldset className="rounded-xl border border-line p-4"><legend>{tr('categories')}</legend><div className="grid sm:grid-cols-2 gap-3">{SPECIFIC_CATEGORIES.map(value=><label key={value} className="flex gap-2 items-start"><input type="checkbox" checked={form.categories.includes(value)} onChange={e=>set('categories',e.target.checked?[...form.categories,value]:form.categories.filter(v=>v!==value))}/>{translateEscalao(value,language)}</label>)}</div><p className="text-xs text-muted mt-3">{tr('eligibility')}</p></fieldset>
            <label className="flex items-start gap-3"><input type="checkbox" required checked={form.declaration} onChange={e=>set('declaration',e.target.checked)}/><span>{tr('declaration')}</span></label>
            <p className="text-sm"><Link className="underline" href="/privacy-policy">{language==='pt'?'Política de privacidade':language==='es'?'Política de privacidad':language==='fr'?'Politique de confidentialité':'Privacy policy'}</Link></p>
            <button disabled={busy} className="rounded-xl bg-brand text-white px-5 py-3 font-semibold">{busy?tr('saving'):tr('submit')}</button>
        </form>:<p>{tr('saving')}</p>}
        {message&&<p role="status" className="rounded-xl bg-soft p-4">{message}</p>}
        {!!data?.submissions.length&&<section><h2 className="text-xl font-semibold mb-3">{tr('mySubmissions')}</h2><ul className="space-y-3">{data.submissions.map(row=><li key={row.id} className="border border-line rounded-xl p-3"><strong>{row.payload.title}</strong><p>{row.status==='PENDING'?tr('pending'):row.status==='APPROVED'?({pt:'Aprovada',en:'Approved',es:'Aprobada',fr:'Approuvée'}[language]):({pt:'Não aprovada',en:'Not approved',es:'No aprobada',fr:'Non approuvée'}[language])}</p></li>)}</ul></section>}
    </article>;
}
