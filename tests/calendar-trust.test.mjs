import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedCategoryEvidence,categoryStatus,mergeCategoryEvidence} from '../app/utils/categoryEvidence.js';
import {filterEvents} from '../app/utils/filterEvents.js';
import {toPublicEvent} from '../app/lib/publicEvent.js';
import {regulationCategories,categoryOptions} from '../app/lib/scrapers/publishedCategories.js';
import {normalizeSearch} from '../app/utils/savedSearches.js';
import {suggestEscalao} from '../app/utils/suggestEscalao.js';
import {sourceQualityMetrics,qualityIssues} from '../app/lib/sourceQuality.js';
import {normalizeSubmission,reviewSubmission} from '../app/lib/organizerSubmissions.js';
import {normalizeSearchAlert,planSearchAlert,processSearchAlert} from '../app/lib/searchAlerts.js';
import {fixtureModule} from './fixtureModule.mjs';
import {trustCopy,trustText} from '../app/i18n/trustCopy.js';
import {Prisma} from '@prisma/client';
const now=new Date('2026-10-30T10:00:00Z');
const race={id:'race',title:'Prova BTT Masters',date:'15 NOV 2026',sortDate:'2026-11-15T00:00:00Z',source:'FPC',link:'https://www.fpciclismo.pt/pagina/prova',tag:'BTT',escaloes:['Masters / Veteranos']};
const evidence=publishedCategoryEvidence(race,now);

test('generic and legacy labels are unconfirmed; explicit facts carry a safe source and date',()=>{
 assert.equal(categoryStatus({...race,escaloes:['Todos (Aberto)']}).status,'unknown');
 assert.equal(categoryStatus({...race,categoryEvidence:evidence}).status,'published');
 assert.equal(categoryStatus({...race,categoryEvidence:{...evidence,url:'javascript:alert(1)'}}).status,'unknown');
 assert.equal(publishedCategoryEvidence({...race,title:'Prova BTT',escaloes:['Masters / Veteranos']},now),null);
 assert.equal(mergeCategoryEvidence(evidence,null,'FPC'),null);
 assert.deepEqual(mergeCategoryEvidence(evidence,null,'Cabreira'),evidence);
});

test('age filtering is tolerant by default and strict only on request, retaining other filters',()=>{
 const known={...race,categoryEvidence:evidence},unknown={...race,id:'unknown',title:'Prova BTT',categoryEvidence:null},junior={...known,id:'junior',categoryEvidence:{...evidence,labels:['Sub-19 (Juniores)']}};
 const rows=[known,unknown,junior];
 assert.deepEqual(filterEvents(rows,{selectedEscaloes:['Masters / Veteranos']}).map(e=>e.id),['race','unknown']);
 assert.deepEqual(filterEvents(rows,{selectedEscaloes:['Masters / Veteranos'],includeUnknownCategories:false}).map(e=>e.id),['race']);
 assert.equal(filterEvents(rows,{selectedEscaloes:['Masters / Veteranos'],searchTerm:'missing'}).length,0);
 assert.equal(normalizeSearch({includeUnknownCategories:false}).includeUnknownCategories,false);
});

test('published evidence and source check survive the minimal public projection without private data',()=>{
 const event=toPublicEvent({...race,categoryEvidence:evidence,lastVerifiedAt:now,lastVerifiedSource:'FPC',userEmail:'private@example.test',description:'Copied text'});
 assert.deepEqual(event.categoryEvidence.labels,['Masters / Veteranos']);
 assert.equal(event.lastVerifiedAt,now.toISOString());assert.equal(event.lastVerifiedSource,'FPC');
 assert.equal(event.userEmail,undefined);assert.equal(event.description,undefined);
 assert.deepEqual(toPublicEvent(event).categoryEvidence,event.categoryEvidence);
});

test('category extraction uses explicit headings/options, not incidental mentions elsewhere',()=>{
 assert.deepEqual(regulationCategories('<p>Elite is mentioned in marketing.</p>'),[]);
 assert.deepEqual(regulationCategories('<h3>Escalões</h3><p>Juniores e Masters</p><h3>Segurança</h3><p>Elite</p>'),['Sub-19 (Juniores)','Masters / Veteranos']);
 assert.deepEqual(categoryOptions('<select name="escalao"><option>Sub-17</option></select><p>Elite</p>'),['Sub-17 (Cadetes)']);
});

test('gender no longer replaces the age suggestion',()=>{
 assert.equal(suggestEscalao({birthYear:2010,season:2026,gender:'F',licenseType:'Competição',teamLevel:'Clube'}),'Sub-17 (Cadetes)');
 assert.equal(suggestEscalao({birthYear:1990,season:2026,gender:'F',licenseType:'Competição',teamLevel:'Clube'}),'Masters / Veteranos');
});

test('quality detects drops, invalid dates and missing fields without mutating or hiding events',()=>{
 const rows=[race,{...race,id:'other',tag:null,date:'17 JUL 2027 a 18 JUL 2028'}];const before=structuredClone(rows);
 const metrics=sourceQualityMetrics(rows);assert.equal(metrics.processed,2);assert.equal(metrics.invalidDates,1);assert.equal(metrics.unknownCategories,2);
 const issues=qualityIssues(metrics,{processed:20},true);assert.ok(issues.some(e=>e.code==='volume_drop'));assert.ok(issues.some(e=>e.code==='partial'));
 assert.equal(qualityIssues({...metrics,processed:0},{processed:0}).some(e=>e.code==='volume_drop'),false);
 assert.deepEqual(rows,before);
});

const submission={organizerName:'Clube de Ciclismo',title:'Passeio BTT',start:'2026-11-14',end:'2026-11-15',place:'Lisboa',modality:'BTT',sourceUrl:'https://organizador.pt/provas/passeio',categories:['Masters / Veteranos'],declaration:true};
test('organizer submissions validate factual fields, dates and source URLs',()=>{
 const normalized=normalizeSubmission({...submission,userId:'forged',status:'APPROVED',userEmail:'forged@example.test'});
 assert.equal(normalized.userId,undefined);assert.equal(normalized.status,undefined);assert.equal(normalized.payload.userEmail,undefined);
 for(const patch of [{declaration:false},{start:'2026-02-31'},{end:'2025-01-01'},{sourceUrl:'http://127.0.0.1/'},{sourceUrl:'javascript:alert(1)'},{categories:['Anyone']},{modality:'Invented'}])assert.throws(()=>normalizeSubmission({...submission,...patch}));
});

test('publication requires an administrator review confirmation and a still-pending record',async()=>{
 let writes=0;const row={id:'s',status:'PENDING',organizerName:submission.organizerName,payload:normalizeSubmission(submission).payload};
 const tx={organizerSubmission:{findUnique:async()=>row,updateMany:async()=>({count:1}),update:async()=>{}},event:{create:async({data})=>{writes++;assert.equal(data.userEmail,undefined);assert.equal(data.source,'Organizador');return data;}}};
 const db={$transaction:fn=>fn(tx)};
 await assert.rejects(()=>reviewSubmission(db,{id:'s',action:'approve',note:'',confirmed:false}));assert.equal(writes,0);
 const result=await reviewSubmission(db,{id:'s',action:'approve',note:'Checked reference',confirmed:true});assert.equal(result.status,'APPROVED');assert.equal(writes,1);
 row.status='APPROVED';await assert.rejects(()=>reviewSubmission(db,{id:'s',action:'approve',note:'',confirmed:true}),{status:409});assert.equal(writes,1);
});

test('rejection never publishes an event',async()=>{
 const tx={organizerSubmission:{findUnique:async()=>({status:'PENDING'}),updateMany:async()=>({count:1})}};
 assert.equal((await reviewSubmission({$transaction:fn=>fn(tx)},{id:'s',action:'reject',note:'Could not verify'})).status,'REJECTED');
});

test('reviewed corrections clear previous category proof when categories are explicitly removed',async()=>{
 let updated;
 const row={status:'PENDING',eventId:'race',organizerName:submission.organizerName,payload:normalizeSubmission({...submission,categories:[]}).payload};
 const tx={organizerSubmission:{findUnique:async()=>row,updateMany:async()=>({count:1}),update:async()=>{}},event:{findUnique:async()=>race,update:async({data})=>{updated=data;return {...race,...data};}}};
 await reviewSubmission({$transaction:fn=>fn(tx)},{id:'s',action:'approve',note:'Checked',confirmed:true});
 assert.equal(updated.escaloes,'[]');assert.equal(updated.categoryEvidence,Prisma.DbNull);
});

test('search alerts require consent and reject private/GPS and unsupported searches',()=>{
 const body={name:'BTT',path:'/',filters:{selectedTags:['BTT']},consent:true};
 assert.equal(normalizeSearchAlert(body).enabled,true);
 assert.equal(normalizeSearchAlert(body).filters.includeUnknownCategories,true);
 for(const patch of [{consent:false},{path:'/agenda'},{filters:{origin:{lat:38,lng:-9}}},{filters:{maxDistanceFilter:50}},{filters:{pastEventsFilter:'passados'}}])assert.throws(()=>normalizeSearchAlert({...body,...patch}));
 assert.equal(normalizeSearchAlert(body).filters.origin,undefined);
});

test('search notifications include current matches once, then only newly matching future events',()=>{
 const row={filters:{selectedTags:['BTT']},path:'/',state:{}};
 const first=planSearchAlert([race,{...race,id:'past',date:'01 JAN 2020',sortDate:'2020-01-01'}],row,now);
 assert.equal(first.notices.length,1);
 const second=planSearchAlert([race],{...row,state:first.state},now);assert.equal(second.notices.length,0);
 assert.equal(planSearchAlert([race,{...race,id:'new',title:'Another BTT',date:'16 NOV 2026',sortDate:'2026-11-16',link:'https://apedalar.pt/eventos/new',source:'Apedalar'}],{...row,state:first.state},now).notices.length,1);
});

function deliveryFixture(){
 const row={id:'alert',userId:'user_a',name:'BTT',path:'/',filters:{selectedTags:['BTT']},enabled:true,revision:1,state:{},pending:null};
 const db={searchAlert:{updateMany:async({data})=>{Object.assign(row,data);return {count:1};},update:async({data})=>Object.assign(row,data),findUnique:async()=>({...row}),deleteMany:async()=>{}}};
 const users={getUser:async()=>({primaryEmailAddressId:'mail',emailAddresses:[{id:'mail',emailAddress:'a@example.test',verification:{status:'verified'}}]})};
 return {row,db,users};
}
test('failed search email reuses the persisted exact payload/key and successful messages are not duplicated',async()=>{
 const f=deliveryFixture(),calls=[];
 const options={...f,events:[race],now,jsonNull:null,send:async(message,key)=>{calls.push({message,key});return calls.length===1?{error:'timeout'}:{data:{id:'sent'}};}};
 await assert.rejects(()=>processSearchAlert(options));assert.ok(f.row.pending);
 assert.equal(await processSearchAlert(options),'sent');assert.deepEqual(calls[0],calls[1]);
 assert.equal(await processSearchAlert(options),'limited');assert.equal(calls.length,2);
});
test('a paused search alert is checked again before delivery',async()=>{
 const f=deliveryFixture();let sent=0;
 f.db.searchAlert.update=async({data})=>{Object.assign(f.row,data);if(data.pending)f.row.enabled=false;};
 assert.equal(await processSearchAlert({...f,events:[race],now,jsonNull:null,send:async()=>{sent++;return {data:{id:'x'}};}}),'disabled');assert.equal(sent,0);
});

test('new mutation routes reject anonymous and cross-origin requests before storing data',async()=>{
 let userId=null,calls=0;
 const mocks={'@clerk/nextjs/server':{auth:async()=>({userId}),clerkClient:()=>{calls++;throw Error();}},'@/app/lib/db':{prisma:{}},'@/app/lib/favoriteEditionSettings':{editionEmailAvailable:()=>true}};
 const organizer=await fixtureModule('../app/api/organizer/submissions/route.js',{...mocks,'@/app/utils/favoriteAlerts':{verifiedEmail:()=>null},'@/app/lib/organizerSubmissions':{normalizeSubmission},'@/app/lib/requestBody':await import('../app/lib/requestBody.js')});
 const request=(origin,body)=>new Request('https://calendar.test/api/organizer/submissions',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await organizer.POST(request('https://calendar.test',submission))).status,401);
 userId='user_a';assert.equal((await organizer.POST(request('https://other.test',submission))).status,403);assert.equal(calls,0);
});

test('trust UI copy is complete in every supported language',()=>{
 for(const [key,values]of Object.entries(trustCopy)){assert.equal(values.length,4,key);for(const lang of ['pt','en','es','fr']){assert.ok(trustText(lang,key).trim());assert.notEqual(trustText(lang,key),key);assert.doesNotMatch(trustText(lang,key),/\uFFFD/);}}
});

test('shared calendar indexes do not produce false duplicate-page alerts',()=>{
 for(const link of ['https://www.fpciclismo.pt/calendario','https://source.test/'])assert.equal(sourceQualityMetrics([{...race,link},{...race,id:'second',link}]).duplicatePages,0);
 assert.equal(sourceQualityMetrics([race,{...race,id:'second'}]).duplicatePages,1);
});

test('search alert mutations are scoped to the signed-in account and preserve the paused cursor',async()=>{
 let changed=null,deleted=null;
 const pendingState={seenIds:['race']};
 const api=await fixtureModule('../app/api/alerts/searches/route.js',{
  '@clerk/nextjs/server':{auth:async()=>({userId:'user_a'}),clerkClient:async()=>({users:{getUser:async()=>({})}})},
  '@/app/lib/db':{prisma:{searchAlert:{findFirst:async({where})=>{assert.equal(where.userId,'user_a');return where.id==='owned'?{revision:2,state:{},pending:{state:pendingState}}:null;},updateMany:async args=>{changed=args;return {count:1};},deleteMany:async args=>{deleted=args;}}}},
  '@/app/utils/favoriteAlerts':{verifiedEmail:()=> 'qa@example.test'},
  '@/app/lib/searchAlerts':{normalizeSearchAlert},
  '@/app/lib/favoriteEditionSettings':{editionEmailAvailable:()=>true},
  '@/app/lib/requestBody':await import('../app/lib/requestBody.js'),
 });
 const req=(method,body)=>new Request('https://calendar.test/api/alerts/searches',{method,headers:{origin:'https://calendar.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await api.PUT(req('PUT',{id:'other',enabled:false}))).status,404);assert.equal(changed,null);
 assert.equal((await api.PUT(req('PUT',{id:'owned',enabled:true}))).status,400);
 assert.equal((await api.PUT(req('PUT',{id:'owned',enabled:false}))).status,200);assert.deepEqual(changed.data.state,pendingState);assert.equal(changed.where.userId,'user_a');assert.equal(changed.where.revision,2);
 await api.DELETE(req('DELETE',{id:'other'}));assert.deepEqual(deleted.where,{id:'other',userId:'user_a'});
});

test('daily search cron authenticates and starts only one workflow per day',async()=>{
 const old=process.env.CRON_SECRET;process.env.CRON_SECRET='fixture-only';let created=false,started=0;
 try{
 const api=await fixtureModule('../app/api/cron/search-alerts/route.js',{
  'workflow/api':{start:async()=>{started++;}},
  '@/app/lib/db':{prisma:{searchAlertRun:{create:async()=>{if(created)throw Object.assign(Error(),{code:'P2002'});created=true;},deleteMany:async()=>{}}}},
  '@/app/lib/favoriteEditionSettings':{editionEmailAvailable:()=>true},
  '@/app/workflows/searchAlerts':{searchAlertWorkflow:()=>{}},
  '@/app/lib/requestBody':await import('../app/lib/requestBody.js'),
 });
 assert.equal((await api.GET(new Request('https://calendar.test/api/cron/search-alerts'))).status,401);
 const req=()=>new Request('https://calendar.test/api/cron/search-alerts',{headers:{authorization:'Bearer fixture-only'}});
 assert.equal((await api.GET(req())).status,202);assert.equal((await api.GET(req())).status,200);assert.equal(started,1);
 }finally{if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});
