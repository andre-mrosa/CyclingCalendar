import {randomUUID} from 'node:crypto';
import {normalizeSearch,searchUrl} from '../utils/savedSearches.js';
import {filterEvents} from '../utils/filterEvents.js';
import {mergeEvents} from '../utils/mergeEvents.js';
import {selectCalendarSources,CALENDAR_SOURCES} from './calendarSources.js';
import {filterCalendarByDate} from '../utils/calendarList.js';
import {eventsInPeriod} from '../utils/calendarPresentation.js';
import {matchesPeriod,lisbonWallClock} from '../utils/planning.js';
import {verifiedEmail} from '../utils/favoriteAlerts.js';
import {eventPath} from './eventDiscovery.js';
import {requestError} from './requestBody.js';
export const SEARCH_PATHS=['/','/nacionais','/internacionais','/regionais','/tacas','/lazer'];
export function normalizeSearchAlert(body){
    if(typeof body?.name!=='string'||!body.name.trim()||body.name.length>80||/[<>\r\n]/.test(body.name)||!SEARCH_PATHS.includes(body.path)||body.consent!==true)throw requestError(400,'Invalid search alert');
    if(body.filters?.origin||body.filters?.maxDistanceFilter||body.filters?.filterByFavorites||body.filters?.filterByAgenda)throw requestError(400,'Unsupported private filters');
    const filters=normalizeSearch(body.filters);if(!filters)throw requestError(400,'Invalid filters');
    // Distance/GPS and presentation settings are never stored for email alerts.
    delete filters.origin;delete filters.maxDistanceFilter;delete filters.viewMode;
    if(filters.pastEventsFilter==='passados')throw requestError(400,'Past-only search');
    filters.pastEventsFilter='futuros';
    return {name:body.name.trim(),path:body.path,filters,language:['pt','en','es','fr'].includes(body.language)?body.language:'pt',enabled:true};
}
export function searchMatches(events,row,now=new Date()){
    const selected=selectCalendarSources(events,row.filters.sources||CALENDAR_SOURCES);
    let result=filterEvents(mergeEvents(selected),{...row.filters,filterLeisure:row.path==='/lazer'});
    result=filterCalendarByDate(result,'futuros',lisbonWallClock(now).slice(0,10));
    result=result.filter(event=>matchesPeriod(event,row.filters.quickPeriod,now));
    return eventsInPeriod(result,row.filters.selectedMonth,row.filters.selectedDay);
}
export function planSearchAlert(events,row,now=new Date()){
    const seen=new Set(Array.isArray(row.state?.seenIds)?row.state.seenIds.filter(v=>typeof v==='string'):[]);
    const matches=searchMatches(events,row,now);
    const notices=matches.filter(event=>[event.id,...(event._allIds||[])].every(id=>!seen.has(id)));
    for(const event of matches)for(const id of [event.id,...(event._allIds||[])])seen.add(id);
    return {notices,state:{seenIds:[...seen].slice(-10000)}};
}
export function searchAlertEmail(notices,row){
    const labels={pt:['Novas provas para a tua pesquisa','provas encontradas','Gerir ou desativar estes avisos','Confirma os detalhes na fonte.'],en:['New events matching your search','events found','Manage or disable these alerts','Confirm the details at the source.'],es:['Nuevas pruebas para tu búsqueda','pruebas encontradas','Gestionar o desactivar estos avisos','Confirma los detalles en la fuente.'],fr:['Nouvelles épreuves pour votre recherche','épreuves trouvées','Gérer ou désactiver les alertes','Confirmez les détails à la source.']}[row.language]||['New events matching your search','events found','Manage alerts','Confirm details at the source.'];
    const url=searchUrl('https://www.cyclingcalendar.pt'+row.path,row.filters);
    return {subject:labels[0]+': '+row.name,text:`${row.name}\n${notices.length} ${labels[1]}\n\n`+notices.slice(0,20).map(event=>`${event.title}\n${event.date}\nhttps://www.cyclingcalendar.pt${eventPath(event)}`).join('\n\n')+`\n\n${labels[3]}\n${url}\n\n${labels[2]}: https://www.cyclingcalendar.pt/avisos`};
}
export async function processSearchAlert({db,users,row,events,send,jsonNull,now=new Date()}){
    const leaseUntil=new Date(now.getTime()+10*60000);
    const claim=await db.searchAlert.updateMany({where:{id:row.id,enabled:true,OR:[{leaseUntil:null},{leaseUntil:{lt:now}}]},data:{leaseUntil}});
    if(!claim.count)return 'busy';
    try{
        row=await db.searchAlert.findUnique({where:{id:row.id}});if(!row?.enabled)return 'disabled';
        let user;try{user=await users.getUser(row.userId);}catch(error){if(error.status===404){await db.searchAlert.deleteMany({where:{userId:row.userId}});return 'deleted';}throw error;}
        const email=verifiedEmail(user);if(!email)return 'unverified';
        let pending=row.pending;
        if(pending&&(pending.to!==email||pending.revision!==row.revision)){await db.searchAlert.update({where:{id:row.id},data:{pending:jsonNull}});pending=null;}
        if(pending&&now-new Date(pending.createdAt)>=23*3600000)return 'needs-review';
        if(!pending){
            if(row.lastSentAt&&lisbonWallClock(new Date(row.lastSentAt)).slice(0,10)===lisbonWallClock(now).slice(0,10))return 'limited';
            const plan=planSearchAlert(events,row,now);
            if(!plan.notices.length){await db.searchAlert.updateMany({where:{id:row.id,enabled:true,revision:row.revision},data:{state:plan.state}});return 'unchanged';}
            pending={id:randomUUID(),createdAt:now.toISOString(),to:email,revision:row.revision,...searchAlertEmail(plan.notices,row),state:plan.state};
            await db.searchAlert.update({where:{id:row.id},data:{pending}});
        }
        const current=await db.searchAlert.findUnique({where:{id:row.id}});
        if(!current?.enabled||current.revision!==pending.revision)return 'disabled';
        const result=await send({to:pending.to,subject:pending.subject,text:pending.text},pending.id);
        if(result.error||!result.data?.id)throw new Error('Search alert delivery failed');
        await db.searchAlert.updateMany({where:{id:row.id,enabled:true,revision:pending.revision},data:{state:pending.state,pending:jsonNull,lastSentAt:now}});
        return 'sent';
    }finally{await db.searchAlert.updateMany({where:{id:row.id,leaseUntil},data:{leaseUntil:null,checkedAt:now}});}
}
