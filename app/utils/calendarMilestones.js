import {filterEvents} from './filterEvents.js';
import {filterCalendarByDate} from './calendarList.js';
import {matchesPeriod} from './planning.js';
import {expectedOpeningLabel} from './partialDates.js';

// Read the date actually saved in Google, independently of the race date and
// independently of whether its main race event has also been added.
export function calendarMilestones(events,entries={}) {
 const byId=new Map();for(const event of events)for(const id of [event.id,...(event._allIds||[])])byId.set(String(id),event);
 const found=[],seen=new Set();
 for(const [key,entry] of Object.entries(entries)){
  const match=key.match(/^(.*)[_-]reg_(open|close)$/);if(!match||!entry?.start)continue;
  const date=new Date(entry.start);if(!Number.isFinite(date.getTime()))continue;
  const day=entry.allDay?entry.start.slice(0,10):new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const time=entry.allDay?'':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  const event=byId.get(match[1])||null,kind=match[2];
  const identity=[event?.id||match[1],kind,day,time].join('/');if(seen.has(identity))continue;seen.add(identity);
  const title=event?.title||entry.title||match[1];
  found.push({id:key,kind,day,time,title,event,estimated:entry.registrationPrecision==='month'||kind==='open'&&event?.temporalEvidence?.registrationOpen?.precision==='month',datedEvent:{...(event||{}),id:key,title,date:day,sortDate:day,endDate:day}});
 }
 return found.sort((a,b)=>(a.day+a.time).localeCompare(b.day+b.time)||a.title.localeCompare(b.title));
}
export function filterCalendarMilestones(items,filters={},today){
 return items.filter(item=>filterEvents([item.datedEvent],filters).length&&filterCalendarByDate([item.datedEvent],filters.pastEventsFilter,today).length&&matchesPeriod(item.datedEvent,filters.quickPeriod,new Date(today+'T12:00:00Z')));
}
export const milestoneText=(language,kind)=>({pt:{open:'Abertura de inscrições',close:'Fecho de inscrições',title:'Inscrições no Google Calendar'},en:{open:'Registration opens',close:'Registration closes',title:'Registrations in Google Calendar'},es:{open:'Apertura de inscripciones',close:'Cierre de inscripciones',title:'Inscripciones en Google Calendar'},fr:{open:'Ouverture des inscriptions',close:'Clôture des inscriptions',title:'Inscriptions dans Google Calendar'}}[language]||{open:'Registration opens',close:'Registration closes',title:'Registrations in Google Calendar'})[kind];
export const milestoneLabel=(language,item)=>item.estimated&&item.kind==='open'?expectedOpeningLabel(language):milestoneText(language,item.kind);
export const milestoneCount=(language,count)=>count+' '+({pt:count===1?'lembrete de inscrições':'lembretes de inscrições',en:count===1?'registration reminder':'registration reminders',es:count===1?'recordatorio de inscripciones':'recordatorios de inscripciones',fr:count===1?'rappel d’inscription':'rappels d’inscription'}[language]||'registration reminders');
