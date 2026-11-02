import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {normalizeSavedEntry,storeSavedEntries} from '../app/lib/savedSearchAccount.js';
import {planFavoriteChanges,favoriteChangeEmail,deliverFavoriteChanges,changeFavoriteEvents} from '../app/lib/favoriteChangeAlerts.js';
import {searchSuggestions,searchResultEvents} from '../app/utils/searchSuggestions.js';
import {monthCollection,availableMonths} from '../app/lib/calendarMonths.js';
import {experienceCopy,experienceText} from '../app/i18n/experienceCopy.js';
const entry={id:'search-1',name:'BTT em Lisboa',path:'/',filters:{selectedTags:['BTT']}};
const race={id:'race',title:'Prova BTT',date:'15 NOV 2026',sortDate:'2026-11-15T00:00:00Z',tag:'BTT',source:'FPC',link:'https://www.fpciclismo.pt/pagina/prova',distrito:'Lisboa',lastVerifiedAt:'2026-11-01T10:00:00Z'};
const changed={...race,date:'22 NOV 2026',sortDate:'2026-11-22T00:00:00Z',lastVerifiedAt:'2026-11-02T10:00:00Z'};
const now=new Date('2026-11-02T12:00:00Z');
const request=(method,body,origin='https://calendar.test')=>new Request('https://calendar.test/api/test',{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('account searches reject foreign paths, private GPS and injected identifiers',()=>{
 assert.equal(normalizeSavedEntry({...entry,userId:'other',role:'admin'}).userId,undefined);
 for(const patch of [{path:'https://evil.test/'},{path:'/admin'},{id:'../other'},{name:' '},{filters:{origin:{lat:38,lng:-9}}},{filters:{maxDistanceFilter:30}}])assert.throws(()=>normalizeSavedEntry({...entry,...patch}));
});
test('local search import keeps the account version and scopes every operation',async()=>{
 let writes=0;
 const tx={savedSearch:{findFirst:async({where})=>{assert.equal(where.userId,'user_a');return {id:'account-copy'};},upsert:async()=>{writes++;},count:async()=>1,findMany:async({where})=>{assert.equal(where.userId,'user_a');return [{id:'account-copy'}];}}};
 assert.deepEqual(await storeSavedEntries({$transaction:fn=>fn(tx)},'user_a',[entry],true),[{id:'account-copy'}]);assert.equal(writes,0);
});
test('saved search endpoints require authentication and never delete another account records',async()=>{
 let userId=null,where=null;
 const api=await fixtureModule('../app/api/searches/saved/route.js',{'@clerk/nextjs/server':{auth:async()=>({userId})},'@/app/lib/db':{prisma:{savedSearch:{deleteMany:async arg=>{where=arg.where;},findMany:async()=>[]}}},'@/app/lib/requestBody':await import('../app/lib/requestBody.js'),'@/app/lib/savedSearchAccount':{storeSavedEntries}});
 assert.equal((await api.POST(request('POST',{entries:[entry]}))).status,401);
 userId='user_a';assert.equal((await api.DELETE(request('DELETE',{id:'search-1'},'https://evil.test'))).status,403);assert.equal(where,null);
 assert.equal((await api.DELETE(request('DELETE',{id:'search-1',userId:'user_b'}))).status,200);assert.deepEqual(where,{userId:'user_a',id:'search-1'});
});
test('personal statuses are private, bounded, validated and remain distinct from registration',async()=>{
 const operations=[];const tx={eventParticipation:{deleteMany:async arg=>operations.push(arg),findUnique:async()=>null,count:async()=>0,upsert:async arg=>operations.push(arg)}};
 const api=await fixtureModule('../app/api/planning/states/route.js',{'@clerk/nextjs/server':{auth:async()=>({userId:'user_a'})},'@/app/lib/db':{prisma:{$transaction:fn=>fn(tx)}},'@/app/lib/requestBody':await import('../app/lib/requestBody.js'),'@/app/lib/getPublicCalendarEvents':{getPublicEvent:async id=>id==='race'?race:null}});
 assert.equal((await api.PUT(request('PUT',{eventId:'race',status:'paid'}))).status,400);
 assert.equal((await api.PUT(request('PUT',{eventId:'missing',status:'registered'}))).status,404);assert.equal(operations.length,0);
 assert.equal((await api.PUT(request('PUT',{eventId:'race',aliases:['old-alias'],status:'registered',userId:'user_b'}))).status,200);
 assert.equal(operations.at(-1).create.userId,'user_a');assert.equal(operations.at(-1).create.status,'registered');assert.equal(operations[0].where.userId,'user_a');
});
test('change notices compare known published facts only after a newer check',()=>{
 const baseline=planFavoriteChanges([race]);assert.equal(baseline.notices.length,0);
 assert.equal(planFavoriteChanges([changed],baseline.state).notices[0].changes[0].field,'date');
 assert.equal(planFavoriteChanges([{...changed,lastVerifiedAt:race.lastVerifiedAt}],baseline.state).notices.length,0);
 assert.equal(planFavoriteChanges([{...changed,date:'Por confirmar',sortDate:null,distrito:''}],baseline.state).notices.length,0);
 const stale=planFavoriteChanges([{...changed,lastVerifiedAt:'2026-10-01T00:00:00Z'}],baseline.state);assert.deepEqual(stale.state,baseline.state);
});
test('missing favorites are not cancellations and surviving aliases retain their baseline',async()=>{
 const user={id:'user_a',unsafeMetadata:{favorites:['race']}};
 const events=await changeFavoriteEvents({favoriteEditionPreference:{findUnique:async()=>null}},user,[]);
 assert.deepEqual(events,[{id:'race'}]);const baseline=planFavoriteChanges([race]);
 assert.deepEqual(planFavoriteChanges(events,baseline.state).state,baseline.state);
 assert.equal(planFavoriteChanges([{...changed,id:'new-id',_allIds:['race']}],baseline.state).notices.length,1);
 assert.deepEqual(planFavoriteChanges([],baseline.state).state,{});
});
test('cancellation requires an explicit title and disappearance of that word does not send reinstatement',()=>{
 const baseline=planFavoriteChanges([race]);const cancelled={...changed,title:'Prova BTT Cancelada'};
 const cancel=planFavoriteChanges([cancelled],baseline.state);assert.ok(cancel.notices[0].changes.some(c=>c.field==='cancelled'));
 const again=planFavoriteChanges([{...changed,lastVerifiedAt:'2026-11-03T00:00:00Z'}],cancel.state);assert.equal(again.notices.length,0);
 assert.equal(planFavoriteChanges([{...cancelled,lastVerifiedAt:'2026-11-04T00:00:00Z'}],again.state).notices.length,0);
});
test('change emails contain before/after, source and management in four languages',()=>{
 const notices=planFavoriteChanges([changed],planFavoriteChanges([race]).state).notices;
 for(const language of ['pt','en','es','fr']){const mail=favoriteChangeEmail(notices,language);assert.match(mail.text,/15\/11\/2026 → 22\/11\/2026/);assert.match(mail.text,/fpciclismo.pt/);assert.match(mail.text,/cyclingcalendar.pt\/favoritos/);assert.ok(mail.subject);}
});
function fixture(){
 const row={userId:'user_a',enabled:true,revision:1,state:planFavoriteChanges([race]).state,pending:null,language:'pt'};
 const user={id:'user_a',unsafeMetadata:{favorites:['race']},primaryEmailAddressId:'mail',emailAddresses:[{id:'mail',emailAddress:'qa@example.test',verification:{status:'verified'}}]};
 const db={favoriteChangePreference:{updateMany:async({data})=>{Object.assign(row,data);return {count:1};},findUnique:async()=>({...row}),update:async({data})=>Object.assign(row,data)},favoriteEditionPreference:{findUnique:async()=>null}};
 return {row,db,users:{getUser:async()=>user},user,events:[changed],jsonNull:null,now};
}
test('change delivery persists and reuses an identical payload/key after uncertain failure',async()=>{
 const f=fixture(),calls=[];const send=async(message,key)=>{calls.push({message,key});return calls.length===1?{error:'timeout'}:{data:{id:'sent'}};};
 await assert.rejects(()=>deliverFavoriteChanges({...f,send}));assert.ok(f.row.pending);
 assert.equal(await deliverFavoriteChanges({...f,send}),'sent');assert.deepEqual(calls[0],calls[1]);assert.equal(await deliverFavoriteChanges({...f,send}),'limited');assert.equal(calls.length,2);
});
test('change delivery rechecks disabled preferences before sending',async()=>{
 const f=fixture();let sends=0;f.db.favoriteChangePreference.update=async({data})=>{Object.assign(f.row,data);if(data.pending)f.row.enabled=false;};
 assert.equal(await deliverFavoriteChanges({...f,send:async()=>{sends++;}}),'disabled');assert.equal(sends,0);
});
test('change preference activation requires consent and sets a fresh baseline without sending',async()=>{
 const f=fixture();let data;
 const api=await fixtureModule('../app/api/alerts/changes/route.js',{'@clerk/nextjs/server':{auth:async()=>({userId:'user_a'}),clerkClient:async()=>({users:f.users})},'@/app/lib/db':{prisma:{...f.db,favoriteChangePreference:{upsert:async args=>{data=args.create;return data;}}}},'@/app/lib/requestBody':await import('../app/lib/requestBody.js'),'@/app/lib/favoriteEditionSettings':{editionEmailAvailable:()=>true},'@/app/utils/favoriteAlerts':await import('../app/utils/favoriteAlerts.js'),'@/app/lib/getPublicCalendarEvents':{getPublicCalendarEvents:async()=>[race]},'@/app/lib/favoriteChangeAlerts':{changeFavoriteEvents,planFavoriteChanges}});
 assert.equal((await api.PUT(request('PUT',{enabled:true}))).status,400);assert.equal(data,undefined);
 assert.equal((await api.PUT(request('PUT',{enabled:true,consent:true}))).status,200);assert.equal(data.userId,'user_a');assert.equal(data.state.race.date,'2026-11-15/2026-11-15');
});
test('empty-result suggestions give real counts and preserve favorite/scope constraints',()=>{
 const filters={searchTerm:'missing',selectedYears:['2026'],pastEventsFilter:'futuros'};
 const context={today:'2026-11-02',filterByFavorites:true,favorites:['race'],fixed:{selectedAmbito:'Nacional'}};
 const rows=[{...race,ambito:'Nacional'},{...race,id:'other',ambito:'Internacional'}];
 const suggestions=searchSuggestions(rows,filters,context);assert.ok(suggestions.length);
 for(const suggestion of suggestions)assert.equal(searchResultEvents(rows,{...filters,...suggestion.patch},context).length,suggestion.count);
 assert.equal(suggestions.every(s=>s.count===1),true);
 assert.equal(searchSuggestions(rows,filters,{...context,favorites:[]}).length,0);
});
test('month collections validate dates, include overlapping events and omit unknown dates',()=>{
 assert.equal(monthCollection('2026-13'),null);assert.equal(monthCollection('2026-2'),null);assert.equal(monthCollection('2026-11').match(race),true);
 assert.equal(monthCollection('2026-11').match({date:'30 OUT 2026 a 2 NOV 2026'}),true);
 assert.equal(monthCollection('2026-11').match({date:'Por confirmar'}),false);
 assert.deepEqual(availableMonths([race],'2026-11-02').map(m=>m.slug),['2026-11']);
});
test('new experience copy is complete in each supported language',()=>{
 for(const [key,values] of Object.entries(experienceCopy)){assert.equal(values.length,4,key);for(const language of ['pt','en','es','fr']){assert.notEqual(experienceText(language,key),key);assert.doesNotMatch(experienceText(language,key),/\uFFFD/);}}
});
