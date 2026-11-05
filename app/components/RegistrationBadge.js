'use client';
import { CalendarDays, CalendarClock, CalendarX, CalendarCheck, CalendarPlus,CalendarMinus,CalendarSync,LoaderCircle } from 'lucide-react';
import {useState} from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { generateGoogleCalendarUrl } from '../utils/calendarExport';
import { formatRegistrationDay } from '../utils/registrationDates';
import { lisbonWallClock } from '../utils/planning';
import { useClientReady } from '../hooks/useBrowserState';
import {useParticipationStates,participationFor} from '../hooks/useParticipationStates';
import {monthlyRegistration,expectedOpeningLabel,monthLabel,raceMonth,monthEnd} from '../utils/partialDates';
import {useCalendarEvents} from '../hooks/useCalendarEvents';
import {calendarIdentifiers,registrationCalendarDate} from '../utils/registrationReminders';
import {removeCalendarEvent} from '../utils/calendarRemoval';

export default function RegistrationBadge({ event, isCancelled }) {
    const { language, t } = useTranslation();
    const mounted = useClientReady();
    const {states}=useParticipationStates();
    const calendar=useCalendarEvents();
    const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
    
    if (!mounted || isCancelled || !event.sortDate || participationFor(event,states)?.status==='registered') return null;
    
    const now = new Date(lisbonWallClock());
    const eventDate = new Date(raceMonth(event)?monthEnd(raceMonth(event)):event.sortDate);
    eventDate.setUTCHours(23, 59, 59, 999);
    
    if (eventDate < now) return null; // Event has passed

    let status = null;
    let Icon = CalendarDays;
    let className = 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50';
    let text = '';
    let type = 'reg_open';

    const formatDate = value => formatRegistrationDay(value, language);

    if(monthlyRegistration(event)) {
        status='opening_expected';Icon=CalendarClock;type='reg_open';
        text=expectedOpeningLabel(language)+': '+monthLabel(event.temporalEvidence.registrationOpen.value,language);
    } else if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) {
        status = 'closed';
        Icon = CalendarX;
        type = 'reg_close';
        text = t('badge_reg_closed');
    } else if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) {
        status = 'opening_soon';
        Icon = CalendarClock;
        type = 'reg_open';
        text = t('badge_reg_opening', { date: formatDate(event.registrationOpensAt) });
        className = 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20';
    } else if (event.registrationOpensAt && new Date(event.registrationOpensAt) <= now && (!event.registrationClosesAt || new Date(event.registrationClosesAt) > now)) {
        status = 'open';
        Icon = CalendarCheck;
        type = 'reg_close'; // the next milestone is closing
        if (event.registrationClosesAt) {
            text = t('badge_reg_open_until', { date: formatDate(event.registrationClosesAt) });
        } else {
            text = t('badge_reg_open_since', { date: formatDate(event.registrationOpensAt) });
            type = 'reg_open'; // fallback
        }
        className = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
    }

    if (!status) return null;

    const gcalUrl = generateGoogleCalendarUrl(event, type);
    const target=type==='reg_open'?'registration_open':'registration_close';
    const inCalendar=calendar.isMarked(event.id,target,event._allIds||[]);
    const keys=calendarIdentifiers(event.id,target,event._allIds||[]);
    const entry=calendar.getCalendarEntry(keys[0],keys.slice(1));
    const expected=registrationCalendarDate(event,type)?.toISOString()||'';
    const needsUpdate=!!entry&&expected&&(entry.allDay||String(entry.start).slice(0,19)!==expected.slice(0,19));
    const labels={pt:['Já no Google Calendar · remover lembrete','Atualizar data no Google Calendar','Queres remover este lembrete de inscrições do Google Calendar?','Não foi possível atualizar o calendário.'],en:['In Google Calendar · remove reminder','Update date in Google Calendar','Remove this registration reminder from Google Calendar?','Could not update the calendar.'],es:['En Google Calendar · eliminar recordatorio','Actualizar fecha en Google Calendar','¿Eliminar este recordatorio del Google Calendar?','No se pudo actualizar el calendario.'],fr:['Dans Google Calendar · supprimer le rappel','Actualiser la date dans Google Calendar','Supprimer ce rappel du Google Calendar ?','Impossible de modifier le calendrier.']}[language]||['In Google Calendar · remove reminder','Update date in Google Calendar','Remove this registration reminder?','Could not update the calendar.'];
    async function act(e){e.preventDefault();e.stopPropagation();setBusy(true);setFailed(false);try{
        if(inCalendar&&!needsUpdate)await removeCalendarEvent(event,{target,confirm:()=>window.confirm(labels[2]),refresh:calendar.refreshCalendar});
        else {const {autoAddToGoogleCalendar}=await import('../utils/calendarExport');await autoAddToGoogleCalendar(event,type,gcalUrl);await calendar.refreshCalendar();}
    }catch{setFailed(true);}finally{setBusy(false);}}

    if (gcalUrl && status !== 'closed') {
        return (
            <span className="inline-flex flex-wrap items-center gap-2"><button
                type="button"
                disabled={busy||Boolean(calendar.isSignedIn&&(calendar.isLoading||calendar.error))}
                onClick={act}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-semibold tracking-wide shrink-0 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${className}`} 
                title={inCalendar?(needsUpdate?labels[1]:labels[0]):text + t('badge_reg_add_calendar')}
                aria-label={(inCalendar?(needsUpdate?labels[1]:labels[0]):text + t('badge_reg_add_calendar'))+': '+event.title}
                aria-pressed={inCalendar&&!needsUpdate}
            >
                {inCalendar&&!needsUpdate?<CalendarCheck size={13} className="shrink-0"/>:<Icon size={13} className="shrink-0" />}
                <span>{text}</span>
                {busy?<LoaderCircle size={13} className="animate-spin"/>:needsUpdate?<CalendarSync size={13}/>:inCalendar?<CalendarMinus size={13}/>:<CalendarPlus size={11} className="ml-0.5 opacity-70" />}
            </button>{failed&&<span role="alert" className="text-xs text-red-500">{labels[3]}</span>}</span>
        );
    }

    return (
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-semibold tracking-wide shrink-0 whitespace-nowrap ${className}`} title={text}>
            <Icon size={13} className="shrink-0" />
            <span>{text}</span>
        </span>
    );
}
