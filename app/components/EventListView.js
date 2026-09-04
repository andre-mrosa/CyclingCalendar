"use client";

import { Fragment } from 'react';
import { Star, MapPin, Bike, Check, AlertTriangle, ChevronRight, Calendar } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthAbbr, translateEscalao, translateTag, translateAmbito } from '../i18n/formatters';
import { isStageRace, getEventDiscipline } from '../utils/eventClassifier';
import { formatEventLocation } from '../utils/eventLocation';
import FlagIcon from './FlagIcon';

export default function EventListView({
    events = [],
    onSelectEvent,
    favorites = [],
    toggleFavorite,
    isMarked,
    getDateConflict,
    visibleCount
}) {
    const { t, language } = useTranslation();

    const getMonthYearInfo = (ev) => {
        const rawDate = ev.date || '';
        const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const parts = rawDate.trim().split(/\s+/);
        const foundMonth = parts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || 'MAI';
        const monthIdx = monthAbbrs.indexOf(foundMonth);
        const year = ev.year || new Date().getFullYear();
        return { key: `${year}-${monthIdx}`, year, monthIdx: monthIdx !== -1 ? monthIdx : 4 };
    };

    const displayEvents = visibleCount ? events.slice(0, visibleCount) : events;

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="flex flex-col gap-3">
            {displayEvents.map((event, idx, currentArray) => {
                const currentMY = getMonthYearInfo(event);
                const prevMY = idx > 0 ? getMonthYearInfo(currentArray[idx - 1]) : null;
                const isNewMonth = !prevMY || currentMY.key !== prevMY.key;
                const monthHeading = isNewMonth ? (monthNames[currentMY.monthIdx] || '') : '';

                const rawDate = event.date || '';
                const isStage = isStageRace(event);
                const discipline = getEventDiscipline(event);
                const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

                let day = '';
                let month = '';
                const fullRangeMatch = rawDate.trim().match(/^(\d{1,2})\s*(?:[A-ZÀ-Úa-zà-ú]{3})?(?:\s*\d{4})?\s*(?:a|-|e)\s*(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3})/i);
                if (fullRangeMatch && monthAbbrs.includes(fullRangeMatch[3].toUpperCase())) {
                    const startDay = fullRangeMatch[1];
                    const endDay = fullRangeMatch[2];
                    month = fullRangeMatch[3].toUpperCase();
                    day = startDay === endDay ? startDay : `${startDay}-${endDay}`;
                } else {
                    const dateParts = rawDate.trim().split(/\s+/);
                    day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '01';
                    month = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || 'MAI';
                }

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
                    <Fragment key={event.id}>
                        {isNewMonth && (
                            <div className="flex items-center justify-between mt-6 mb-2 pt-4 pb-2 border-b border-line">
                                <h3 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-baseline gap-2">
                                    <span>{monthHeading}</span>
                                    <span className="text-muted font-normal text-sm">{currentMY.year}</span>
                                </h3>
                            </div>
                        )}

                        <div
                            onClick={() => onSelectEvent(event)}
                            className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-surface border border-line hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer ${
                                marked ? 'ring-2 ring-emerald-500/40 bg-emerald-500/5' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                {/* Date Square Badge */}
                                <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-line group-hover:border-emerald-500/40 shrink-0 text-center transition-colors">
                                    <span className="text-base sm:text-lg font-black text-ink leading-none group-hover:text-emerald-500 transition-colors">
                                        {day}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                                        {formatMonthAbbr(month, language)}
                                    </span>
                                </div>

                                {/* Event Details */}
                                <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm sm:text-base font-bold text-ink truncate group-hover:text-emerald-500 transition-colors">
                                            {displayTitle}
                                        </h4>
                                        {isStage && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
                                                Etapas
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center flex-wrap gap-2 text-xs text-muted">
                                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                                            <Bike size={12} className="text-emerald-500 shrink-0" />
                                            <span>{discipline ? translateTag(discipline, language) : 'Ciclismo'}</span>
                                        </span>
                                        {event.ambito && event.ambito !== 'Outro / A Definir' && (
                                            <>
                                                <span>•</span>
                                                <span className="text-[11px]">{translateAmbito(event.ambito, language)}</span>
                                            </>
                                        )}
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1 truncate">
                                            <FlagIcon code="pt" className="w-3.5 h-2 rounded-[2px]" />
                                            <span className="truncate">{location}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(event.id);
                                    }}
                                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                                        isFavorited 
                                            ? 'text-yellow-500 bg-yellow-400/15' 
                                            : 'text-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title={isFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                    aria-label={isFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                >
                                    <Star size={16} fill={isFavorited ? "#facc15" : "none"} stroke={isFavorited ? "#eab308" : "currentColor"} />
                                </button>

                                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-line text-xs font-bold text-ink group-hover:border-emerald-500/40 group-hover:text-emerald-500 transition-colors">
                                    <span>Ver prova</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            })}
        </div>
    );
}
