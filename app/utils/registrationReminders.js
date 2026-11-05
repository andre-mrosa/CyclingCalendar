export const REGISTRATION_REMINDER_MINUTES=Object.freeze([10080,1440,360,60,0]);
export const registrationReminders=()=>({useDefault:false,overrides:REGISTRATION_REMINDER_MINUTES.map(minutes=>({method:'popup',minutes}))});
export const isRegistrationKey=key=>typeof key==='string'&&/[_-]reg_(open|close)$/.test(key);
export function registrationAlarmLines(description){return REGISTRATION_REMINDER_MINUTES.flatMap(minutes=>['BEGIN:VALARM','ACTION:DISPLAY',`TRIGGER:${minutes?'-PT'+minutes+'M':'PT0S'}`,`DESCRIPTION:${description}`,'END:VALARM']);}
export function calendarIdentifiers(id,target='event',aliases=[]){const ids=[...new Set([id,...aliases].filter(value=>typeof value==='string'&&value))];if(target==='event')return ids;const suffix=target==='registration_open'?'reg_open':target==='registration_close'?'reg_close':null;return suffix?ids.flatMap(value=>[`${value}-${suffix}`,`${value}_${suffix}`]):[];}
export const calendarMarked=(set,id,target='event',aliases=[])=>calendarIdentifiers(id,target,aliases).some(key=>set.has(key));
// Existing database values encode Lisbon wall-clock fields, not UTC instants.
// Midnight / 23:59 were legacy placeholders when a source gave only a date.
export function registrationCalendarDate(event,type='reg_open') {
 const opening=type==='reg_open',raw=opening?event?.registrationOpensAt:event?.registrationClosesAt;
 const date=new Date(raw);if(!raw||!Number.isFinite(date.getTime()))return null;
 const evidence=event?.temporalEvidence?.[opening?'registrationOpen':'registrationClose'];
 const clock=date.toISOString().slice(11,19);
 const fallback=evidence?.precision==='month'||evidence?.hasTime===false||(evidence?.hasTime!==true&&['00:00:00','23:59:00','23:59:59'].includes(clock));
 if(fallback)date.setUTCHours(9,0,0,0);
 return date;
}
