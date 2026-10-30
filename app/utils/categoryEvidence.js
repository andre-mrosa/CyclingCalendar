import {getEventCategories,publishedEventCategories} from './eventClassifier.js';
import {originalEventUrl} from '../lib/publicEvent.js';

export const SPECIFIC_CATEGORIES = Object.freeze(['Elite','Elite Amador','Sub-23','Sub-19 (Juniores)','Sub-17 (Cadetes)','Sub-15 (Juvenis)','Masters / Veteranos','Femininas','Escolas','Profissional (UCI)']);
export const specificCategories = labels => Array.isArray(labels) ? [...new Set(labels.filter(label=>SPECIFIC_CATEGORIES.includes(label)))] : [];

export function publishedCategoryEvidence(event, now = new Date()) {
    // Only explicit source fields/title evidence, never generic legacy defaults.
    const labels=specificCategories([...(event.publishedCategories || []),...publishedEventCategories(event.title || '')]);
    const url=originalEventUrl(event.link);
    if(!labels.length || !url)return null;
    return {version:1,status:'published',labels,source:event.source,url,checkedAt:now.toISOString()};
}
export function categoryStatus(event) {
    const evidence=event?.categoryEvidence;
    const labels=specificCategories(evidence?.labels);
    if(evidence?.version===1&&evidence.status==='published'&&labels.length&&originalEventUrl(evidence.url)&&Number.isFinite(Date.parse(evidence.checkedAt)))
        return {status:'published',labels,source:String(evidence.source||'').slice(0,100),url:originalEventUrl(evidence.url),checkedAt:evidence.checkedAt};
    return {status:'unknown',labels:specificCategories(getEventCategories(event || {}))};
}

export function mergeCategoryEvidence(existing, incoming, incomingSource) {
    const a=categoryStatus({categoryEvidence:existing}), b=categoryStatus({categoryEvidence:incoming});
    if(b.status==='published')return incoming;
    // A source may remove/replace its published categories. Do not retain stale
    // confirmation for that same source; another source's evidence can remain.
    if(a.status==='published'&&a.source!==incomingSource)return existing;
    return null;
}
