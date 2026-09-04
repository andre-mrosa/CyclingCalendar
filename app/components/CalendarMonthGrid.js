"use client";

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Bike } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthHeading } from '../i18n/formatters';

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export default function CalendarMonthGrid({ events = [], onSelectEvent, initialYear, initialMonth }) {
    const { t, language } = useTranslation();
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(initialYear || today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(initialMonth !== undefined ? initialMonth : today.getMonth());
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
        setSelectedDayEvents(null);
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
        setSelectedDayEvents(null);
    };

    const jumpToToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDayEvents(null);
    };

    // Parse events into calendar map: "YYYY-MM-DD" -> [events]
    const eventsByDate = useMemo(() => {
        const map = new Map();
        const monthAbbrsPt = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

        events.forEach(ev => {
            let evYear = currentYear;
            let evMonth = currentMonth;
            let evDays = [];

            if (ev.sortDate) {
                const d = new Date(ev.sortDate);
                if (!isNaN(d.getTime())) {
                    evYear = d.getFullYear();
                    evMonth = d.getMonth();
                    evDays = [d.getDate()];
                }
            } else if (ev.date) {
                const rawDate = ev.date;
                const matchYear = rawDate.match(/20\d\d/);
                if (matchYear) evYear = parseInt(matchYear[0], 10);

                const foundIdx = monthAbbrsPt.findIndex(m => rawDate.toUpperCase().includes(m));
                if (foundIdx !== -1) evMonth = foundIdx;

                const fullRangeMatch = rawDate.trim().match(/^(\d{1,2})\s*(?:[A-ZÀ-Úa-zà-ú]{3})?(?:\s*\d{4})?\s*(?:a|-|e)\s*(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3})/i);
                if (fullRangeMatch) {
                    const start = parseInt(fullRangeMatch[1], 10);
                    const end = parseInt(fullRangeMatch[2], 10);
                    if (start <= end && end - start <= 10) {
                        for (let i = start; i <= end; i++) evDays.push(i);
                    } else {
                        evDays.push(start);
                    }
                } else {
                    const parts = rawDate.trim().split(/\s+/);
                    const dayNum = parseInt(parts[0], 10);
                    if (!isNaN(dayNum)) evDays.push(dayNum);
                }
            }

            evDays.forEach(day => {
                const key = `${evYear}-${String(evMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(ev);
            });
        });

        return map;
    }, [events, currentYear, currentMonth]);

    // Build the monthly grid matrix
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Day of week: 0 is Sun, 1 is Mon... in PT we want Mon=0, Sun=6
        let startDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        const totalDays = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

        const cells = [];

        // Previous month padding
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const key = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            cells.push({
                day: dayNum,
                isCurrentMonth: false,
                dateKey: key,
                events: eventsByDate.get(key) || []
            });
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
            cells.push({
                day,
                isCurrentMonth: true,
                isToday,
                dateKey: key,
                events: eventsByDate.get(key) || []
            });
        }

        // Next month padding to fill complete grid of rows
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let day = 1; day <= remaining; day++) {
            const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const key = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cells.push({
                day,
                isCurrentMonth: false,
                dateKey: key,
                events: eventsByDate.get(key) || []
            });
        }

        return cells;
    }, [currentYear, currentMonth, eventsByDate, today]);

    const getDisciplinePillStyle = (ev) => {
        const disc = (ev.modalidade || ev.tipo || '').toLowerCase();
        const ambito = (ev.ambito || '').toLowerCase();

        if (disc.includes('btt') || disc.includes('xcm') || disc.includes('xco') || disc.includes('dhi')) {
            return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25';
        }
        if (disc.includes('gravel')) {
            return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25';
        }
        if (ambito.includes('granfondo') || disc.includes('granfondo') || disc.includes('lazer') || disc.includes('cicloturismo')) {
            return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/25';
        }
        // Estrada / Geral / Default
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25';
    };

    return (
        <div className="w-full bg-surface rounded-2xl border border-line shadow-sm overflow-hidden transition-colors">
            {/* Month Navigator Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-line bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-line rounded-xl p-0.5 shadow-xs">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-ink transition-colors cursor-pointer"
                            title="Mês anterior"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-ink transition-colors cursor-pointer"
                            title="Mês seguinte"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-baseline gap-2">
                        <span>{monthNames[currentMonth]}</span>
                        <span className="text-muted font-normal text-lg">{currentYear}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={jumpToToday}
                        className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-ink text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                        Hoje
                    </button>
                </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-line bg-slate-50 dark:bg-slate-900/60 text-center text-xs font-bold text-muted py-2.5">
                {WEEKDAYS.map(day => (
                    <div key={day} className="tracking-wider uppercase text-[11px] sm:text-xs">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-line/60 bg-line/20">
                {calendarDays.map((cell, idx) => {
                    const hasEvents = cell.events.length > 0;

                    return (
                        <div
                            key={idx}
                            onClick={() => {
                                if (hasEvents) {
                                    setSelectedDayEvents({ date: cell.dateKey, day: cell.day, events: cell.events });
                                }
                            }}
                            className={`min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2 bg-surface transition-colors flex flex-col justify-between ${
                                !cell.isCurrentMonth ? 'opacity-35 bg-slate-50/50 dark:bg-slate-950/40' : ''
                            } ${hasEvents ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span
                                    className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                                        cell.isToday
                                            ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                            : cell.isCurrentMonth
                                            ? 'text-ink'
                                            : 'text-muted'
                                    }`}
                                >
                                    {cell.day}
                                </span>

                                {hasEvents && (
                                    <span className="text-[10px] font-bold text-muted hidden sm:inline-block">
                                        {cell.events.length}
                                    </span>
                                )}
                            </div>

                            {/* Event Pills */}
                            <div className="flex flex-col gap-1 overflow-hidden mt-0.5">
                                {cell.events.slice(0, 3).map(ev => {
                                    const pillClass = getDisciplinePillStyle(ev);
                                    return (
                                        <button
                                            key={ev.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectEvent(ev);
                                            }}
                                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold truncate border transition-all cursor-pointer ${pillClass}`}
                                            title={ev.title}
                                        >
                                            {ev.title}
                                        </button>
                                    );
                                })}

                                {cell.events.length > 3 && (
                                    <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 pl-1">
                                        +{cell.events.length - 3} mais
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile/Selected Day Detail Drawer/Card */}
            {selectedDayEvents && (
                <div className="p-4 sm:p-5 border-t border-line bg-slate-50/70 dark:bg-slate-900/60 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-ink">
                                Provas em {selectedDayEvents.day} de {monthNames[currentMonth]} ({selectedDayEvents.events.length})
                            </h3>
                        </div>
                        <button
                            onClick={() => setSelectedDayEvents(null)}
                            className="text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {selectedDayEvents.events.map(ev => (
                            <div
                                key={ev.id}
                                onClick={() => onSelectEvent(ev)}
                                className="p-3 rounded-xl bg-surface border border-line hover:border-emerald-500/50 shadow-xs cursor-pointer transition-all flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-ink truncate hover:text-emerald-500 transition-colors">
                                        {ev.title}
                                    </h4>
                                    <p className="text-[11px] text-muted truncate mt-0.5">
                                        {ev.modalidade || ev.tipo || 'Estrada'} {ev.distrito ? `· ${ev.distrito}` : ''}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                    Ver Detalhes
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
