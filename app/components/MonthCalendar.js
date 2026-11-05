'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { monthDays, eventOccursOn, shiftMonth } from '../utils/calendarPresentation';
import styles from './site.module.css';
import Link from 'next/link';
import {eventDateDisplay} from '../utils/eventDateDisplay';
import {eventPath} from '../lib/eventDiscovery';
import {milestoneLabel} from '../utils/calendarMilestones';

const EMPTY=[];
export default function MonthCalendar({ month, events, milestones=EMPTY, selectedDay, onDay, onMonth, expanded = false, showHeader = true }) {
    const { t, language } = useTranslation();
    const days = useMemo(() => monthDays(month).map(day => ({ day, events: day ? events.filter(event => eventOccursOn(event, day)) : [],milestones:day?milestones.filter(item=>item.day===day):[] })), [month, events,milestones]);
    const label = new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z')) + ' ' + month.slice(0, 4);
    const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + index))));
    return <section className={`${styles.monthCalendar} ${expanded ? styles.expandedCalendar : ''}`} aria-label={t('ui_month_calendar')}>
        {showHeader && <header>
            <h2>{label}</h2>
            <div>
                <button type="button" aria-label={t('ui_previous_month')} onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
                <button type="button" aria-label={t('ui_next_month')} onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button>
            </div>
        </header>}
        <div className={styles.monthGrid}>
            {weekdays.map((weekday, index) => <span className={styles.weekdayLabel} key={index}>{weekday}</span>)}
            {days.map(({ day, events: dayEvents,milestones:dayMilestones }, index) => day ? <button key={day} type="button"
                aria-pressed={selectedDay === day}
                aria-label={`${new Intl.DateTimeFormat(language, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))} · ${dayEvents.length} ${t(dayEvents.length === 1 ? 'filter_counter_event' : 'filter_counter_events')}${dayMilestones.map(item=>' · '+milestoneLabel(language,item)+': '+item.title+(item.time?' '+item.time:'')).join('')}`}
                data-events={dayEvents.length+dayMilestones.length > 0} onClick={() => onDay(day)}>
                <span>{Number(day.slice(-2))}</span>
                {expanded && dayEvents.length > 0 && <small className={styles.dayCount} aria-hidden="true">{dayEvents.length}</small>}
                {expanded&&dayMilestones.length>0&&<small className={styles.registrationCount} aria-hidden="true">◷ {dayMilestones.length}</small>}
                {expanded&&dayMilestones.length>0&&<span className={styles.dayRegistrations}>{dayMilestones.slice(0,2).map(item=><span key={item.id} title={milestoneLabel(language,item)+': '+item.title}>{milestoneLabel(language,item)}{item.time?' · '+item.time:''}<br/>{item.title}</span>)}{dayMilestones.length>2&&<small>+{dayMilestones.length-2}</small>}</span>}
                {expanded && <span className={styles.dayEvents}>{dayEvents.slice(0, 2).map(event => <span key={event.id}>{event.title}</span>)}{dayEvents.length > 2 && <small>+{dayEvents.length - 2}</small>}</span>}
            </button> : <span aria-hidden="true" key={`empty-${index}`} />)}
        </div>
        {events.some(event=>eventDateDisplay(event).precision==='month'&&eventDateDisplay(event).key===month)&&<div className="mt-4 border-t border-line pt-4"><h3 className="text-sm font-semibold">— {t('planning_date_unconfirmed')}</h3>{events.filter(event=>eventDateDisplay(event).precision==='month'&&eventDateDisplay(event).key===month).map(event=><p key={event.id} className="mt-2"><Link href={eventPath(event)} className="text-brand hover:underline">{event.title}</Link></p>)}</div>}
    </section>;
}
