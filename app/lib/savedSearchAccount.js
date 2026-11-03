import {normalizeSearch} from '../utils/savedSearches.js';
import {requestError} from './requestBody.js';
export function normalizeSavedEntry(entry){
    if(!entry||typeof entry.id!=='string'||!/^[\w-]{1,100}$/.test(entry.id)||typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>80||/[<>\r\n]/.test(entry.name)||!/^\/(?:nacionais|internacionais|regionais|tacas|lazer|favoritos|agenda|minhas-provas)?$/.test(entry.path))throw requestError(400,'Invalid saved search');
    const filters=normalizeSearch(entry.filters);
    if(!filters||filters.origin||filters.maxDistanceFilter)throw requestError(400,'Private location filters cannot be synced');
    return {id:entry.id,name:entry.name.trim(),path:entry.path,filters};
}
export async function storeSavedEntries(db,userId,entries,importing=false){
    if(!Array.isArray(entries)||!entries.length||entries.length>20)throw requestError(400,'Invalid entries');
    const rows=entries.map(normalizeSavedEntry);
    return db.$transaction(async tx=>{
        for(const entry of rows){
            if(importing){
                // Migration never replaces a newer account copy or a same-name search.
                if(await tx.savedSearch.findFirst({where:{userId,OR:[{id:entry.id},{name:entry.name}]}}))continue;
            }else await tx.savedSearch.deleteMany({where:{userId,name:entry.name,id:{not:entry.id}}});
            await tx.savedSearch.upsert({where:{userId_id:{userId,id:entry.id}},create:{userId,...entry},update:entry});
        }
        if(await tx.savedSearch.count({where:{userId}})>20)throw requestError(409,'Maximum twenty account searches; local copies were preserved');
        return tx.savedSearch.findMany({where:{userId},orderBy:{updatedAt:'asc'}});
    },{isolationLevel:'Serializable'});
}
