'use client';
import { CalendarDays, CalendarClock, CalendarX, CalendarCheck } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function RegistrationBadge({ opensAt, closesAt, isCancelled, sortDate }) {
    const { language } = useTranslation();
    
    if (isCancelled || !sortDate) return null;
    
    const now = new Date();
    const eventDate = new Date(sortDate);
    eventDate.setHours(23, 59, 59, 999);
    
    if (eventDate < now) return null; // Event has passed

    let status = null;
    let Icon = CalendarDays;
    let className = 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50';
    let text = '';

    if (closesAt && new Date(closesAt) < now) {
        status = 'closed';
        Icon = CalendarX;
        text = language === 'en' ? 'Registrations closed' : 'Inscrições encerradas';
    } else if (opensAt && new Date(opensAt) > now) {
        status = 'opening_soon';
        Icon = CalendarClock;
        const d = new Date(opensAt);
        const dateStr = d.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { day: '2-digit', month: 'short' });
        text = language === 'en' ? `Opens ${dateStr}` : `Abrem a ${dateStr}`;
        className = 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20';
    } else if (opensAt && new Date(opensAt) <= now && (!closesAt || new Date(closesAt) > now)) {
        status = 'open';
        Icon = CalendarCheck;
        text = language === 'en' ? 'Registrations open' : 'Inscrições abertas';
        className = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
    }

    if (!status) return null;

    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${className}`} title={text}>
            <Icon size={12} className="shrink-0" />
            <span>{text}</span>
        </span>
    );
}
