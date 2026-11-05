import test from 'node:test';
import assert from 'node:assert/strict';
import {eventDateDisplay} from '../app/utils/eventDateDisplay.js';
import {detectRaceDate} from '../app/utils/detectRaceDate.js';
import {eventsInPeriod,eventOccursOn,groupEventsByDate} from '../app/utils/calendarPresentation.js';
import {filterCalendarByDate} from '../app/utils/calendarList.js';
import {monthCollection} from '../app/utils/calendarInterface.js';
import {registrationStatus} from '../app/utils/eventFreshness.js';
import {matchesPeriod} from '../app/utils/planning.js';
import {generateGoogleCalendarUrl,buildIcsContent,getCalendarDates} from '../app/utils/calendarExport.js';
import {toPublicEvent} from '../app/lib/publicEvent.js';
import {editionMatches} from '../app/utils/favoriteEditions.js';
import {offlineFilter,cleanOfflineRows} from '../public/offline-model.js';
const monthly={id:'tn',title:'Terra Norte 2027',date:'— OUT 2027',sortDate:'2027-10-01T00:00:00Z',source:'Organizador',tag:'Gravel',link:'https://terranorte.pt/'};
const opening={...monthly,registrationOpensAt:'2027-01-01T00:00:00.000Z',registrationClosesAt:'2027-03-15T23:59:00.000Z',temporalEvidence:{version:1,registrationOpen:{precision:'month',value:'2027-01',source:'https://terranorte.pt/'}}};
test('a month-only race appears only in its month, with no day and no invented race export',()=>{
 const dates=eventDateDisplay(monthly);assert.equal(dates.day,'—');assert.equal(dates.key,'2027-10');assert.equal(dates.start,undefined);
 assert.equal(detectRaceDate(monthly),null);assert.equal(getCalendarDates(monthly),null);assert.equal(generateGoogleCalendarUrl(monthly),null);assert.equal(buildIcsContent(monthly),null);
 assert.equal(eventOccursOn(monthly,'2027-10-01'),false);assert.equal(eventsInPeriod([monthly],'2027-10').length,1);assert.equal(eventsInPeriod([monthly],'2027-09').length,0);
 assert.equal(monthCollection([monthly],'2027-09',null,true).length,0);assert.equal(monthCollection([monthly],'2027-10',null,true).length,1);
 assert.equal(filterCalendarByDate([monthly],'futuros','2027-10-20').length,1);assert.equal(filterCalendarByDate([monthly],'futuros','2027-11-01').length,0);
 assert.equal(matchesPeriod(monthly,'month',new Date('2027-10-20')),true);
 const exact={...monthly,id:'exact',date:'19 OUT 2027',sortDate:'2027-10-19'};assert.deepEqual(groupEventsByDate([monthly,exact]).map(g=>g[0].id),['exact','tn']);
});
test('month-only registration is a first-day 09:00 reminder, never proof that entries are open',()=>{
 const link=new URL(generateGoogleCalendarUrl(opening,'reg_open'));assert.equal(link.searchParams.get('dates'),'20270101T090000/20270101T100000');assert.match(link.searchParams.get('text'),/prevista/);assert.match(link.searchParams.get('details'),/apenas o mês/);
 const ics=buildIcsContent(opening).replace(/\r\n /g,'');assert.match(ics,/DTSTART;TZID=Europe\/Lisbon:20270101T090000/);assert.match(ics,/DTEND;TZID=Europe\/Lisbon:20270101T100000/);assert.match(ics,/Abertura prevista/);assert.doesNotMatch(ics,/UID:event-|inscrições abrem em 15/);
 assert.equal(registrationStatus(opening,new Date('2027-01-10')),'unknown');assert.equal(matchesPeriod(opening,'open',new Date('2027-01-10')),false);
 assert.equal(registrationStatus(opening,new Date('2026-12-20')),'upcoming');
 assert.equal(toPublicEvent(opening).temporalEvidence.registrationOpen.precision,'month');
});
test('offline month-only races stay in their announced month and do not expire on its first day',()=>{
 const rows=cleanOfflineRows([{...monthly,month:'2027-10'}]);assert.equal(rows[0].month,'2027-10');
 assert.equal(offlineFilter(rows,{today:'2027-10-20',month:'2027-10'}).length,1);assert.equal(offlineFilter(rows,{today:'2027-10-20',month:'2027-09'}).length,0);assert.equal(offlineFilter(rows,{today:'2027-10-20',day:'2027-10-01'}).length,0);
});
test('curated editions follow aliases and monthly announcements without depending on a stale discipline',()=>{
 const before={...monthly,id:'before',title:'Bairrada Ultra Marathon 150',date:'10 MAI 2025',sortDate:'2025-05-10',tag:'Estrada'};
 const after={...monthly,id:'after',title:'Bairrada Ultra Marathon 2027',date:'— MAI 2027',sortDate:'2027-05-01',tag:'BTT'};
 assert.equal(editionMatches([before,after],['before']).length,1);
});
