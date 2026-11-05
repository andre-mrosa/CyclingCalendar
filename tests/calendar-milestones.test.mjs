import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarMilestones,filterCalendarMilestones,milestoneLabel} from '../app/utils/calendarMilestones.js';
import {personalCalendarMonth} from '../app/utils/personalCollection.js';
import {saveOfflinePersonal} from '../app/utils/offlineSnapshot.js';
import {readOfflineRegistrations,OFFLINE_PERSONAL_KEY} from '../public/offline-model.js';
const race={id:'mq',_allIds:['old-mq'],title:'Mountain Quest 2027',date:'19 JUN 2027',sortDate:'2027-06-19',tag:'BTT',distrito:'Amarante',temporalEvidence:{registrationOpen:{precision:'month'}}};
const entries={
 mq:{start:'2027-06-19',allDay:true,title:'Mountain Quest'},
 'mq-reg_open':{start:'2027-04-01T09:00:00+01:00',allDay:false,registrationPrecision:'month'},
 'old-mq_reg_open':{start:'2027-04-01T08:00:00Z',allDay:false},
 'mq_reg_close':{start:'2027-05-30T23:59:00+01:00',allDay:false},
 'mq-reg_invalid':{start:'2027-05-01'},
 'broken-reg_close':{start:'invalid'},
};
test('saved milestones appear independently from race dates, without inventing unexported registration dates',()=>{
 const result=calendarMilestones([race],entries);assert.equal(result.length,2);
 assert.equal(result[0].day,'2027-04-01');assert.equal(result[0].time,'09:00');assert.equal(result[0].event.id,'mq');assert.equal(result[0].estimated,true);
 assert.match(milestoneLabel('pt',result[0]),/prevista/);assert.equal(result[1].kind,'close');assert.equal(result[1].day,'2027-05-30');
 assert.equal(calendarMilestones([race],{mq:entries.mq}).length,0);
 assert.equal(calendarMilestones([race],{'mq-reg_open':entries['mq-reg_open']}).length,1);
 assert.equal(personalCalendarMonth([race,...result.map(item=>item.datedEvent)],'2027-01-01'),'2027-04');
});
test('milestone filters use the saved registration year/month and Lisbon date rather than the race date',()=>{
 const item=calendarMilestones([race],{'mq-reg_open':{start:'2026-12-31T23:30:00Z',allDay:false}});
 assert.equal(filterCalendarMilestones(item,{selectedYears:['2026'],monthFrom:12,monthTo:12,pastEventsFilter:'futuros'},'2026-11-05').length,1);
 assert.equal(filterCalendarMilestones(item,{selectedYears:['2027']},'2026-11-05').length,0);
 assert.equal(filterCalendarMilestones(item,{searchTerm:'amarante'},'2026-11-05').length,1);
 assert.equal(filterCalendarMilestones(item,{searchTerm:'bairrada'},'2026-11-05').length,0);
 const summer=calendarMilestones([],{'missing-reg_open':{title:'Saved opening',start:'2027-06-01T23:30:00Z'}})[0];assert.equal(summer.day,'2027-06-02');assert.equal(summer.time,'00:30');assert.equal(summer.event,null);
 assert.equal(calendarMilestones([],{'missing-reg_open':{start:'2027-06-01',allDay:true}})[0].day,'2027-06-01');
});
test('offline snapshots preserve only minimal milestone facts and clear them on account change/sign-out',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
 saveOfflinePersonal(storage,'owner',[race],()=>null,()=>false,entries);
 assert.equal(readOfflineRegistrations(storage).length,2);assert.equal(readOfflineRegistrations(storage)[0].time,'09:00');
 assert.doesNotMatch(storage.getItem(OFFLINE_PERSONAL_KEY),/reminderMinutes|datedEvent|extendedProperties|endpoint/);
 saveOfflinePersonal(storage,'owner',[],()=>null,()=>false);assert.equal(readOfflineRegistrations(storage).length,2);
 saveOfflinePersonal(storage,'other',[],()=>null,()=>false);assert.deepEqual(readOfflineRegistrations(storage),[]);
 saveOfflinePersonal(storage,'owner',[race],()=>null,()=>false,entries);saveOfflinePersonal(storage,'guest',[],()=>null,()=>false);assert.deepEqual(readOfflineRegistrations(storage),[]);
});
