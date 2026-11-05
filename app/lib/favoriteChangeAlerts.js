import {randomUUID} from 'node:crypto';
import {mergeEvents} from '../utils/mergeEvents.js';
import {eventDateDisplay} from '../utils/eventDateDisplay.js';
import {isCancelled,lisbonWallClock} from '../utils/planning.js';
import {safeFavoriteIds,effectiveEditionIds} from '../utils/favoriteEditions.js';
import {eventPath} from './eventDiscovery.js';
import {originalEventUrl} from './publicEvent.js';
import {verifiedEmail} from '../utils/favoriteAlerts.js';
export async function changeFavoriteEvents(db,user,events){
    const preference=await db.favoriteEditionPreference.findUnique({where:{userId:user.id}});
    const manual=safeFavoriteIds(user.unsafeMetadata?.favorites),excluded=safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions);
    const rows=mergeEvents(events),ids=new Set([...manual,...effectiveEditionIds(rows,manual,excluded,preference?.state,preference?.follow)]);
    const selected=rows.filter(event=>[event.id,...(event._allIds||[])].some(id=>ids.has(id)));
    const present=new Set(selected.flatMap(event=>[event.id,...(event._allIds||[])]));
    // Keep the last known facts when a favorite temporarily disappears.
    return [...selected,...[...ids].filter(id=>!present.has(id)).map(id=>({id}))];
}
export function planFavoriteChanges(events,before={}){
    before=before&&typeof before==='object'?before:{};
    const state={},notices=[];
    for(const event of events){
        const checked=Date.parse(event.lastVerifiedAt),url=originalEventUrl(event.link);
        const aliases=[event.id,...(event._allIds||[])],previous=aliases.map(id=>before[id]).find(Boolean)||Object.values(before).find(row=>row?.aliases?.some(id=>aliases.includes(id)));
        if(!Number.isFinite(checked)||!url){if(previous)state[event.id]=previous;continue;}
        if(previous&&Date.parse(previous.checkedAt)>=checked){state[event.id]=previous;continue;}
        const dates=eventDateDisplay(event);
        const current={date:dates.start?dates.start+'/'+dates.end:dates.precision==='month'?dates.key:'',location:event.distrito||'',cancelled:isCancelled(event),checkedAt:event.lastVerifiedAt,aliases};
        const changes=[];
        if(previous&&Date.parse(previous.checkedAt)<checked){
            for(const field of ['date','location'])if(previous[field]&&current[field]&&previous[field]!==current[field])changes.push({field,before:previous[field],after:current[field]});
            // Absence of a cancellation word does not confirm reinstatement.
            if(current.cancelled&&previous.cancelled===false)changes.push({field:'cancelled',before:false,after:true});
        }
        if(changes.length)notices.push({title:event.title,path:eventPath(event),sourceUrl:url,changes});
        state[event.id]={...current,date:current.date||previous?.date||'',location:current.location||previous?.location||'',cancelled:current.cancelled||previous?.cancelled===true};
    }
    return {state,notices};
}
export function favoriteChangeEmail(notices,language='pt'){
    const words={pt:['Alterações nas tuas provas favoritas','Data','Local','Cancelamento','Agendada','Cancelada','Gerir ou desativar','Confirma os detalhes na fonte.'],en:['Changes to your favorite events','Date','Location','Cancellation','Scheduled','Cancelled','Manage or disable','Confirm the details at the source.'],es:['Cambios en tus pruebas favoritas','Fecha','Lugar','Cancelación','Programada','Cancelada','Gestionar o desactivar','Confirma los detalles en la fuente.'],fr:['Modifications de vos épreuves favorites','Date','Lieu','Annulation','Prévue','Annulée','Gérer ou désactiver','Confirmez les détails à la source.']}[language]||null;
    const w=words||['Changes to your favorite events','Date','Location','Cancellation','Scheduled','Cancelled','Manage or disable','Confirm details at the source.'];
    const format=(field,value)=>field==='cancelled'?(value?w[5]:w[4]):field==='date'?value.split('/').map(day=>day.split('-').reverse().join('/')).filter((v,i,a)=>!i||v!==a[0]).join(' – '):value;
    return {subject:w[0],text:notices.map(n=>`${n.title}\n`+n.changes.map(c=>`${w[{date:1,location:2,cancelled:3}[c.field]]}: ${format(c.field,c.before)} → ${format(c.field,c.after)}`).join('\n')+`\nhttps://www.cyclingcalendar.pt${n.path}\n${n.sourceUrl}`).join('\n\n')+`\n\n${w[7]}\n${w[6]}: https://www.cyclingcalendar.pt/favoritos`};
}
export async function deliverFavoriteChanges({db,users,events,row,send,jsonNull,now=new Date()}){
    const leaseUntil=new Date(now.getTime()+10*60000);
    if(!(await db.favoriteChangePreference.updateMany({where:{userId:row.userId,enabled:true,OR:[{leaseUntil:null},{leaseUntil:{lt:now}}]},data:{leaseUntil}})).count)return 'busy';
    try{
        row=await db.favoriteChangePreference.findUnique({where:{userId:row.userId}});if(!row?.enabled)return 'disabled';
        let user;try{user=await users.getUser(row.userId);}catch(e){if(e.status===404){await db.favoriteChangePreference.deleteMany({where:{userId:row.userId}});return 'deleted';}throw e;}
        const email=verifiedEmail(user);if(!email)return 'unverified';
        let pending=row.pending;
        if(pending&&(pending.to!==email||pending.revision!==row.revision)){await db.favoriteChangePreference.update({where:{userId:row.userId},data:{pending:jsonNull}});pending=null;}
        if(pending&&now-new Date(pending.createdAt)>=23*3600000)return 'needs-review';
        if(!pending){
            if(row.lastSentAt&&lisbonWallClock(new Date(row.lastSentAt)).slice(0,10)===lisbonWallClock(now).slice(0,10))return 'limited';
            const plan=planFavoriteChanges(await changeFavoriteEvents(db,user,events),row.state);
            if(!plan.notices.length){await db.favoriteChangePreference.updateMany({where:{userId:row.userId,enabled:true,revision:row.revision},data:{state:plan.state}});return 'unchanged';}
            pending={id:randomUUID(),createdAt:now.toISOString(),to:email,revision:row.revision,...favoriteChangeEmail(plan.notices,row.language),state:plan.state};
            await db.favoriteChangePreference.update({where:{userId:row.userId},data:{pending}});
        }
        const current=await db.favoriteChangePreference.findUnique({where:{userId:row.userId}});
        if(!current?.enabled||current.revision!==pending.revision)return 'disabled';
        const result=await send({to:pending.to,subject:pending.subject,text:pending.text},pending.id);
        if(result.error||!result.data?.id)throw Error('Change alert delivery failed');
        await db.favoriteChangePreference.updateMany({where:{userId:row.userId,enabled:true,revision:pending.revision},data:{state:pending.state,pending:jsonNull,lastSentAt:now}});
        return 'sent';
    }finally{await db.favoriteChangePreference.updateMany({where:{userId:row.userId,leaseUntil},data:{leaseUntil:null,checkedAt:now}});}
}
