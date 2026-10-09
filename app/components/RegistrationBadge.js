'use client';
import { CalendarDays, CalendarClock, CalendarX, CalendarCheck, CalendarPlus } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { generateGoogleCalendarUrl } from '../utils/calendarExport';

export default function RegistrationBadge({ event, isCancelled }) {
    const { language } = useTranslation();
    
    if (isCancelled || !event.sortDate) return null;
    
    const now = new Date();
    const eventDate = new Date(event.sortDate);
    eventDate.setHours(23, 59, 59, 999);
    
    if (eventDate < now) return null; // Event has passed

    let status = null;
    let Icon = CalendarDays;
    let className = 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50';
    let text = '';
    let type = 'reg_open';

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { day: '2-digit', month: 'short' });
    };

    if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) {
        status = 'closed';
        Icon = CalendarX;
        type = 'reg_close';
        text = language === 'en' ? 'Registrations closed' : 'Inscrições encerradas';
    } else if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) {
        status = 'opening_soon';
        Icon = CalendarClock;
        type = 'reg_open';
        text = language === 'en' ? `Opens ${formatDate(event.registrationOpensAt)}` : `Abrem a ${formatDate(event.registrationOpensAt)}`;
        className = 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20';
    } else if (event.registrationOpensAt && new Date(event.registrationOpensAt) <= now && (!event.registrationClosesAt || new Date(event.registrationClosesAt) > now)) {
        status = 'open';
        Icon = CalendarCheck;
        type = 'reg_close'; // the next milestone is closing
        if (event.registrationClosesAt) {
            text = language === 'en' ? `Open until ${formatDate(event.registrationClosesAt)}` : `Abertas até ${formatDate(event.registrationClosesAt)}`;
        } else {
            text = language === "en" ? `Open since ${formatDate(event.registrationOpensAt)}` : `Abertas desde ${formatDate(event.registrationOpensAt)}`;
            type = 'reg_open'; // fallback
        }
        className = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
    }

    if (!status) return null;

    const gcalUrl = generateGoogleCalendarUrl(event, type);

    if (gcalUrl && status !== 'closed') {
        return (
            <a 
                href="#" 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    import('../utils/calendarExport').then(m => m.autoAddToGoogleCalendar(event, type, gcalUrl));
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-semibold tracking-wide shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`} 
                title={text + ' (Adicionar ao Google Calendar)'}
            >
                <Icon size={13} className="shrink-0" />
                <span>{text}</span>
                <CalendarPlus size={11} className="ml-0.5 opacity-70" />
            </a>
        );
    }

    return (
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-semibold tracking-wide shrink-0 ${className}`} title={text}>
            <Icon size={13} className="shrink-0" />
            <span>{text}</span>
        </span>
    );
}
