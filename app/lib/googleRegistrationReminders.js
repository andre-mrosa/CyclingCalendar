import {googleCalendarPages} from './googleCalendarRemoval.js';
import {registrationReminders,isRegistrationKey} from '../utils/registrationReminders.js';
export async function updateGoogleRegistrationReminders(token,{pages=googleCalendarPages,fetcher=fetch}={}) {
 const calendars=await pages('https://www.googleapis.com/calendar/v3/users/me/calendarList',token);
 const calendar=calendars.find(row=>/^cycling\s*calendar$/i.test(row.summary));if(!calendar)return {found:0,updated:0};
 const base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`;
 const entries=(await pages(base+'?maxResults=2500',token)).filter(row=>row.status!=='cancelled'&&isRegistrationKey(row.extendedProperties?.private?.cyclingCalendarEventId));
 let updated=0;for(const row of entries){
  const response=await fetcher(base+'/'+encodeURIComponent(row.id)+'?sendUpdates=none',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({reminders:registrationReminders()}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Falha ao atualizar avisos (${updated} de ${entries.length} atualizados)`);updated++;
 }
 return {found:entries.length,updated};
}
