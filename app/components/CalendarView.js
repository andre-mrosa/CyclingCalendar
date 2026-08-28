"use client";
import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import useSWR from 'swr';

import { Calendar, MapPin, Search, X, ChevronLeft, ChevronRight, Users, Heart, Star, LayoutGrid, List, HelpCircle, Filter, Bike, AlertTriangle, Check, CalendarCheck, History, WifiOff, Download, Clock } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { filterEvents } from '../utils/filterEvents';
import { mergeEvents } from '../utils/mergeEvents';
import { exportEventsToICS } from '../utils/exportCalendar';
import EventModal from './EventModal';
import EscalaoAssistant from './EscalaoAssistant';
import { trackEvent } from './AnalyticsTracker';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthAbbr, translateDateString, translateEscalao, translateAmbito, translateLicenca, translateTag } from '../i18n/formatters';
import { isStageRace, getEventDiscipline } from '../utils/eventClassifier';

const fetcher = (url) => fetch(url).then((res) => res.json()).then((data) => {
    if (!data.success) throw new Error(data.error || 'Failed to load events');
    return data.events;
});

const EMPTY_EVENTS = [];

const getMonthYearInfo = (ev) => {
    if (ev.sortDate) {
        const d = new Date(ev.sortDate);
        if (!isNaN(d.getTime())) {
            return {
                year: d.getFullYear(),
                monthIdx: d.getMonth(),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            };
        }
    }
    const rawDate = ev.date || '';
    const matchYear = rawDate.match(/20\d\d/);
    const year = matchYear ? parseInt(matchYear[0], 10) : new Date().getFullYear();
    const monthAbbrsPt = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const foundIdx = monthAbbrsPt.findIndex(m => rawDate.toUpperCase().includes(m));
    const monthIdx = foundIdx !== -1 ? foundIdx : 0;
    return {
        year,
        monthIdx,
        key: `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    };
};

const formatMonthHeading = (year, monthIdx, lang) => {
    const localeMap = { pt: 'pt-PT', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[lang] || 'pt-PT';
    try {
        const d = new Date(year, monthIdx, 1);
        const name = d.toLocaleDateString(locale, { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
        const fallback = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return fallback[monthIdx] || '';
    }
};

export default function CalendarView({ 
    pageTitle = "Calendário FPC & Cabreira", 
    pageSubtitle = "Agregador oficial de ciclismo em Portugal",
    forceAmbito = null,
    forceLicenca = null,
    forceEscalao = null,
    filterByFavorites = false,
    filterByAgenda = false,
    activeFilters = ['search', 'year', 'month', 'escalao', 'ambito', 'licenca', 'regiao'],
    applyDefaultRegiao = false
}) {
    const { t, language } = useTranslation();
    const { 
        defaultEscalao, 
        defaultRegiao,
        selectedSources 
    } = useSettingsStore();
    
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [showEscalaoHelp, setShowEscalaoHelp] = useState(false);
    const [selectedEscaloes, setSelectedEscaloes] = useState(forceEscalao ? [forceEscalao] : []);
    const [selectedAmbito, setSelectedAmbito] = useState(forceAmbito || 'Todos');
    const [selectedLicenca, setSelectedLicenca] = useState(forceLicenca || 'Todas');
    const [selectedRegiao, setSelectedRegiao] = useState('Todas');
    const [selectedDistrito, setSelectedDistrito] = useState('Todos');
    const currentYear = new Date().getFullYear();
    const [selectedYears, setSelectedYears] = useState([
        currentYear.toString(),
        (currentYear + 1).toString()
    ]);
    const hasInitializedYearsRef = useRef(false);
    const [monthFrom, setMonthFrom] = useState(1);
    const [monthTo, setMonthTo] = useState(12);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedType, setSelectedType] = useState('Todos');
    const [pastEventsFilter, setPastEventsFilter] = useState('futuros');
    const [visibleCount, setVisibleCount] = useState(15);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const loaderRef = useRef(null);

    const { favorites, toggleFavorite, isSignedIn } = useFavorites();
    const { markedSet, isMarked, getDateConflict } = useCalendarEvents();

    // Offline detection
    useEffect(() => {
        setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync settings on mount
    useEffect(() => {
        if (forceEscalao) setSelectedEscaloes([forceEscalao]);
        else if (defaultEscalao && defaultEscalao !== 'Todos') setSelectedEscaloes([defaultEscalao]);
        else setSelectedEscaloes([]);

        if (forceAmbito) setSelectedAmbito(forceAmbito);
        else setSelectedAmbito('Todos');

        if (forceLicenca) setSelectedLicenca(forceLicenca);
        else setSelectedLicenca('Todas');

        if (defaultRegiao && applyDefaultRegiao) {
            setSelectedRegiao(defaultRegiao);
        }
    }, [defaultEscalao, defaultRegiao, forceEscalao, forceAmbito, forceLicenca, applyDefaultRegiao]);

    const effectiveSources = (selectedSources && selectedSources.length > 0) ? selectedSources : ['FPC', 'Cabreira', 'Stop and Go'];
    const { data: fetchedEvents, error, isLoading: loading, mutate } = useSWR(
        `/api/events?years=all&sources=${effectiveSources.join(',')}`,
        fetcher,
        {
            revalidateOnFocus: false, // Don't refetch on tab switch
            revalidateIfStale: false,
            dedupingInterval: 120000 // Cache for 2 minutes in memory
        }
    );

    const [mounted, setMounted] = useState(false);
    const [localCachedEvents, setLocalCachedEvents] = useState([]);

    // Load offline cache on mount to prevent SSR hydration mismatch
    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('cycling_calendar_cached_events');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setLocalCachedEvents(parsed);
                    }
                }
            } catch (e) {}
        }
    }, []);

    // Save fetched events to offline localStorage cache
    useEffect(() => {
        if (fetchedEvents && Array.isArray(fetchedEvents) && fetchedEvents.length > 0) {
            try {
                localStorage.setItem('cycling_calendar_cached_events', JSON.stringify(fetchedEvents));
            } catch (e) {}
        }
    }, [fetchedEvents]);

    const events = useMemo(() => {
        if (fetchedEvents && fetchedEvents.length > 0) {
            return mergeEvents(fetchedEvents);
        }
        if (localCachedEvents && localCachedEvents.length > 0) {
            return mergeEvents(localCachedEvents);
        }
        return EMPTY_EVENTS;
    }, [fetchedEvents, localCachedEvents]);

    // Deep linking: Auto-open modal if ?event=ID is present in URL
    useEffect(() => {
        if (typeof window !== 'undefined' && events && events.length > 0) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const eventId = urlParams.get('event');
                if (eventId && !selectedEvent) {
                    const target = events.find(e => String(e.id) === String(eventId) || (e._allIds && e._allIds.map(String).includes(String(eventId))));
                    if (target) {
                        setSelectedEvent(target);
                    }
                }
            } catch (e) {}
        }
    }, [events, selectedEvent]);

    const isInitialLoading = !mounted || (loading && events.length === 0);

    // Track search queries with debounce
    useEffect(() => {
        if (!searchTerm || searchTerm.trim().length < 3) return;
        const timer = setTimeout(() => {
            trackEvent('SEARCH', {
                path: typeof window !== 'undefined' ? window.location.pathname : '/',
                metadata: { query: searchTerm.trim() }
            });
        }, 1500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        let filtered = filterEvents(events, {
            filterByFavorites, favorites,
            filterByAgenda, markedSet,
            searchTerm,
            selectedYears,
            selectedEscaloes: forceEscalao ? [forceEscalao] : selectedEscaloes,
            selectedAmbito: forceAmbito || selectedAmbito,
            selectedLicenca: forceLicenca || selectedLicenca,
            selectedRegiao,
            selectedDistrito,
            monthFrom,
            monthTo,
            selectedTags,
            selectedType
        });

        if (pastEventsFilter === 'futuros') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => {
                const evYear = e.sortDate ? new Date(e.sortDate).getFullYear().toString() : null;
                // Se o utilizador selecionou explicitamente um ano anterior ao ano corrente (ex: 2024, 2025),
                // não devemos apagar os eventos desse ano só porque a data já passou!
                if (evYear && selectedYears.includes(evYear) && parseInt(evYear) < today.getFullYear()) {
                    return true;
                }
                return !e.sortDate || new Date(e.sortDate) >= today;
            });
        } else if (pastEventsFilter === 'passados') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => e.sortDate && new Date(e.sortDate) < today);
        }

        setFilteredEvents(filtered);
        setVisibleCount(15); // Reset visible count on filter change
    }, [events, searchTerm, selectedYears, selectedEscaloes, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags, selectedType, pastEventsFilter, filterByFavorites, favorites, forceEscalao, forceAmbito, forceLicenca]);

    const uniqueEscaloes = ['Elite', 'Elite Amador', 'Sub-23', 'Sub-19 (Juniores)', 'Sub-17 (Cadetes)', 'Sub-15 (Juvenis)', 'Masters / Veteranos', 'Femininas', 'Escolas', 'Profissional (UCI)', 'Todos (Aberto)', 'Geral / Vários'];
    const uniqueAmbitos = ['Todos', ...new Set(events.map(e => e.ambito))];
    const uniqueLicencas = ['Todas', ...new Set(events.filter(e => e.licenca).map(e => e.licenca))];
    
    const TODAS_AS_REGIOES = [
        'AC Minho', 'AC Porto', 'AC Vila Real', 'AC Beira Litoral', 'AC Beira Alta',
        'AC Beira Interior', 'AC Santarém', 'AC Setúbal', 'AC Algarve', 'AC Madeira', 'AC Açores'
    ];
    const uniqueRegioes = ['Todas', ...new Set([...TODAS_AS_REGIOES, ...events.map(e => e.regiao).filter(r => r)])];
    const distritosList = [...new Set(events.map(e => e.distrito).filter(d => d))].sort();
    const uniqueDistritos = ['Todos', ...distritosList];
    const availableTags = [...new Set(events.map(e => getEventDiscipline(e)).filter(Boolean))].sort();

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const eventYears = useMemo(() => {
        return [...new Set(events.map(e => e.sortDate ? new Date(e.sortDate).getFullYear().toString() : (e.date ? e.date.match(/20\d\d/)?.[0] : null)).filter(Boolean))].sort();
    }, [events]);

    const defaultYearsList = useMemo(() => [
        (currentYear - 2).toString(),
        (currentYear - 1).toString(),
        currentYear.toString(),
        (currentYear + 1).toString()
    ], [currentYear]);

    const availableYears = useMemo(() => {
        return Array.from(new Set([...defaultYearsList, ...eventYears])).sort();
    }, [defaultYearsList, eventYears]);

    const getDefaultSelectedYears = (evYears = eventYears) => {
        const currYr = new Date().getFullYear();
        const futureAndCurrentYears = (evYears || [])
            .filter(y => {
                const parsed = parseInt(y, 10);
                return !isNaN(parsed) && parsed >= currYr;
            });
        return futureAndCurrentYears.length > 0 
            ? Array.from(new Set([currYr.toString(), ...futureAndCurrentYears])).sort()
            : [currYr.toString(), (currYr + 1).toString()];
    };

    // Auto-select current year and all available upcoming years once events load
    useEffect(() => {
        if (!hasInitializedYearsRef.current && events && events.length > 0) {
            setSelectedYears(getDefaultSelectedYears(eventYears));
            hasInitializedYearsRef.current = true;
        }
    }, [events, eventYears]);

    const onSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());
    const onYearToggle = (y) => {
        const newYears = selectedYears.includes(y) 
            ? selectedYears.filter(yr => yr !== y) 
            : [...selectedYears, y];
        if (newYears.length > 0) setSelectedYears(newYears);
    };
    
    const onMonthFromChange = (e) => {
        const val = parseInt(e.target.value);
        setMonthFrom(val);
        if (monthTo < val) setMonthTo(val);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setVisibleCount(15);
    };
    
    const onMonthToChange = (e) => {
        const val = parseInt(e.target.value);
        setMonthTo(val);
        if (monthFrom > val) setMonthFrom(val);
    };
    
    const onTagToggle = (tag) => {
        const newTags = selectedTags.includes(tag) 
            ? selectedTags.filter(t => t !== tag) 
            : [...selectedTags, tag];
        setSelectedTags(newTags);
    };

    const onEscalaoToggle = (esc) => {
        const newEsc = selectedEscaloes.includes(esc)
            ? selectedEscaloes.filter(e => e !== esc)
            : [...selectedEscaloes, esc];
        setSelectedEscaloes(newEsc);
    };

    const clearAllFilters = () => {
        setSelectedEscaloes(forceEscalao ? [forceEscalao] : (defaultEscalao && defaultEscalao !== 'Todos' ? [defaultEscalao] : []));
        setSelectedAmbito(forceAmbito || 'Todos');
        setSelectedLicenca(forceLicenca || 'Todas');
        setSelectedRegiao((defaultRegiao && applyDefaultRegiao) ? defaultRegiao : 'Todas');
        setSelectedDistrito('Todos');
        setSelectedYears(getDefaultSelectedYears());
        setMonthFrom(1);
        setMonthTo(12);
        setSelectedTags([]);
        setSelectedType('Todos');
        setPastEventsFilter('futuros');
        setSearchTerm('');
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && filteredEvents.length > visibleCount) {
                    setVisibleCount((prev) => Math.min(prev + 15, filteredEvents.length));
                }
            },
            { rootMargin: '300px 0px', threshold: 0 }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [filteredEvents.length, visibleCount]);

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 pt-4 sm:pt-8 pb-24 sm:pb-16 px-3 sm:px-8 transition-colors duration-200">
            <div className="w-full max-w-6xl mx-auto">
            <header className="mb-6 sm:mb-8">
                {isOffline && (
                    <div className="mb-3.5 py-2 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-fade-in shadow-sm">
                        <WifiOff size={15} className="text-amber-500 shrink-0" />
                        <span>{t('offline_mode_banner')}</span>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center w-full gap-3 sm:gap-4">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center justify-center gap-2 h-10 px-2.5 sm:px-3.5 rounded-xl border font-semibold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                                showFilters 
                                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <Filter size={15} className="shrink-0" />
                            <span className="truncate">{showFilters ? t('filter_button_close') : t('filter_button_open')}</span>
                        </button>

                        {/* Toggle Switch para Ver Provas Passadas (Default: Futuros) */}
                        <button 
                            type="button"
                            onClick={() => setPastEventsFilter(prev => prev === 'passados' ? 'futuros' : 'passados')}
                            className={`inline-flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2.5 h-10 px-2.5 sm:px-3.5 rounded-xl border text-[11.5px] min-[380px]:text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                                pastEventsFilter === 'passados' 
                                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-sm' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                            title={pastEventsFilter === 'passados' ? t('filter_past_title_past') : t('filter_past_title_upcoming')}
                        >
                            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                                <History size={14} className={`shrink-0 ${pastEventsFilter === 'passados' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`} />
                                <span className="truncate">{t('filter_past_events')}</span>
                            </div>
                            
                            {/* Smooth Pill Switch */}
                            <div className={`w-7 sm:w-8 h-4 sm:h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center shrink-0 ${
                                pastEventsFilter === 'passados' ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                            }`}>
                                <div className="w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-white shadow-sm"></div>
                            </div>
                        </button>
                        
                        {(selectedEscaloes.length > 0 || selectedDistrito !== 'Todos' || selectedRegiao !== 'Todas' || selectedTags.length > 0 || selectedType !== 'Todos' || monthFrom !== 1 || monthTo !== 12 || searchTerm !== '' || pastEventsFilter !== 'futuros') && (
                            <button 
                                onClick={clearAllFilters}
                                title={t('filter_clear_all')}
                                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1 font-medium text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors h-8 sm:h-10 px-2 cursor-pointer"
                            >
                                <X size={14} /> {t('filter_clear_all')}
                            </button>
                        )}
                    </div>
                    
                    <div className="relative w-full sm:w-auto sm:flex-[0_1_320px]">
                        <input 
                            type="text" 
                            placeholder={t('search_placeholder')} 
                            value={searchTerm} 
                            onChange={onSearchChange} 
                            className="w-full py-2 sm:py-2.5 pl-4 sm:pl-5 pr-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm outline-none transition-colors focus:border-blue-500 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 flex items-center justify-center rounded-full"
                                title="Limpar pesquisa"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-header info: Counter & Bulk Export */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <span>{t('filter_counter_showing')} <strong className="text-slate-800 dark:text-slate-200 font-semibold">{Math.min(visibleCount, filteredEvents.length)}</strong> {t('filter_counter_of')} <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredEvents.length}</strong> {filteredEvents.length === 1 ? t('filter_counter_event') : t('filter_counter_events')}</span>
                        {events.length > 0 && filteredEvents.length !== events.length && (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">({events.length} {t('filter_counter_total')})</span>
                        )}
                    </div>

                    {(filterByAgenda || filterByFavorites) && filteredEvents.length > 0 && (
                        <button
                            onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                                exportEventsToICS(filteredEvents, filterByAgenda ? 'minha_agenda.ics' : 'favoritos.ics');
                                trackEvent('ICS_EXPORT', {
                                    metadata: { page: pageTitle, count: filteredEvents.length }
                                });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-auto"
                            title={t('filter_export_ics')}
                        >
                            <Download size={13} />
                            <span>{t('filter_export_ics')}</span>
                        </button>
                    )}
                </div>
                
                {showFilters && (
                    <div className="mt-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                            {activeFilters.includes('year') && (
                                <div className="flex flex-col gap-2 col-span-full">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_years')}</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {availableYears.map(y => (
                                            <button 
                                                key={y} 
                                                onClick={() => onYearToggle(y)} 
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none cursor-pointer ${selectedYears.includes(y) ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('month') && (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_start_month')}</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                            value={monthNames[monthFrom - 1]} 
                                            onChange={(e) => onMonthFromChange({target:{value: monthNames.indexOf(e.target.value) + 1}})} 
                                        >
                                            {monthNames.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_end_month')}</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                            value={monthNames[monthTo - 1]} 
                                            onChange={(e) => onMonthToChange({target:{value: monthNames.indexOf(e.target.value) + 1}})} 
                                        >
                                            {monthNames.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            {activeFilters.includes('escalao') && !forceEscalao && (
                                <div className="flex flex-col gap-2 col-span-full">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">{t('filter_categories')}</label>
                                        <button 
                                            onClick={() => setShowEscalaoHelp(true)}
                                            title={t('escalao_modal_desc')}
                                            className="text-blue-500 hover:text-blue-400 p-0 -mt-[2px] flex items-center justify-center transition-colors"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {uniqueEscaloes.map(esc => (
                                            <button 
                                                key={esc} 
                                                onClick={() => onEscalaoToggle(esc)} 
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedEscaloes.includes(esc) ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                                            >
                                                {translateEscalao(esc, language)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('ambito') && !forceAmbito && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_scope')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedAmbito} 
                                        onChange={(e) => setSelectedAmbito(e.target.value)} 
                                    >
                                        {uniqueAmbitos.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 'Todos' ? t('filter_all_scopes') : translateAmbito(opt, language)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {activeFilters.includes('licenca') && !forceLicenca && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_license')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedLicenca} 
                                        onChange={(e) => setSelectedLicenca(e.target.value)} 
                                    >
                                        {uniqueLicencas.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 'Todas' ? t('filter_all_licenses') : translateLicenca(opt, language)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_event_type')}</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                    value={selectedType} 
                                    onChange={(e) => setSelectedType(e.target.value)} 
                                >
                                    <option value="Todos">{t('filter_all_types')}</option>
                                    <option value="Etapas">{t('filter_stages')}</option>
                                    <option value="Um Dia">{t('filter_single_day')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_past_upcoming')}</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                    value={pastEventsFilter} 
                                    onChange={(e) => setPastEventsFilter(e.target.value)} 
                                >
                                    <option value="todos">{t('filter_all_events')}</option>
                                    <option value="futuros">{t('filter_upcoming_only')}</option>
                                    <option value="passados">{t('filter_past_only')}</option>
                                </select>
                            </div>
                            
                            {activeFilters.includes('regiao') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_region')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedRegiao} 
                                        onChange={(e) => setSelectedRegiao(e.target.value)} 
                                    >
                                        {uniqueRegioes.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 'Todas' ? t('filter_all_regions') : opt}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {activeFilters.includes('distrito') && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">{t('filter_district')}</label>
                                        {selectedDistrito !== 'Todos' && (
                                            <button 
                                                onClick={() => setSelectedDistrito('Todos')}
                                                title={t('filter_clear_all')}
                                                className="text-blue-500 hover:text-blue-400 p-0 -mt-[2px] flex items-center justify-center transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedDistrito} 
                                        onChange={(e) => setSelectedDistrito(e.target.value)} 
                                    >
                                        {uniqueDistritos.map(opt => (
                                            <option key={opt} value={opt}>
                                                {opt === 'Todos' ? t('filter_all_districts') : opt}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {activeFilters.includes('modalidade') && (
                            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 block mb-3">
                                    {t('filter_modalities')}
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => onTagToggle(tag)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedTags.includes(tag) ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                                    >
                                        {translateTag(tag, language)}
                                    </button>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main>
                {isInitialLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p>{t('action_loading_events')}</p>
                    </div>
                )}

                {!isInitialLoading && error && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <p className="text-red-400">{t('error_occurred')}: {error.message || error}</p>
                        <button 
                            onClick={() => mutate()}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border-none cursor-pointer font-medium"
                        >
                            {t('btn_try_again')}
                        </button>
                    </div>
                )}

                {!isInitialLoading && (!error || events.length > 0) && filteredEvents.length === 0 && (() => {
                    const associationLinks = {
                        'AC Minho': 'https://www.acm.pt/',
                        'AC Porto': 'https://acporto.org/',
                        'AC Vila Real': 'https://www.acvilareal.com/',
                        'AC Beira Litoral': 'http://www.acbeiralitoral.pt/',
                        'AC Beira Alta': 'https://www.facebook.com/acbeiraalta',
                        'AC Beira Interior': 'https://ac-beirainterior.net/',
                        'AC Santarém': 'https://ciclismosantarem.wixsite.com/ciclismo',
                        'AC Setúbal': 'https://www.facebook.com/acsetubal/',
                        'AC Algarve': 'https://www.ciclismoalgarve.pt/',
                        'AC Madeira': 'https://www.ciclismomadeira.pt/',
                        'AC Açores': 'https://www.facebook.com/aca.acores'
                    };

                    return (
                        <div className="text-center py-16 px-4">
                            <p className="text-slate-400 mb-8 text-lg">
                                {t('filter_no_events')}
                            </p>
                            
                            {selectedRegiao !== 'Todas' && (
                                <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl max-w-lg mx-auto">
                                    <span className="text-4xl block mb-4">🌐</span>
                                    <h3 className="text-slate-50 mb-3 text-xl font-medium">
                                         {t('regional_not_found_title')}
                                    </h3>
                                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                                         {t('regional_not_found_desc')}
                                    </p>
                                    <a 
                                        href={associationLinks[selectedRegiao] || 'https://www.fpciclismo.pt/'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-slate-900 border border-blue-500 text-slate-50 px-6 py-3 rounded-lg no-underline font-semibold hover:bg-blue-600 transition-colors"
                                    >
                                         {t('regional_visit_site')} ({selectedRegiao})
                                         <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                         </svg>
                                     </a>
                                 </div>
                            )}
                        </div>
                    );
                })()}

                {!isInitialLoading && filteredEvents.length > 0 && (
                    <>
                        <div className="flex flex-col gap-2">
                            {filteredEvents.slice(0, visibleCount).map((event, idx, currentArray) => {
                                const currentMY = getMonthYearInfo(event);
                                const prevMY = idx > 0 ? getMonthYearInfo(currentArray[idx - 1]) : null;
                                const isNewMonth = !prevMY || currentMY.key !== prevMY.key;
                                const monthHeading = isNewMonth ? formatMonthHeading(currentMY.year, currentMY.monthIdx, language) : '';

                                const rawDate = event.date || '';
                                const isStage = isStageRace(event);
                                const discipline = getEventDiscipline(event);
                                const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
                                
                                // Extrai o dia ou intervalo real do evento
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
                                    day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '';
                                    month = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || '';
                                }

                                const allIds = [event.id, ...(event._allIds || [])];
                                const isEventMarked = isMarked(event.id, 'event', allIds);
                                const dateConflict = getDateConflict(event);
                                const isEventFavorited = favorites.includes(event.id) || (event._allIds && event._allIds.some(id => favorites.includes(id)));

                                let cardBorderAndBg = 'border-slate-200 dark:border-slate-800';
                                if (isEventMarked) {
                                    cardBorderAndBg = 'border-emerald-500/70 dark:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.12)] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]';
                                } else if (dateConflict.hasConflict) {
                                    cardBorderAndBg = 'border-orange-500/80 dark:border-orange-500/70 shadow-[0_0_15px_rgba(249,115,22,0.16)] bg-orange-500/[0.03] dark:bg-orange-500/[0.05]';
                                } else if (isEventFavorited) {
                                    cardBorderAndBg = 'border-yellow-400/70 dark:border-yellow-400/60 shadow-[0_0_15px_rgba(250,204,21,0.12)] bg-yellow-400/[0.02] dark:bg-yellow-400/[0.03]';
                                }

                                const translation = event.translations?.find(t => t.language === language) 
                                    || (language !== 'pt' ? event.translations?.find(t => t.language === 'en') : null);
                                const displayTitle = (language === 'pt' ? event.title : (translation?.title || event.title));
                                const displayDetails = (language === 'pt' ? event.details : (translation?.details || event.details));
                                const location = (displayDetails || '').split('|')[0]?.trim() || event.distrito || 'Portugal';

                                return (
                                <Fragment key={event.id}>
                                    {isNewMonth && (
                                        <div className={`flex items-center gap-3 ${idx === 0 ? 'pt-1 pb-1.5' : 'pt-5 pb-1.5'} select-none`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    {monthHeading}
                                                </span>
                                                <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                                                    {currentMY.year}
                                                </span>
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 via-slate-200/50 dark:via-slate-800/50 to-transparent" />
                                        </div>
                                    )}
                                    <div 
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            trackEvent('EVENT_CLICK', {
                                                targetId: event.id,
                                                targetTitle: event.title,
                                                path: typeof window !== 'undefined' ? window.location.pathname : '/'
                                            });
                                        }} 
                                        className={`group flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 bg-white dark:bg-slate-900 border ${cardBorderAndBg} rounded-xl p-3 sm:py-3 sm:px-4 cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 shadow-sm transition-all overflow-hidden`}
                                    >
                                    <div className="flex gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                                        <div className="flex flex-col shrink-0 w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                            <div className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                                                {formatMonthAbbr(month, language)}
                                            </div>
                                            <div className={`flex-1 flex items-center justify-center text-slate-900 dark:text-white font-bold ${day.length > 2 ? 'text-xs sm:text-sm tracking-tight' : 'text-base sm:text-lg'}`}>
                                                {day}
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <div className="flex items-center justify-between md:justify-start gap-2 mb-1 min-w-0">
                                                <h3 className="text-sm sm:text-[0.95rem] font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
                                                    {displayTitle}
                                                </h3>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(event.id);
                                                        trackEvent('FAVORITE_TOGGLE', {
                                                            targetId: event.id,
                                                            targetTitle: event.title
                                                        });
                                                    }}
                                                    className={`p-1 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${isEventFavorited ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-400/15 hover:bg-yellow-400/25' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                    title={isEventFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                                >
                                                    <Star size={14} fill={isEventFavorited ? "#facc15" : "none"} stroke={isEventFavorited ? "#eab308" : "currentColor"} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium min-w-0">
                                                <span className="flex items-center gap-1 min-w-0 max-w-[130px] sm:max-w-none truncate">
                                                    <MapPin size={12} className="text-rose-500 shrink-0" />
                                                    <span className="truncate">{location}</span>
                                                </span>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <span className="flex items-center gap-1 min-w-0 flex-1 truncate">
                                                    <Bike size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                    <span className="truncate">{(event.escaloes || []).map(esc => translateEscalao(esc, language)).join(' | ')} {discipline ? `(${translateTag(discipline, language)})` : ''}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 w-full md:w-auto md:justify-end border-t border-slate-100 dark:border-slate-800/60 md:border-0 pt-2 md:pt-0 pl-[62px] sm:pl-[70px] md:pl-0">
                                        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 md:justify-end">
                                            {isEventMarked && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                                    <Check size={11} className="stroke-[3]" /> {t('card_on_agenda')}
                                                </span>
                                            )}
                                            {dateConflict.hasConflict && !isEventMarked && (
                                                <span 
                                                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0"
                                                    title={t('card_conflict_tooltip')}
                                                >
                                                    <AlertTriangle size={11} className="stroke-[2.5] text-orange-500" /> {t('card_same_day')}
                                                </span>
                                            )}

                                            {/* Registration Countdown Alert */}
                                            {(() => {
                                                if (!event.registrationClosesAt && !event.registrationOpensAt) return null;
                                                const now = new Date();
                                                if (event.registrationClosesAt) {
                                                    const closes = new Date(event.registrationClosesAt);
                                                    const diffDays = Math.ceil((closes - now) / (1000 * 60 * 60 * 24));
                                                    if (diffDays >= 0 && diffDays <= 4) {
                                                        const countdownText = diffDays === 0 
                                                            ? t('card_last_day') 
                                                            : t('card_days_to_close').replace('{days}', diffDays);
                                                        return (
                                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                                                                <Clock size={10} className="shrink-0" /> {countdownText}
                                                            </span>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}

                                            {/* Main Scope / Âmbito (Ignora "Outro / A Definir") */}
                                            {(() => {
                                                const rawAmbito = event.ambito?.trim();
                                                const isGenericAmbito = !rawAmbito || rawAmbito.toLowerCase().includes('definir') || rawAmbito.toLowerCase() === 'outro';
                                                
                                                if (!isGenericAmbito) {
                                                    let displayAmbito = rawAmbito;
                                                    if (rawAmbito === 'Taça de Portugal') displayAmbito = t('badge_cup');
                                                    else if (rawAmbito === 'Nacional' || rawAmbito.includes('Nacional')) displayAmbito = t('badge_national');
                                                    else if (rawAmbito === 'Prova Aberta') displayAmbito = t('card_open_race');
                                                    else if (rawAmbito === 'Internacional') displayAmbito = t('badge_uci');
                                                    else if (rawAmbito === 'Regional') displayAmbito = t('nav_regionals');
                                                    
                                                    return (
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                                            rawAmbito === 'Taça de Portugal'
                                                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                                : rawAmbito === 'Nacional' || rawAmbito.includes('Nacional')
                                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                : rawAmbito === 'Prova Aberta'
                                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                : rawAmbito === 'Internacional' || rawAmbito.includes('UCI')
                                                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                                                : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                                                        }`}>
                                                            {displayAmbito}
                                                        </span>
                                                    );
                                                }
                                                
                                                // Se não tem âmbito válido, mostra licença relevante se existir (ex: Competição)
                                                if (event.licenca && event.licenca !== 'CPT / Lazer') {
                                                    const displayLicenca = event.licenca === 'Competição' ? t('escalao_license_competition') : event.licenca;
                                                    return (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
                                                            {displayLicenca}
                                                        </span>
                                                    );
                                                }
                                                
                                                return null;
                                            })()}

                                            {/* Prova por Etapas */}
                                            {isStage && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
                                                    {t('card_stages')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                </Fragment>
                                );
                            })}
                        </div>
                        
                        {filteredEvents.length > visibleCount && (
                            <div ref={loaderRef} className="h-10 flex justify-center items-center py-8 mt-4">
                                <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </>
                )}

                <EventModal 
                    selectedEvent={selectedEvent} 
                    setSelectedEvent={setSelectedEvent} 
                    favorites={favorites} 
                    toggleFavorite={toggleFavorite} 
                    isSignedIn={isSignedIn} 
                />
            </main>
            {showEscalaoHelp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4" onClick={() => setShowEscalaoHelp(false)}>
                    <div className="relative w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 z-10 p-1 cursor-pointer" onClick={() => setShowEscalaoHelp(false)}>✕</button>
                        <div className="overflow-y-auto flex-1 p-0 rounded-xl">
                            <EscalaoAssistant onApply={(esc) => {
                                if (!selectedEscaloes.includes(esc)) {
                                    setSelectedEscaloes([...selectedEscaloes, esc]);
                                }
                                setShowEscalaoHelp(false);
                            }} />
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}







