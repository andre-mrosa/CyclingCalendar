"use client";

import { Star, MapPin, Bike, Calendar, Check, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthAbbr, translateEscalao, translateTag, translateAmbito } from '../i18n/formatters';
import { isStageRace, getEventDiscipline } from '../utils/eventClassifier';
import { formatEventLocation } from '../utils/eventLocation';
import FlagIcon from './FlagIcon';

export default function EventCardGrid({ 
    events = [], 
    onSelectEvent, 
    favorites = [], 
    toggleFavorite, 
    isMarked, 
    getDateConflict 
}) {
    const { t, language } = useTranslation();

    const getEventDateParts = (ev) => {
        const rawDate = ev.date || '';
        const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const fullRangeMatch = rawDate.trim().match(/^(\d{1,2})\s*(?:[A-ZÀ-Úa-zà-ú]{3})?(?:\s*\d{4})?\s*(?:a|-|e)\s*(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3})/i);
        
        if (fullRangeMatch && monthAbbrs.includes(fullRangeMatch[3].toUpperCase())) {
            const startDay = fullRangeMatch[1];
            const endDay = fullRangeMatch[2];
            return {
                day: startDay === endDay ? startDay : `${startDay}-${endDay}`,
                month: formatMonthAbbr(fullRangeMatch[3].toUpperCase(), language)
            };
        }

        const dateParts = rawDate.trim().split(/\s+/);
        const day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '—';
        const foundMonth = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || 'MAI';
        return {
            day,
            month: formatMonthAbbr(foundMonth, language)
        };
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {events.map((event) => {
                const { day, month } = getEventDateParts(event);
                const isStage = isStageRace(event);
                const discipline = getEventDiscipline(event);
                const allIds = [event.id, ...(event._allIds || [])];
                const marked = isMarked ? isMarked(event.id, 'event', allIds) : false;
                const dateConflict = getDateConflict ? getDateConflict(event) : { hasConflict: false };
                const isFavorited = favorites.includes(event.id) || (event._allIds && event._allIds.some(id => favorites.includes(id)));

                const translation = event.translations?.find(t => t.language === language) 
                    || (language !== 'pt' ? event.translations?.find(t => t.language === 'en') : null);
                const displayTitle = (language === 'pt' ? event.title : (translation?.title || event.title));
                const displayDetails = (language === 'pt' ? event.details : (translation?.details || event.details));
                const location = formatEventLocation(event);

                return (
                    <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={`group relative flex flex-col justify-between p-5 rounded-2xl bg-surface border border-line hover:border-emerald-500/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer overflow-hidden ${
                            marked ? 'ring-2 ring-emerald-500/40' : ''
                        }`}
                    >
                        {/* Header: Date badge + Actions */}
                        <div>
                            <div className="flex items-start justify-between gap-3 mb-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex flex-col items-center justify-center w-12 h-13 rounded-xl bg-slate-100 dark:bg-slate-900 border border-line group-hover:border-emerald-500/40 text-center transition-colors">
                                        <span className="text-base font-black text-ink leading-tight group-hover:text-emerald-500 transition-colors">
                                            {day}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            {month}
                                        </span>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-col gap-1">
                                        {marked && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                <Check size={10} className="stroke-[3]" /> {t('card_on_agenda')}
                                            </span>
                                        )}
                                        {dateConflict.hasConflict && !marked && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                                <AlertTriangle size={10} /> {t('card_same_day')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(event.id);
                                    }}
                                    className={`p-2 rounded-full transition-all cursor-pointer ${
                                        isFavorited 
                                            ? 'text-yellow-400 bg-yellow-400/15 hover:bg-yellow-400/25' 
                                            : 'text-slate-400 hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title={isFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                >
                                    <Star size={16} fill={isFavorited ? "#facc15" : "none"} stroke={isFavorited ? "#eab308" : "currentColor"} />
                                </button>
                            </div>

                            {/* Title & Category */}
                            <h3 className="text-base font-black text-ink tracking-tight line-clamp-2 group-hover:text-emerald-500 transition-colors mb-2">
                                {displayTitle}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-muted mb-3 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-semibold text-ink">
                                    <Bike size={13} className="text-emerald-500" />
                                    {discipline ? translateTag(discipline, language) : 'Ciclismo'}
                                </span>
                                {event.ambito && event.ambito !== 'Outro / A Definir' && (
                                    <>
                                        <span>•</span>
                                        <span className="text-[11px] font-medium">{translateAmbito(event.ambito, language)}</span>
                                    </>
                                )}
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
                                <FlagIcon code="pt" className="w-3.5 h-2.5 rounded-[2px]" />
                                <span className="truncate">{location}</span>
                            </div>
                        </div>

                        {/* Elevation / Altimetry stylized graph (as in Mockup "Cards premium") */}
                        <div className="mt-2 pt-3 border-t border-line/60">
                            <div className="relative w-full h-8 flex items-end justify-between px-1 opacity-75 group-hover:opacity-100 transition-opacity">
                                <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-full text-emerald-500/40 group-hover:text-emerald-500 transition-colors">
                                    <path 
                                        d="M 0,22 Q 15,18 28,12 T 48,15 T 68,6 T 85,14 L 100,20" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            {/* Bottom row badges */}
                            <div className="flex items-center justify-between mt-2 pt-2 text-[11px] text-muted">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                    {(event.escaloes || []).slice(0, 2).map(esc => translateEscalao(esc, language)).join(' · ')}
                                </span>
                                <div className="flex items-center gap-1 text-emerald-500 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
                                    <span>Detalhes</span>
                                    <ChevronRight size={13} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
