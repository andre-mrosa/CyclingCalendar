import { randomUUID } from 'node:crypto';
import { start, getRun } from 'workflow/api';
import { prisma } from '../db.js';
import { withScraperLock } from './runLock.js';
import { STOPANDGO_ACCESS_ID } from './stopandgoAccess.js';
import { stopAndGoRetryWorkflow } from '../../workflows/stopAndGoRetry.js';

export const STOPANDGO_RETRY_ID = 'operational-stopandgo-retry';
export const RETRY_DELAY_MS = 60000;
export const MAX_AUTOMATIC_RETRIES = 3;
const parse = row => row?.details ? JSON.parse(row.details) : null;
const active = value => ['pending','running'].includes(value);
const busy = () => Object.assign(new Error('Uma sincronização já está em curso.'),{code:'SCRAPER_ALREADY_RUNNING'});
const scheduledAt = gate => {
    const timestamp=Date.parse(gate?.retryAt);
    if(gate?.status!==429 || !Number.isFinite(timestamp))return null;
    return new Date(timestamp+RETRY_DELAY_MS).toISOString();
};

export function retryDependencies(overrides={}) {
    return {db:prisma,launch:start,run:getRun,now:()=>new Date(),uuid:randomUUID,lock:work=>withScraperLock(work),...overrides};
}
async function gateFor(db) {return parse(await db.systemLog.findUnique({where:{id:STOPANDGO_ACCESS_ID}}));}
async function jobFor(db) {return db.systemLog.findUnique({where:{id:STOPANDGO_RETRY_ID}});}
async function changeJob(db, row, value) {
    const result=await db.systemLog.updateMany({where:{id:STOPANDGO_RETRY_ID,details:row.details},data:{details:JSON.stringify(value)}});
    if(result.count!==1)throw busy();
    return value;
}

// A single operational row owns the retry worker. Tokens make even a lost
// launch response safe: an obsolete worker cannot start a source collection.
export async function ensureStopAndGoRetry(overrides={}) {
    const {db,launch,run,now,uuid}=retryDependencies(overrides), gate=await gateFor(db), due=scheduledAt(gate);
    if(!due)return {scheduled:false};
    const token=uuid(), value={token,status:'scheduling',scheduledAt:due,attempts:0,createdAt:now().toISOString()};
    let row=await jobFor(db);
    if(row) {
        const previous=parse(row);
        if(previous?.workflowId && ['scheduling','scheduled','running'].includes(previous.status) && active(await run(previous.workflowId).status))return {scheduled:true,...previous};
        if(!previous?.workflowId && now().getTime()-new Date(previous?.createdAt||row.createdAt).getTime()<300000)throw busy();
        await changeJob(db,row,value);
    } else {
        try {await db.systemLog.create({data:{id:STOPANDGO_RETRY_ID,source:'SYSTEM',level:'INFO',message:'Retoma automática da fonte Stop and Go',details:JSON.stringify(value),createdAt:now()}});}
        catch(error) {if(error.code==='P2002')throw busy();throw error;}
    }
    try {
        const worker=await launch(stopAndGoRetryWorkflow,[{token}]);
        row=await jobFor(db);const current=parse(row);
        // Preserve a worker which has already progressed before start() returns.
        if(current?.token===token)await changeJob(db,row,{...current,status:current.status==='scheduling'?'scheduled':current.status,workflowId:worker.runId});
        return {scheduled:true,token,workflowId:worker.runId,scheduledAt:due,status:'scheduled'};
    } catch(error) {
        // Keep ownership during an ambiguous launch failure; a retry can reclaim
        // it after five minutes, and any older worker will then lose its token.
        throw error;
    }
}

export async function getStopAndGoRetryStatus(overrides={}) {
    const {db,run,now}=retryDependencies(overrides), row=await jobFor(db), value=parse(row), gate=await gateFor(db);
    if(!value)return {status:'none',scheduledAt:scheduledAt(gate),attempts:0};
    let status=value.status;
    if(!value.workflowId&&status==='scheduling'&&now().getTime()-new Date(value.createdAt).getTime()>=300000)status='failed';
    if(value.workflowId && ['scheduling','scheduled','running'].includes(status) && !active(await run(value.workflowId).status))status='failed';
    if(gate?.status!==429&&['scheduled','scheduling','failed'].includes(status))status='cancelled';
    return {status,scheduledAt:status==='scheduled'?scheduledAt(gate)||value.scheduledAt:value.scheduledAt,attempts:value.attempts||0,limit:MAX_AUTOMATIC_RETRIES};
}

export async function planStopAndGoRetry(token,overrides={}) {
    const {db}=retryDependencies(overrides), row=await jobFor(db), value=parse(row);
    if(value?.token!==token)return {cancelled:true};
    const gate=await gateFor(db), due=scheduledAt(gate);
    if(!due)return {cancelled:true};
    return {scheduledAt:due,attempts:value.attempts||0};
}

export async function beginStopAndGoRetry(token,overrides={}) {
    const deps=retryDependencies(overrides),{db,run,now,lock}=deps;
    return lock(async()=>{
        const row=await jobFor(db), value=parse(row);
        if(value?.token!==token)return {cancelled:true};
        const gate=await gateFor(db), due=scheduledAt(gate);
        if(!due)return {cancelled:true};
        if(Date.parse(due)>now().getTime())return {waitUntil:due};
        const previous=await db.systemLog.findFirst({where:{source:'SCRAPER',message:'Workflow de sincronização agendado.'},orderBy:{createdAt:'desc'}});
        if(previous && active(await run(parse(previous).workflowId).status))throw busy();
        let options=value.status==='running'?value.options:null;
        if(!options) {
            const attempt=(value.attempts||0)+1;
            if(attempt>MAX_AUTOMATIC_RETRIES)return {exhausted:true};
            options={scope:'stopandgo',years:[now().getFullYear(),now().getFullYear()+1].map(String),runId:`${token}-retry-${attempt}`,triggeredBy:'RETOMA_AUTOMATICA_STOPANDGO',pipelineStage:'stopandgo',startedAt:now().toISOString(),startLogged:true,durable:true};
            await changeJob(db,row,{...value,status:'running',attempts:attempt,scheduledAt:due,options});
        }
        await db.systemLog.upsert({where:{id:`retry-start-${options.runId}`},create:{id:`retry-start-${options.runId}`,source:'SCRAPER',level:'INFO',message:`Iniciada sincronização stopandgo (${options.years.join(', ')}) via RETOMA_AUTOMATICA_STOPANDGO...`,details:JSON.stringify({event:'run-start',...options}),createdAt:new Date(options.startedAt)},update:{}});
        return {options};
    });
}

export async function finishStopAndGoRetry(token,retryAt,overrides={}) {
    const {db}=retryDependencies(overrides),row=await jobFor(db),value=parse(row);
    if(value?.token!==token)return {cancelled:true};
    const retry=Number.isFinite(Date.parse(retryAt)), exhausted=retry&&value.attempts>=MAX_AUTOMATIC_RETRIES;
    const next={...value,options:null,status:retry?(exhausted?'exhausted':'scheduled'):'completed',scheduledAt:retry?new Date(Date.parse(retryAt)+RETRY_DELAY_MS).toISOString():null};
    await changeJob(db,row,next);
    return {again:retry&&!exhausted,scheduledAt:next.scheduledAt};
}
