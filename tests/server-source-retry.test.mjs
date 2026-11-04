import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {parseScraperStatus} from '../app/lib/admin/scraperStatus.js';
import {privateJson,sameOriginJson} from '../app/lib/requestBody.js';
const accessId='operational-stopandgo-access',jobId='operational-stopandgo-retry';
const retryAt='2026-11-04T15:04:58.423Z',due='2026-11-04T15:05:58.423Z';
async function fixture(){
 const rows=new Map([[accessId,{id:accessId,details:JSON.stringify({status:429,retryAt})}]]),runs=new Map();let timestamp=Date.parse('2026-11-04T14:45:00Z'),launches=0,sequence=0,main=null;
 const db={systemLog:{
  findUnique:async({where})=>rows.get(where.id)||null,
  findFirst:async()=>main,
  create:async({data})=>{if(rows.has(data.id))throw Object.assign(Error('duplicate'),{code:'P2002'});rows.set(data.id,structuredClone(data));return data;},
  updateMany:async({where,data})=>{const row=rows.get(where.id);if(!row||where.details!==row.details)return {count:0};rows.set(where.id,{...row,...structuredClone(data)});return {count:1};},
  upsert:async({where,create,update})=>{rows.set(where.id,rows.has(where.id)?{...rows.get(where.id),...structuredClone(update)}:structuredClone(create));return rows.get(where.id);},
 }};
 const api=await fixtureModule('../app/lib/scrapers/stopandgoRetry.js',{'../db.js':{prisma:{}},'workflow/api':{start:()=>{},getRun:()=>{}},'./runLock.js':{withScraperLock:work=>work()},'../../workflows/stopAndGoRetry.js':{stopAndGoRetryWorkflow:()=>{}}});
 const deps={db,now:()=>new Date(timestamp),uuid:()=>`token-${++sequence}`,lock:work=>work(),run:id=>({status:Promise.resolve(runs.get(id)||'completed')}),launch:async()=>{const runId='worker-'+(++launches);runs.set(runId,'pending');return {runId};}};
 return {api,deps,rows,runs,job:()=>JSON.parse(rows.get(jobId).details),time:value=>{timestamp=Date.parse(value);},main:value=>{main=value;},launches:()=>launches};
}
test('the server schedules exactly one worker for cooldown + 60 seconds and deduplicates callers',async()=>{
 const f=await fixture(),first=await f.api.ensureStopAndGoRetry(f.deps),second=await f.api.ensureStopAndGoRetry(f.deps);
 assert.equal(first.scheduledAt,due);assert.equal(first.workflowId,second.workflowId);assert.equal(f.launches(),1);
 assert.equal((await f.api.getStopAndGoRetryStatus(f.deps)).status,'scheduled');
});
test('a lost scheduling response cannot create an immediate duplicate or retain stale ownership',async()=>{
 const f=await fixture();await assert.rejects(f.api.ensureStopAndGoRetry({...f.deps,launch:async()=>{throw Error('lost response');}}),/lost response/);
 const oldToken=f.job().token;await assert.rejects(f.api.ensureStopAndGoRetry(f.deps),{code:'SCRAPER_ALREADY_RUNNING'});
 f.time('2026-11-04T14:51:00Z');await f.api.ensureStopAndGoRetry(f.deps);
 assert.notEqual(f.job().token,oldToken);assert.equal((await f.api.planStopAndGoRetry(oldToken,f.deps)).cancelled,true);
});
test('waking early or during another calendar run cannot begin source requests',async()=>{
 const f=await fixture(),job=await f.api.ensureStopAndGoRetry(f.deps);
 assert.equal((await f.api.beginStopAndGoRetry(job.token,f.deps)).waitUntil,due);
 assert.equal(f.job().attempts,0);
 f.time('2026-11-04T15:06:00Z');f.main({details:JSON.stringify({workflowId:'main'})});f.runs.set('main','running');
 await assert.rejects(f.api.beginStopAndGoRetry(job.token,f.deps),{code:'SCRAPER_ALREADY_RUNNING'});assert.equal(f.job().attempts,0);
 f.runs.set('main','completed');const started=await f.api.beginStopAndGoRetry(job.token,f.deps),again=await f.api.beginStopAndGoRetry(job.token,f.deps);
 assert.equal(started.options.scope,'stopandgo');assert.equal(started.options.pipelineStage,'stopandgo');assert.equal(started.options.runId,again.options.runId);assert.equal(f.job().attempts,1);
});
test('a renewed provider deadline moves the retry later instead of firing at the previous time',async()=>{
 const f=await fixture(),job=await f.api.ensureStopAndGoRetry(f.deps);
 f.rows.set(accessId,{details:JSON.stringify({status:429,retryAt:'2026-11-04T16:00:00Z'})});f.time('2026-11-04T15:06:00Z');
 assert.equal((await f.api.planStopAndGoRetry(job.token,f.deps)).scheduledAt,'2026-11-04T16:01:00.000Z');
 assert.equal((await f.api.beginStopAndGoRetry(job.token,f.deps)).waitUntil,'2026-11-04T16:01:00.000Z');assert.equal(f.job().attempts,0);
});
test('repeated 429 responses are rescheduled with a three-attempt bound; success completes the job',async()=>{
 const f=await fixture(),job=await f.api.ensureStopAndGoRetry(f.deps);
 for(let attempt=1;attempt<=3;attempt++){
  f.time(`2026-11-04T${14+attempt}:06:00Z`);await f.api.beginStopAndGoRetry(job.token,f.deps);
  const nextAt=`2026-11-04T${15+attempt}:04:58.423Z`;f.rows.set(accessId,{details:JSON.stringify({status:429,retryAt:nextAt})});
  const next=await f.api.finishStopAndGoRetry(job.token,nextAt,f.deps);assert.equal(next.again,attempt<3);
 }
 assert.equal(f.job().status,'exhausted');
 const done=await fixture(),scheduled=await done.api.ensureStopAndGoRetry(done.deps);done.time('2026-11-04T15:06:00Z');await done.api.beginStopAndGoRetry(scheduled.token,done.deps);await done.api.finishStopAndGoRetry(scheduled.token,null,done.deps);assert.equal(done.job().status,'completed');
});
test('authentication refusals never schedule an automatic retry and dead workers remain visible',async()=>{
 const f=await fixture();f.rows.set(accessId,{details:JSON.stringify({status:403,retryAt})});assert.equal((await f.api.ensureStopAndGoRetry(f.deps)).scheduled,false);assert.equal(f.launches(),0);
 f.rows.set(accessId,{details:JSON.stringify({status:429,retryAt})});const job=await f.api.ensureStopAndGoRetry(f.deps);f.runs.set(job.workflowId,'failed');assert.equal((await f.api.getStopAndGoRetryStatus(f.deps)).status,'failed');
});
test('a completed manual source collection cancels an obsolete scheduled retry',async()=>{
 const f=await fixture(),job=await f.api.ensureStopAndGoRetry(f.deps);
 f.rows.set(accessId,{details:JSON.stringify({status:200,retryAt:null,resolvedAt:'2026-11-04T15:05:30Z'})});
 assert.equal((await f.api.planStopAndGoRetry(job.token,f.deps)).cancelled,true);
 assert.equal((await f.api.beginStopAndGoRetry(job.token,f.deps)).cancelled,true);
 assert.equal((await f.api.getStopAndGoRetryStatus(f.deps)).status,'cancelled');assert.equal(f.job().attempts,0);
});
test('the durable retry sleeps on the server, runs only the source plan and carries block checkpoints',async()=>{
 const sleeps=[],seen=[];let plan=0;
 const workflow=await fixtureModule('../app/workflows/stopAndGoRetry.js',{'workflow':{sleep:async date=>sleeps.push(date.toISOString())},'./stopAndGoRetrySteps.js':{planSourceRetry:async()=>({scheduledAt:due}),beginSourceRetry:async()=>({options:{scope:'stopandgo',runId:'source-retry',pipelineStage:'stopandgo'}}),finishSourceRetry:async()=>({again:false})},'./calendarSteps.js':{executeCalendarStage:async options=>{seen.push(options);return ++plan===1?{nextStage:'stopandgo',sourceContinuation:{nextIndex:60},years:['2026'],nextAttempt:1}:plan===2?{nextStage:'finalize',sourceContinuation:null}:{nextStage:null};},recordCalendarFailure:async()=>assert.fail('unexpected failure')}});
 await workflow.stopAndGoRetryWorkflow({token:'one'});assert.deepEqual(sleeps,[due]);assert.deepEqual(seen.map(row=>row.pipelineStage),['stopandgo','stopandgo','finalize']);assert.equal(seen[1].sourceContinuation.nextIndex,60);
});
test('automatic source-only status never claims the other sources were recollected',()=>{
 const start={id:'start',createdAt:'2026-11-04T15:06:00Z',message:'Iniciada sincronização stopandgo',details:{event:'run-start',runId:'retry',scope:'stopandgo',years:['2026','2027']}};
 const end={id:'end',createdAt:'2026-11-04T15:07:00Z',message:'Sincronização global concluída',details:{event:'run-complete',runId:'retry',status:'success',sources:{stopandgo:{status:'done',count:2,metrics:{processed:2,created:0,updated:2,merged:0,quarantined:0}}},steps:{finalize:{status:'done',count:100}}}};
 const state=parseScraperStatus({startLog:start,completionLog:end,logs:[start,end],now:Date.parse('2026-11-04T15:08:00Z')});
 assert.deepEqual(Object.keys(state.sources),['stopandgo']);assert.equal(state.metrics.processed,2);assert.equal(state.status,'success');
});
test('the main calendar workflow schedules a refused source without waiting or delaying other sources',async()=>{
 const seen=[];let scheduled=0;
 const workflow=await fixtureModule('../app/workflows/calendarSync.js',{'./calendarSteps.js':{executeCalendarStage:async options=>{seen.push(options.pipelineStage);return seen.length===1?{sourceRetryAt:retryAt,nextStage:'recordepessoal'}:{nextStage:null,success:false};},scheduleStopAndGoRetry:async()=>{scheduled++;},recordCalendarFailure:async()=>assert.fail('unexpected failure')}});
 await workflow.calendarSyncWorkflow({pipelineStage:'stopandgo',runId:'main'});
 assert.equal(scheduled,1);assert.deepEqual(seen,['stopandgo','recordepessoal']);
});
test('retry scheduling API authorizes first and requires a same-origin JSON request',async()=>{
 let allowed=false,scheduled=0,reads=0;
 const route=await fixtureModule('../app/api/admin/scraper-retry/route.js',{'@/app/lib/auth-helpers':{requireAdmin:async()=>({authorized:allowed,status:403,error:'Denied'})},'@/app/lib/requestBody':{privateJson,sameOriginJson},'@/app/lib/scrapers/stopandgoRetry':{getStopAndGoRetryStatus:async()=>{reads++;return {status:'scheduled'};},ensureStopAndGoRetry:async()=>{scheduled++;return {scheduled:true};}}});
 const request=origin=>new Request('https://calendar.test/api/admin/scraper-retry',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:'{}'});
 assert.equal((await route.GET()).status,403);assert.equal((await route.POST(request('https://calendar.test'))).status,403);assert.equal(reads,0);assert.equal(scheduled,0);
 allowed=true;assert.equal((await route.POST(request('https://evil.test'))).status,403);assert.equal((await route.POST(request())).status,403);assert.equal(scheduled,0);
 assert.equal((await route.POST(request('https://calendar.test'))).status,200);assert.equal(scheduled,1);assert.equal((await route.GET()).headers.get('cache-control'),'private, no-store');
});
