import {googleCalendarPages} from './googleCalendarRemoval.js';
import {registrationReminders,isRegistrationKey,registrationCalendarDate} from '../utils/registrationReminders.js';
export async function updateGoogleRegistrationReminders(token,{pages=googleCalendarPages,fetcher=fetch,events=[]}={}) {
 const catalogue=new Map();for(const event of events)for(const id of [event.id,...(event._allIds||[])])catalogue.set(id,event);
 const calendars=await pages('https://www.googleapis.com/calendar/v3/users/me/calendarList',token);
 const calendar=calendars.find(row=>/^cycling\s*calendar$/i.test(row.summary));if(!calendar)return {found:0,updated:0};
 const base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`;
 const entries=(await pages(base+'?maxResults=2500',token)).filter(row=>row.status!=='cancelled'&&isRegistrationKey(row.extendedProperties?.private?.cyclingCalendarEventId));
 let updated=0;for(const row of entries){
  const key=row.extendedProperties.private.cyclingCalendarEventId,type=key.endsWith('reg_open')?'reg_open':'reg_close';
  const event=catalogue.get(key.replace(/[_-]reg_(open|close)$/,''));
  const moment=event&&registrationCalendarDate(event,type);
  const patch={reminders:registrationReminders()};
  if(moment){patch.start={dateTime:moment.toISOString().slice(0,19),timeZone:'Europe/Lisbon'};patch.end={dateTime:new Date(moment.getTime()+3600000).toISOString().slice(0,19),timeZone:'Europe/Lisbon'};if(row.start?.date){patch.start.date=null;patch.end.date=null;}}
  const response=await fetcher(base+'/'+encodeURIComponent(row.id)+'?sendUpdates=none',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(patch),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Falha ao atualizar avisos (${updated} de ${entries.length} atualizados)`);updated++;
 }
 return {found:entries.length,updated};
}
