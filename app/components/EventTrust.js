'use client';
import {useTranslation} from '../i18n/useTranslation';
import {trustText} from '../i18n/trustCopy';
import {translateEscalao} from '../i18n/formatters';
import {categoryStatus} from '../utils/categoryEvidence';
export default function EventTrust({event,compact=false}){
    const {language}=useTranslation(),tr=key=>trustText(language,key),status=categoryStatus(event);
    const day=event.lastVerifiedAt?event.lastVerifiedAt.slice(0,10).split('-').reverse().join('/'):null;
    return <section className={compact?'text-xs text-muted mt-2':'rounded-2xl border border-line bg-soft p-4 space-y-2 text-sm'} aria-label={tr(status.status==='published'?'published':'unknown')}>
        <p><strong>{tr(status.status==='published'?'published':'unknown')}</strong>{status.status==='published'&&': '+status.labels.map(label=>translateEscalao(label,language)).join(' · ')}</p>
        {!compact&&<><p>{tr('eligibility')}</p>{status.status==='published'&&<a className="underline text-brand" href={status.url} target="_blank" rel="noopener noreferrer">{tr('evidence')} ↗</a>}<p>{day?`${tr('checked')}: ${day}${event.lastVerifiedSource?' · '+event.lastVerifiedSource:''}`:tr('neverChecked')}</p></>}
    </section>;
}
