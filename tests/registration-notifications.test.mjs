import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTRATION_REMINDER_MINUTES,registrationReminders,calendarMarked} from '../app/utils/registrationReminders.js';
import {buildIcsContent} from '../app/utils/calendarExport.js';
import {planFavoriteChanges,favoriteChangeEmail} from '../app/lib/favoriteChangeAlerts.js';
import {updateGoogleRegistrationReminders} from '../app/lib/googleRegistrationReminders.js';
import {testOwnPushDevices} from '../app/lib/pushDiagnostics.js';
import {fixtureModule} from './fixtureModule.mjs';
import {privateJson,sameOriginJson} from '../app/lib/requestBody.js';
const mq={id:'mq',title:'Mountain Quest 2027',date:'19 JUN 2027',sortDate:'2027-06-19',source:'Organizador',link:'https://mountainquest.pt/',lastVerifiedAt:'2026-11-05T13:00:00Z',registrationOpensAt:'2027-04-01T00:00:00.000Z',temporalEvidence:{version:1,registrationOpen:{precision:'month',value:'2027-04',source:'https://mountainquest.pt/registrations/'}}};
test('registration milestones have all five requested popup and ICS alarms while race alarms stay unchanged',()=>{
 assert.deepEqual(REGISTRATION_REMINDER_MINUTES,[10080,1440,360,60,0]);assert.deepEqual(registrationReminders().overrides.map(row=>row.minutes),[10080,1440,360,60,0]);
 const ics=buildIcsContent({...mq,registrationClosesAt:'2027-04-30T23:59:00Z'}).replace(/\r\n /g,'');
 const entries=ics.split('BEGIN:VEVENT').slice(1);assert.equal(entries.length,3);
 assert.equal((entries[0].match(/BEGIN:VALARM/g)||[]).length,1);
 for(const entry of entries.slice(1)){assert.equal((entry.match(/BEGIN:VALARM/g)||[]).length,5);for(const trigger of ['-PT10080M','-PT1440M','-PT360M','-PT60M','PT0S'])assert.ok(entry.includes('TRIGGER:'+trigger));}
});
test('registration state supports old/new identifier separators and source aliases independently of race state',()=>{
 for(const key of ['mq-reg_open','mq_reg_open','old-mq-reg_open','old-mq_reg_open']){
  const marked=new Set([key]);assert.equal(calendarMarked(marked,'mq','registration_open',['old-mq']),true);assert.equal(calendarMarked(marked,'mq','registration_close',['old-mq']),false);assert.equal(calendarMarked(marked,'mq','event',['old-mq']),false);
 }
});
test('a concrete MQ opening sends a month-to-day email notice after a newer source check, only once',()=>{
 const baseline=planFavoriteChanges([mq]);assert.equal(baseline.notices.length,0);
 const exact={...mq,registrationOpensAt:'2027-04-14T20:00:00Z',lastVerifiedAt:'2026-12-01T05:00:00Z',temporalEvidence:null};
 const plan=planFavoriteChanges([exact],baseline.state);assert.equal(plan.notices.length,1);assert.deepEqual(plan.notices[0].changes.map(row=>row.field),['registrationOpensAt']);
 const email=favoriteChangeEmail(plan.notices,'pt');assert.match(email.text,/Abertura de inscrições/);assert.match(email.text,/04\/2027/);assert.match(email.text,/14\/04\/2027 20:00/);
 assert.equal(planFavoriteChanges([exact],plan.state).notices.length,0);
});
test('an unknown deadline becoming known notifies, but enabling the new fields does not spam old changes',()=>{
 const baseline=planFavoriteChanges([{...mq,registrationOpensAt:null}]);
 const next={...mq,lastVerifiedAt:'2026-12-01T05:00:00Z',registrationClosesAt:'2027-04-30T23:59:00Z'};
 assert.deepEqual(planFavoriteChanges([next],baseline.state).notices[0].changes.map(row=>row.field),['registrationOpensAt','registrationClosesAt']);
 const legacy=structuredClone(baseline.state);delete legacy.mq.registrationOpensAt;delete legacy.mq.registrationClosesAt;
 const migrated=planFavoriteChanges([next],legacy);assert.equal(migrated.notices.length,0);assert.equal(migrated.state.mq.registrationClosesAt,'2027-04-30T23:59:00.000Z');
});
test('bulk update changes only owned-calendar registration reminders and leaves race dates intact',async()=>{
 const written=[];const result=await updateGoogleRegistrationReminders('fixture',{pages:async url=>url.includes('calendarList')?[{id:'owned',summary:'Cycling Calendar'}]:[
  {id:'race',extendedProperties:{private:{cyclingCalendarEventId:'mq'}}},
  {id:'opening',extendedProperties:{private:{cyclingCalendarEventId:'mq-reg_open'}}},
  {id:'closing',extendedProperties:{private:{cyclingCalendarEventId:'mq_reg_close'}}},
  {id:'other',summary:'Registration random'}],fetcher:async(url,options)=>{written.push({url,body:JSON.parse(options.body)});return new Response('{}');}});
 assert.deepEqual(result,{found:2,updated:2});for(const row of written){assert.deepEqual(Object.keys(row.body),['reminders']);assert.equal(row.body.reminders.overrides.length,5);}assert.ok(written.every(row=>!row.url.includes('/race?')));
});
test('push diagnostics are scoped to this account, rate limited per device and report acceptance rather than receipt',async()=>{
 const sent=[],updates=[],logs=[];const db={favoritePushSubscription:{findMany:async args=>{assert.equal(args.where.userId,'owner');return [{id:'one',endpoint:'https://push.test/one',p256dh:'key',auth:'secret'},{id:'two',endpoint:'https://push.test/two',p256dh:'key',auth:'secret'}];},updateMany:async args=>{updates.push(args);return {count:args.where.id==='one'?1:0};}},systemLog:{create:async args=>logs.push(args)}};
 const result=await testOwnPushDevices({db,userId:'owner',send:async(_,message)=>sent.push(message)});assert.deepEqual(result,{registered:2,sent:1,failed:0,limited:1});assert.equal(sent.length,1);assert.ok(updates.every(row=>row.where.userId==='owner'));assert.doesNotMatch(logs[0].data.details,/secret|endpoint|key/);
});
test('bulk calendar reminder update rejects anonymous and cross-origin requests before OAuth',async()=>{
 let userId=null,oauth=0,writes=0;
 const route=await fixtureModule('../app/api/calendar/registration-reminders/route.js',{'@clerk/nextjs/server':{auth:async()=>({userId}),clerkClient:async()=>({users:{getUserOauthAccessToken:async()=>{oauth++;return {data:[{token:'fixture'}]};}}})},'@/app/lib/requestBody':{privateJson,sameOriginJson},'@/app/lib/googleRegistrationReminders':{updateGoogleRegistrationReminders:async()=>{writes++;return {updated:0};}}});
 const request=origin=>new Request('https://calendar.test/api/calendar/registration-reminders',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal((await route.POST(request('https://calendar.test'))).status,401);userId='owner';assert.equal((await route.POST(request('https://evil.test'))).status,403);assert.equal(oauth+writes,0);
 assert.equal((await route.POST(request('https://calendar.test'))).status,200);assert.equal(writes,1);
});
