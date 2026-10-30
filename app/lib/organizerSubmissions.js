import {originalEventUrl} from './publicEvent.js';
import {RACE_TAXONOMY} from '../utils/eventClassifier.js';
import {specificCategories} from '../utils/categoryEvidence.js';
import {detectRaceDate} from '../utils/detectRaceDate.js';
import {getAmbito} from './scrapers/utils.js';
import {mergeSources} from './merging/eventMerger.js';
import {requestError} from './requestBody.js';
import {Prisma} from '@prisma/client';
const text=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max&&!/[<>\r\n]/.test(value)?value.trim():null;
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null;
export function normalizeSubmission(body){
    if(!body||body.declaration!==true)throw requestError(400,'Declaration required');
    const title=text(body.title,3,250),place=text(body.place,2,120),organizerName=text(body.organizerName,2,160),sourceUrl=originalEventUrl(body.sourceUrl);
    const start=iso(body.start),end=iso(body.end||body.start);
    const disciplines=RACE_TAXONOMY.flatMap(group=>[group.discipline,...group.specialities]);
    if(!title||!place||!organizerName||!sourceUrl||!start||!end||end<start||Date.parse(end)-Date.parse(start)>31*86400000||!disciplines.includes(body.modality))throw requestError(400,'Invalid factual data');
    if(!Array.isArray(body.categories)||body.categories.length>15||specificCategories(body.categories).length!==body.categories.length)throw requestError(400,'Invalid categories');
    const eventId=body.eventId?text(body.eventId,1,500):null;if(body.eventId&&!eventId)throw requestError(400,'Invalid event ID');
    return {organizerName,eventId,payload:{title,place,sourceUrl,start,end,modality:body.modality,categories:body.categories,declaration:true}};
}
export async function reviewSubmission(db,{id,action,note,confirmed}){
    if(!['approve','reject'].includes(action)||typeof id!=='string'||typeof note!=='string'||note.length>1000||(action==='approve'&&confirmed!==true))throw requestError(400,'Invalid review');
    return db.$transaction(async tx=>{
        const row=await tx.organizerSubmission.findUnique({where:{id}});
        if(!row||row.status!=='PENDING')throw requestError(409,'Submission no longer pending');
        const claim=await tx.organizerSubmission.updateMany({where:{id,status:'PENDING'},data:{status:action==='approve'?'APPROVED':'REJECTED',reviewNote:note,reviewedAt:new Date()}});
        if(!claim.count)throw requestError(409,'Submission changed');
        if(action==='reject')return {status:'REJECTED'};
        // Validate again at publication time; never trust arbitrary JSON in storage.
        const normalized=normalizeSubmission({...row.payload,organizerName:row.organizerName,eventId:row.eventId});
        const p=normalized.payload,now=new Date();
        const format=day=>{const [y,m,d]=day.split('-');return `${d} ${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(m)-1]} ${y}`;};
        const date=format(p.start)+(p.end!==p.start?' a '+format(p.end):'');
        if(!detectRaceDate({date}))throw requestError(400,'Invalid dates');
        const data={title:p.title,date,sortDate:new Date(p.start+'T00:00:00Z'),details:p.place,regiao:p.place,distrito:p.place,tag:p.modality,ambito:getAmbito(p.title,'',p.modality,'Organizador')||null,escaloes:JSON.stringify(p.categories),link:p.sourceUrl,lastVerifiedAt:now,lastVerifiedSource:'Organizador',
            categoryEvidence:p.categories.length?{version:1,status:'published',labels:p.categories,source:'Organizador',url:p.sourceUrl,checkedAt:now.toISOString()}:Prisma.DbNull};
        let event;
        if(row.eventId){
            const existing=await tx.event.findUnique({where:{id:row.eventId}});
            if(!existing||existing.source.includes('Quarentena'))throw requestError(409,'Target event unavailable');
            event=await tx.event.update({where:{id:existing.id},data:{...data,source:mergeSources(existing.source,'Organizador')}});
        }else event=await tx.event.create({data:{id:'organizer-'+row.id,...data,source:'Organizador'}});
        await tx.organizerSubmission.update({where:{id},data:{eventId:event.id}});
        return {status:'APPROVED',eventId:event.id};
    });
}
