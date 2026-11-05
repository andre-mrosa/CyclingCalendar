export const REGISTRATION_REMINDER_MINUTES=Object.freeze([10080,1440,360,60,0]);
export const registrationReminders=()=>({useDefault:false,overrides:REGISTRATION_REMINDER_MINUTES.map(minutes=>({method:'popup',minutes}))});
export const isRegistrationKey=key=>typeof key==='string'&&/[_-]reg_(open|close)$/.test(key);
export function registrationAlarmLines(description){return REGISTRATION_REMINDER_MINUTES.flatMap(minutes=>['BEGIN:VALARM','ACTION:DISPLAY',`TRIGGER:${minutes?'-PT'+minutes+'M':'PT0S'}`,`DESCRIPTION:${description}`,'END:VALARM']);}
export function calendarIdentifiers(id,target='event',aliases=[]){const ids=[...new Set([id,...aliases].filter(value=>typeof value==='string'&&value))];if(target==='event')return ids;const suffix=target==='registration_open'?'reg_open':target==='registration_close'?'reg_close':null;return suffix?ids.flatMap(value=>[`${value}-${suffix}`,`${value}_${suffix}`]):[];}
export const calendarMarked=(set,id,target='event',aliases=[])=>calendarIdentifiers(id,target,aliases).some(key=>set.has(key));
