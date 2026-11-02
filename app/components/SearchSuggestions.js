'use client';
import {useTranslation} from '../i18n/useTranslation';
import {experienceText} from '../i18n/experienceCopy';
import {searchSuggestions} from '../utils/searchSuggestions';
export default function SearchSuggestions({events,filters,context,apply}){
    const {language}=useTranslation(),tr=key=>experienceText(language,key),suggestions=searchSuggestions(events,filters,context);
    if(!suggestions.length)return null;
    return <div className="my-5 text-left"><p className="font-semibold mb-3">{tr('alternatives')}</p><ul className="flex flex-wrap gap-2">{suggestions.map(suggestion=><li key={suggestion.key}><button type="button" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" onClick={()=>apply({...filters,...suggestion.patch})}>{tr(suggestion.key)} <span className="text-muted">· {suggestion.count} {tr('results')}</span></button></li>)}</ul></div>;
}
