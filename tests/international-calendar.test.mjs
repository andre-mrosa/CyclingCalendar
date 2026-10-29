import test from 'node:test';
import assert from 'node:assert/strict';
import { internationalCalendar } from '../app/lib/internationalCalendar.js';
import { filterEvents } from '../app/utils/filterEvents.js';
import { filterCalendarByDate } from '../app/utils/calendarList.js';
const event=(id,date,extra={})=>({id,title:'Prova '+id,date,sortDate:date.startsWith('25')?'2026-10-25':'2026-09-03',ambito:'Internacional',...extra});
const displayed=(data,today)=>filterCalendarByDate(filterEvents(data.events,{selectedYears:data.defaultYears}),data.defaultPastEventsFilter,today,data.defaultYears||[]);
test('an international off-season page renders actual archive records rather than an empty upcoming search',()=>{
 const events=[event('past','25 OUT 2026'),event('other','23 MAI 2027',{sortDate:'2027-05-23',ambito:'Prova Aberta'})];
 const data=internationalCalendar(events,'2026-10-29');
 assert.equal(data.archiveYear,'2026');assert.deepEqual(data.defaultYears,['2026']);
 assert.equal(data.defaultPastEventsFilter,'todos');assert.deepEqual(displayed(data,'2026-10-29').map(e=>e.id),['past']);
});
test('the international archive stays available after the calendar year changes',()=>{
 const events=[event('past','25 OUT 2026'),event('older','25 OUT 2025',{sortDate:'2025-10-25'})];
 const data=internationalCalendar(events,'2027-01-01');
 assert.equal(data.archiveYear,'2026');assert.deepEqual(displayed(data,'2027-01-01').map(e=>e.id),['past']);
});
test('published upcoming and ongoing international dates keep the normal upcoming view',()=>{
 for(const date of ['30 OUT 2026','28 OUT 2026 a 30 OUT 2026']){
  const data=internationalCalendar([event('past','25 OUT 2026'),event('next',date,{sortDate:'2026-10-28'})],'2026-10-29');
  assert.equal(data.archiveYear,null);assert.equal(data.defaultYears,null);assert.equal(data.defaultPastEventsFilter,'futuros');
  assert.deepEqual(displayed(data,'2026-10-29').map(e=>e.id),['next']);
 }
});
test('unknown dates and an empty catalogue never acquire a fabricated archive year',()=>{
 const unknown=internationalCalendar([event('unknown','A definir',{sortDate:null})],'2026-10-29');
 assert.equal(unknown.archiveYear,null);assert.equal(unknown.defaultYears,null);
 const empty=internationalCalendar([],'2026-10-29');assert.equal(empty.events.length,0);assert.equal(empty.archiveYear,null);
});
