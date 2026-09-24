"use client";
import { formatEventLocation } from '../utils/eventLocation';
import { calculateDistance } from '../utils/distance';
import { useClientReady, useOnline, useStoredString, writeStored } from '../hooks/useBrowserState';
import { useToday } from '../hooks/useToday';
import { FavoriteChanges, FavoriteSubscription } from './FavoritePlanning';
import { eventDateDisplay } from "../utils/eventDateDisplay";
import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import useSWR from 'swr';

import { Calendar, MapPin, Search, X, ChevronLeft, ChevronRight, Users, Heart, Star, LayoutGrid, List, HelpCircle, Filter, Bike, AlertTriangle, Check, CalendarCheck, History, WifiOff, Download, Clock, Globe } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { filterEvents } from '../utils/filterEvents';
import { mergeEvents } from '../utils/mergeEvents';
import { chooseCalendarEvents, toCalendarListEvent, sortCalendarEvents, filterCalendarByDate } from '../utils/calendarList';
import { exportEventsToICS } from '../utils/exportCalendar';
import EventModal from './EventModal';
import EscalaoAssistant from './EscalaoAssistant';
import { trackEvent } from './AnalyticsTracker';
import { useTranslation } from '../i18n/useTranslation';
import { translateDateString, translateEscalao, translateAmbito, translateLicenca, translateTag, MONTH_FULL } from '../i18n/formatters';
import { isStageRace, getEventDiscipline } from '../utils/eventClassifier';
import { usePathname } from 'next/navigation';
import PageHeading from './PageHeading';
import MonthCalendar from './MonthCalendar';
import { eventsInPeriod, shiftMonth, groupEventsByDate, formatEventTitle } from '../utils/calendarPresentation';
import AgendaOverview from './AgendaOverview';
import styles from './site.module.css';
import { matchesPeriod, isCancelled, conciseEscaloes, registrationDaysUntil } from '../utils/planning';

const fetcher = async (url) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        const requestError = new Error('EVENTS_UNAVAILABLE');
        requestError.status = response.status;
        requestError.code = data?.code || 'EVENTS_UNAVAILABLE';
        throw requestError;
    }

    return data.events;
};

const EMPTY_EVENTS = [];

const getMonthYearInfo = eventDateDisplay;

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
    const pathname = usePathname();
    const { 
        defaultEscalao, 
        defaultRegiao,
        selectedSources,
        homeLocation,
        setHomeLocation,
        maxDistanceFilter,
        setMaxDistanceFilter
    } = useSettingsStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [selectedMonth, setSelectedMonth] = useState(null); // formato 'YYYY-MM'
    const [selectedDay, setSelectedDay] = useState(null); // formato 'YYYY-MM-DD'
    const [showCustomDistance, setShowCustomDistance] = useState(false);
    const [showEscalaoHelp, setShowEscalaoHelp] = useState(false);
    const [selectedEscaloes, setSelectedEscaloes] = useState(forceEscalao ? [forceEscalao] : []);
    const [selectedAmbito, setSelectedAmbito] = useState(forceAmbito || 'Todos');
    const [selectedLicenca, setSelectedLicenca] = useState(forceLicenca || 'Todas');
    const [selectedRegiao, setSelectedRegiao] = useState('Todas');
    const [selectedDistrito, setSelectedDistrito] = useState('Todos');
    const today = useToday();
    const currentYear = Number(today.slice(0, 4)) || new Date().getFullYear();
    const [explicitYears, setSelectedYears] = useState(null);
    const [monthFrom, setMonthFrom] = useState(1);
    const [monthTo, setMonthTo] = useState(12);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [quickPeriod, setQuickPeriod] = useState('');
    const [selectedType, setSelectedType] = useState('Todos');
    const defaultPastEventsFilter = 'futuros';
    const [pastEventsFilter, setPastEventsFilter] = useState(defaultPastEventsFilter);
    const [pagination, setPagination] = useState({ list: null, count: 100 });
    const [eventSelection, setSelectedEvent] = useState(undefined);
    const isOffline = !useOnline();

    const { favorites, toggleFavorite, isSignedIn } = useFavorites();
    const { markedSet, isMarked, getDateConflict } = useCalendarEvents();

    // Reset editable defaults only when their source settings actually change.
    const defaultsKey = JSON.stringify([defaultEscalao, defaultRegiao, forceEscalao, forceAmbito, forceLicenca, applyDefaultRegiao]);
    const [previousDefaults, setPreviousDefaults] = useState(null);
    if (previousDefaults !== defaultsKey) {
        setPreviousDefaults(defaultsKey);
        setSelectedEscaloes(forceEscalao ? [forceEscalao] : defaultEscalao && defaultEscalao !== 'Todos' ? [defaultEscalao] : []);
        setSelectedAmbito(forceAmbito || 'Todos');
        setSelectedLicenca(forceLicenca || 'Todas');
        setSelectedRegiao(applyDefaultRegiao ? defaultRegiao || 'Todas' : 'Todas');
    }

    const effectiveSources = [...((selectedSources && selectedSources.length > 0) ? selectedSources : ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net', 'Recorde Pessoal', 'Apedalar'])].sort();
    const eventsUrl = `/api/events?view=list-v2&years=all&sources=${effectiveSources.join(',')}`;
    const eventsCacheKey = `cycling_calendar_list_v2_${[...effectiveSources].sort().join(',')}`;
    const { data: fetchedEvents, error, isLoading: loading, mutate } = useSWR(
        eventsUrl,
        fetcher,
        {
            revalidateOnFocus: false, // Don't refetch on tab switch
            revalidateIfStale: false,
            dedupingInterval: 120000 // Cache for 2 minutes in memory
        }
    );

    const mounted = useClientReady();
    const cachedRaw = useStoredString(eventsCacheKey, '[]');
    const localCachedEvents = useMemo(() => {
        try { const parsed = JSON.parse(cachedRaw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }, [cachedRaw]);
    useEffect(() => {
        if (Array.isArray(fetchedEvents)) writeStored(eventsCacheKey, JSON.stringify(fetchedEvents));
    }, [fetchedEvents, eventsCacheKey]);

    const events = useMemo(() => {
        const records = chooseCalendarEvents(fetchedEvents, localCachedEvents, { offline: isOffline, failed: !!error });
        return records.length ? mergeEvents(records.map(toCalendarListEvent)) : EMPTY_EVENTS;
    }, [fetchedEvents, localCachedEvents, isOffline, error]);

    const selectedYears = useMemo(() => explicitYears || Array.from(new Set([
        String(currentYear), String(currentYear + 1),
        ...events.map(event => event.sortDate?.slice(0, 4)).filter(year => Number(year) >= currentYear),
    ])).sort(), [explicitYears, currentYear, events]);
    const linkedId = mounted ? new URLSearchParams(window.location.search).get('event') : null;
    const linkedEvent = linkedId ? events.find(event => String(event.id) === linkedId || event._allIds?.some(id => String(id) === linkedId)) : null;
    const selectedEvent = eventSelection === undefined ? linkedEvent : eventSelection;

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

    const matchingEvents = useMemo(() => {
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

        filtered = filterCalendarByDate(filtered, pastEventsFilter, today, selectedYears);
        filtered = filtered.filter(event => matchesPeriod(event, quickPeriod));

        if (homeLocation && homeLocation.lat && homeLocation.lng && maxDistanceFilter) {
            filtered = filtered.filter(event => {
                if (!event.lat || !event.lng) return false; // Hide events with unknown locations
                const dist = calculateDistance(homeLocation.lat, homeLocation.lng, event.lat, event.lng);
                if (dist === null) return false;
                return dist <= maxDistanceFilter;
            });
        }

        return sortCalendarEvents(filtered, favorites);
    }, [events, searchTerm, selectedYears, selectedEscaloes, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags, selectedType, pastEventsFilter, filterByFavorites, filterByAgenda, markedSet, favorites, forceEscalao, forceAmbito, forceLicenca, quickPeriod, today, homeLocation, maxDistanceFilter]);

    const filteredEvents = useMemo(() => eventsInPeriod(matchingEvents, selectedMonth, selectedDay), [matchingEvents, selectedMonth, selectedDay]);
    const calendarMonth = selectedMonth || matchingEvents.map(event => eventDateDisplay(event).start).find(Boolean)?.slice(0, 7) || new Date().toISOString().slice(0, 7);
    const browseMonth = month => {
        setSelectedMonth(month);
        setSelectedDay(null);
        setSelectedYears([month.slice(0, 4)]);
        setMonthFrom(1); setMonthTo(12);
        setPastEventsFilter('todos'); setQuickPeriod('');
    };
    const chooseDay = day => {
        setSelectedMonth(calendarMonth);
        setSelectedDay(current => current === day ? null : day);
        setViewMode('list');
    };
    const visibleCount = pagination.list === filteredEvents ? pagination.count : 100;
    const setVisibleCount = count => setPagination({ list: filteredEvents, count: typeof count === 'function' ? count(visibleCount) : count });

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

    const monthNames = MONTH_FULL[language] || MONTH_FULL.pt;

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

    const onSearchChange = (e) => setSearchTerm(e.target.value);
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

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert(t('error_geolocation_not_supported') || 'A geolocalização não é suportada por este browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setHomeLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    label: 'A minha localização'
                });
            },
            () => {
                alert(t('error_geolocation_permission') || 'Não foi possível obter a localização. Permite o acesso nas definições do browser.');
            }
        );
    };

    const clearAllFilters = () => {
        setSelectedMonth(null);
        setSelectedDay(null);
        setQuickPeriod('');
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
        setPastEventsFilter(defaultPastEventsFilter);
        setSearchTerm('');
    };



    return (
        <div className={styles.page}>
            <PageHeading title={pageTitle} subtitle={pageSubtitle} hero={pathname === '/'} icon={filterByAgenda ? CalendarCheck : filterByFavorites ? Star : Calendar} />
            <header className={styles.calendarControls} data-expanded={showFilters}>
                {isOffline && (
                    <div className="mb-3.5 py-2 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-fade-in shadow-sm">
                        <WifiOff size={15} className="text-amber-500 shrink-0" />
                        <span>{t('offline_mode_banner')}</span>
                    </div>
                )}
                <div className={styles.primaryFilters}>
                    <label className={styles.searchField}>
                        <span>{t('ui_search_label')}</span>
                        <span className={styles.search}>
                            <Search size={17} aria-hidden="true" />
                            <input type="search" placeholder={t('search_placeholder')} value={searchTerm} onChange={onSearchChange} />
                        </span>
                    </label>
                    <label>{t('planning_modality')}
                        <select value={selectedTags.length === 1 ? selectedTags[0] : ''} onChange={e => setSelectedTags(e.target.value ? [e.target.value] : [])}>
                            <option value="">{t('planning_all_modalities')}</option>
                            {availableTags.map(tag => <option key={tag} value={tag}>{translateTag(tag, language)}</option>)}
                        </select>
                    </label>
                    <label>{t('filter_district')}
                        <select value={selectedDistrito} onChange={e => setSelectedDistrito(e.target.value)}>
                            {uniqueDistritos.map(d => <option key={d} value={d}>{d === 'Todos' ? t('filter_all_districts') : d}</option>)}
                        </select>
                    </label>
                </div>
                <div className={styles.toolbar}>
                    <div className={styles.toolbarActions}>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={styles.filterButton}
                            aria-expanded={showFilters}
                            aria-controls="calendar-quick-filters calendar-filters"
                        >
                            <Filter size={15} className="shrink-0" />
                            <span className="truncate">{showFilters ? t('filter_button_close') : t('planning_advanced')}</span>
                        </button>

                        <select
                            aria-label={t('filter_past_upcoming')}
                            value={pastEventsFilter}
                            onChange={e => { setPastEventsFilter(e.target.value); setQuickPeriod(''); }}
                        >
                            <option value="todos">{t('filter_all_events')}</option>
                            <option value="futuros">{t('filter_upcoming_only')}</option>
                            <option value="passados">{t('filter_past_only')}</option>
                        </select>
                        
                        {(selectedMonth || selectedDay || quickPeriod || selectedEscaloes.length > 0 || selectedDistrito !== 'Todos' || selectedRegiao !== 'Todas' || selectedTags.length > 0 || selectedType !== 'Todos' || selectedAmbito !== (forceAmbito || 'Todos') || selectedLicenca !== (forceLicenca || 'Todas') || (explicitYears !== null && JSON.stringify([...selectedYears].sort()) !== JSON.stringify(getDefaultSelectedYears())) || monthFrom !== 1 || monthTo !== 12 || searchTerm !== '' || pastEventsFilter !== defaultPastEventsFilter) && (
                            <button 
                                onClick={clearAllFilters}
                                title={t('filter_clear_all')}
                                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1 font-medium text-xs sm:text-sm text-muted hover:text-slate-800 dark:hover:text-slate-300 transition-colors h-8 sm:h-10 px-2 cursor-pointer"
                            >
                                <X size={14} /> {t('filter_clear_all')}
                            </button>
                        )}
                    </div>
                    
                </div>
                {/* Expanded controls preserve every existing filter. */}
                <div id="calendar-quick-filters" className={styles.quickFilters} data-expanded={showFilters}>
                    <div className={styles.periods}>
                        {['', 'weekend', 'month', 'open'].map(period => (
                            <button key={period} type="button" aria-pressed={quickPeriod === period} onClick={() => {
                                setSelectedMonth(null); setSelectedDay(null);
                                setQuickPeriod(period);
                                if (period) {
                                    setPastEventsFilter('futuros');
                                    setSelectedYears([String(new Date().getFullYear()), String(new Date().getFullYear() + 1)]);
                                    setMonthFrom(1); setMonthTo(12);
                                }
                            }}>{t(period ? `planning_${period}` : 'planning_any')}</button>
                        ))}
                    </div>
                </div>
                <div className={styles.results}>
                    <div className="text-xs text-muted font-medium flex items-center gap-1.5">
                        <span>{t('filter_counter_showing')} <strong className="text-ink font-semibold">{Math.min(visibleCount, filteredEvents.length)}</strong> {t('filter_counter_of')} <strong className="text-ink font-semibold">{filteredEvents.length}</strong> {filteredEvents.length === 1 ? t('filter_counter_event') : t('filter_counter_events')}</span>
                        {!filterByAgenda && !filterByFavorites && events.length > 0 && filteredEvents.length !== events.length && (
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand bg-brand-soft text-brand hover:brightness-95 text-xs font-semibold transition-all cursor-pointer ml-auto"
                            title={t('filter_export_ics')}
                        >
                            <Download size={13} />
                            <span>{t('filter_export_ics')}</span>
                        </button>
                    )}
                </div>
                
                {showFilters && (
                    <div id="calendar-filters" className={styles.filters}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                            {activeFilters.includes('year') && (
                                <div className="flex flex-col gap-2 col-span-full">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">{t('filter_years')}</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {availableYears.map(y => (
                                            <button 
                                                key={y} 
                                                onClick={() => onYearToggle(y)} 
                                                aria-pressed={selectedYears.includes(y)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none cursor-pointer ${selectedYears.includes(y) ? 'bg-brand-soft text-brand border-brand font-bold' : 'bg-soft border-line text-muted hover:bg-slate-200 dark:hover:bg-[#4a433b] hover:text-slate-900 dark:hover:text-slate-300'}`}
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
                                        <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_start_month')}</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                            value={monthFrom} 
                                            aria-label={t('filter_start_month')}
                                            onChange={(e) => onMonthFromChange({target:{value: parseInt(e.target.value, 10)}})} 
                                        >
                                            {monthNames.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_end_month')}</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                            value={monthTo} 
                                            aria-label={t('filter_end_month')}
                                            onChange={(e) => onMonthToChange({target:{value: parseInt(e.target.value, 10)}})} 
                                        >
                                            {monthNames.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            {activeFilters.includes('escalao') && !forceEscalao && (
                                <div className="flex flex-col gap-2 col-span-full">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1 flex items-center">{t('filter_categories')}</label>
                                        <button 
                                            onClick={() => setShowEscalaoHelp(true)}
                                            title={t('escalao_modal_desc')}
                                            className="text-brand hover:brightness-110 p-0 -mt-[2px] flex items-center justify-center transition-colors"
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
                                                aria-pressed={selectedEscaloes.includes(esc)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedEscaloes.includes(esc) ? 'bg-brand-soft text-brand border-brand' : 'bg-soft border-line text-muted hover:bg-slate-200 dark:hover:bg-[#4a433b] hover:text-slate-900 dark:hover:text-slate-300'}`}
                                            >
                                                {translateEscalao(esc, language)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('ambito') && !forceAmbito && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_scope')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                        value={selectedAmbito} 
                                        aria-label={t('filter_scope')}
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
                                    <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_license')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                        value={selectedLicenca} 
                                        aria-label={t('filter_license')}
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
                                <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_event_type')}</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                    value={selectedType} 
                                    aria-label={t('filter_event_type')}
                                    onChange={(e) => setSelectedType(e.target.value)} 
                                >
                                    <option value="Todos">{t('filter_all_types')}</option>
                                    <option value="Etapas">{t('filter_stages')}</option>
                                    <option value="Um Dia">{t('filter_single_day')}</option>
                                </select>
                            </div>

                            
                            {activeFilters.includes('regiao') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">{t('filter_region')}</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                        value={selectedRegiao} 
                                        aria-label={t('filter_region')}
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

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-muted uppercase tracking-wider font-bold ml-1">
                                    Distância
                                </label>
                                {homeLocation ? (
                                    <div className="flex items-center gap-2">
                                        {showCustomDistance ? (
                                            <div className="flex items-center gap-1 w-full">
                                                <input 
                                                    type="number" 
                                                    className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                                    placeholder="Km"
                                                    value={maxDistanceFilter || ''}
                                                    onChange={(e) => setMaxDistanceFilter(e.target.value ? Number(e.target.value) : null)}
                                                    autoFocus
                                                />
                                                <button onClick={() => setShowCustomDistance(false)} className="h-9 px-2 text-muted hover:text-ink">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select 
                                                className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink outline-none focus:border-brand transition-colors"
                                                value={[50, 100, 150, 200, 250, null, ''].includes(maxDistanceFilter) ? (maxDistanceFilter || '') : 'custom'} 
                                                onChange={(e) => {
                                                    if (e.target.value === 'custom') {
                                                        setShowCustomDistance(true);
                                                    } else {
                                                        setMaxDistanceFilter(e.target.value ? Number(e.target.value) : null);
                                                    }
                                                }} 
                                            >
                                                <option value="">Todas as Distâncias</option>
                                                <option value="50">Até 50 km</option>
                                                <option value="100">Até 100 km</option>
                                                <option value="150">Até 150 km</option>
                                                <option value="200">Até 200 km</option>
                                                <option value="250">Até 250 km</option>
                                                {!['', 50, 100, 150, 200, 250].includes(maxDistanceFilter) && maxDistanceFilter && (
                                                    <option value={maxDistanceFilter}>Até {maxDistanceFilter} km</option>
                                                )}
                                                <option value="custom">Outro...</option>
                                            </select>
                                        )}
                                    </div>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleGetLocation}
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-line bg-soft text-ink hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 transition-colors flex items-center justify-center gap-1.5 font-medium"
                                    >
                                        <MapPin size={14} />
                                        Ativar GPS
                                    </button>
                                )}
                            </div>
                            
                        </div>
                        
                        {activeFilters.includes('modalidade') && (
                            <div className="mt-6 pt-5 border-t border-line">
                                <span className="text-xs text-muted uppercase tracking-wider font-bold ml-1 block mb-3">
                                    {t('filter_modalities')}
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => onTagToggle(tag)} 
                                        aria-pressed={selectedTags.includes(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedTags.includes(tag) ? 'bg-brand-soft text-brand border-brand' : 'bg-soft border-line text-muted hover:bg-slate-200 dark:hover:bg-[#4a433b] hover:text-slate-900 dark:hover:text-slate-300'}`}
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
            <div className={styles.calendarWorkspace}>
            <section className={styles.calendarFeed} aria-label={pageTitle}>
                <div className={styles.feedHeading}>
                    <div className={styles.monthNavigation}>
                        <button type="button" aria-label={t('ui_previous_month')} onClick={() => browseMonth(shiftMonth(calendarMonth, -1))}><ChevronLeft size={18} /></button>
                        <h2>{formatMonthHeading(Number(calendarMonth.slice(0, 4)), Number(calendarMonth.slice(5)) - 1, language)} {calendarMonth.slice(0, 4)}</h2>
                        <button type="button" aria-label={t('ui_next_month')} onClick={() => browseMonth(shiftMonth(calendarMonth, 1))}><ChevronRight size={18} /></button>
                    </div>
                    <div className={styles.viewSwitch} role="group" aria-label={t('ui_view')}>
                        <button type="button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List size={16} />{t('ui_list')}</button>
                        <button type="button" aria-pressed={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}><Calendar size={16} />{t('ui_calendar')}</button>
                    </div>
                    <button type="button" className={styles.mobileFilterButton} aria-label={t('planning_advanced')} aria-expanded={showFilters} aria-controls="calendar-quick-filters calendar-filters" onClick={() => setShowFilters(value => !value)}><Filter size={19} /></button>
                </div>
                {selectedDay && <div className={styles.daySelection}><span>{new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(selectedDay + 'T12:00:00Z'))}</span><button type="button" onClick={() => setSelectedDay(null)}>{t('ui_clear_day')}<X size={14} /></button></div>}
                {viewMode === 'calendar' && <MonthCalendar expanded month={calendarMonth} events={matchingEvents} selectedDay={selectedDay} onDay={chooseDay} onMonth={browseMonth} />}
                <FavoriteChanges events={events} favorites={favorites} ready={Array.isArray(fetchedEvents) && !error && !isOffline} onSelect={setSelectedEvent} />
                {filterByFavorites && <FavoriteSubscription />}
                {(filterByAgenda || filterByFavorites) && !isInitialLoading && <AgendaOverview mode={filterByAgenda ? "agenda" : "favorites"} events={events.filter(event => filterByAgenda ? isMarked(event.id, 'event', event._allIds || []) : favorites.includes(event.id) || event._allIds?.some(id => favorites.includes(id)))} onSelect={setSelectedEvent} />}
                {isInitialLoading && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="w-8 h-8 border-4 border-line border-t-brand rounded-full animate-spin mb-4"></div>
                        <p>{t('action_loading_events')}</p>
                    </div>
                )}

                {!isInitialLoading && error && events.length === 0 && (
                    <div className={styles.empty} role="alert">
                        <AlertTriangle size={28} aria-hidden="true" />
                        <h3>{t('error_occurred')}</h3>
                        <p>{t('events_load_error')}</p>
                        <button 
                            onClick={() => mutate()}
                            className={styles.primaryButton}
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
                        <div className={styles.empty}>
                            <Search size={30} className="text-brand mx-auto mb-5" aria-hidden="true" />
                            <p className="text-muted mb-6 text-base">
                                {t('filter_no_events')}
                            </p>
                            <button type="button" onClick={clearAllFilters} className={styles.filterButton}><X size={14} />{t('filter_clear_all')}</button>
                            
                            {selectedRegiao !== 'Todas' && (
                                <div className="bg-surface border border-line p-8 rounded-xl max-w-lg mx-auto">
                                    <Globe size={40} className="mx-auto mb-4 text-brand" aria-hidden="true" />
                                    <h3 className="text-ink mb-3 text-xl font-medium">
                                         {t('regional_not_found_title')}
                                    </h3>
                                    <p className="text-muted mb-6 text-sm leading-relaxed">
                                         {t('regional_not_found_desc')}
                                    </p>
                                    <a 
                                        href={associationLinks[selectedRegiao] || 'https://www.fpciclismo.pt/'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-brand-strong border border-brand-strong text-white px-6 py-3 rounded-lg no-underline font-semibold hover:brightness-110 transition-all"
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

                {!isInitialLoading && filteredEvents.length > 0 && viewMode === 'list' && (
                    <>
                        <div className={styles.eventList}>
                            {groupEventsByDate(filteredEvents.slice(0, visibleCount)).map((group, idx, groups) => {
                                const currentMY = getMonthYearInfo(group[0]);
                                const prevMY = idx > 0 ? getMonthYearInfo(groups[idx - 1][0]) : null;
                                const isNewMonth = !prevMY || currentMY.key !== prevMY.key;
                                const monthHeading = currentMY.key === 'unknown' ? t('planning_date_unconfirmed') : isNewMonth ? formatMonthHeading(currentMY.year, currentMY.monthIdx, language) : '';
                                const { day, month, singleDay, start, end } = currentMY;
                                return <Fragment key={group[0].id}>
                                    {isNewMonth && (idx > 0 || currentMY.key === 'unknown') && <div className={styles.monthHeading}><h2>{monthHeading}{' '}<span>{currentMY.year}</span></h2></div>}
                                    <section className={styles.dateGroup} aria-label={start ? new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).formatRange(new Date(start + 'T00:00:00Z'), new Date(end + 'T00:00:00Z')) : t('planning_date_unconfirmed')}>
                                        <div className={styles.groupDateColumn}>
                                        <div className={styles.date} data-cross-month={month.includes('/')}>
                                            <div className={`${styles.dateDay} ${start && !singleDay ? styles.dateRange : ''}`}>
                                                {start && !singleDay ? <>
                                                    <span className="sr-only">{new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).formatRange(new Date(start + 'T00:00:00Z'), new Date(end + 'T00:00:00Z'))}</span>
                                                    {[start, end].map((date, dateIndex) => <Fragment key={date}>
                                                        {dateIndex > 0 && <span className={styles.dateConnector} aria-hidden="true" />}
                                                        <time dateTime={date} aria-hidden="true">
                                                            {Number(date.slice(8))}
                                                            {month.includes('/') && <small className={styles.dateEndpointMonth}>{new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'))}</small>}
                                                        </time>
                                                    </Fragment>)}
                                                </> : day}
                                                {singleDay && start && <small className={styles.weekday}>{new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(start + 'T00:00:00Z'))}</small>}
                                            </div>
                                        </div>


                                        </div>
                                        <div className={styles.groupEvents}>
                                            {group.map(event => {
                                const rawDate = event.date || '';
                                const isStage = isStageRace(event);
                                const discipline = getEventDiscipline(event);

                                const allIds = [event.id, ...(event._allIds || [])];
                                const isEventMarked = isMarked(event.id, 'event', allIds);
                                const dateConflict = getDateConflict(event);
                                const isEventFavorited = favorites.includes(event.id) || (event._allIds && event._allIds.some(id => favorites.includes(id)));

                                const translation = event.translations?.find(t => t.language === language) 
                                    || (language !== 'pt' ? event.translations?.find(t => t.language === 'en') : null);
                                const displayTitle = formatEventTitle(language === 'pt' ? event.title : (translation?.title || event.title));
                                const location = formatEventLocation(event) || t('summary_location_tbd');

                                let distanceText = null;
                                if (homeLocation && homeLocation.lat && homeLocation.lng && event.lat && event.lng) {
                                    const distanceValue = calculateDistance(homeLocation.lat, homeLocation.lng, event.lat, event.lng);
                                    if (distanceValue !== null) distanceText = `${distanceValue} km`;
                                }

                                                return (
                                    <div 
                                        key={event.id} className={styles.eventCard}
                                        data-state={isCancelled(event) ? 'cancelled' : isEventMarked ? 'marked' : dateConflict.hasConflict ? 'conflict' : isEventFavorited ? 'favorite' : undefined}
                                    >
                                    <div className={styles.eventMain}>
                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <div className={styles.eventHeadingRow}>
                                                <h3>
                                                    <button type="button" className={styles.eventTitle} onClick={() => {
                                                        setSelectedEvent(event);
                                                        trackEvent('EVENT_CLICK', { targetId: event.id, targetTitle: event.title, path: pathname });
                                                    }}>{displayTitle}</button>
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
                                                    className={styles.eventFavorite}
                                                    aria-pressed={isEventFavorited}
                                                    aria-label={isEventFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                                    data-active={isEventFavorited}
                                                    title={isEventFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                                >
                                                    <Star size={18} fill={isEventFavorited ? "currentColor" : "none"} />
                                                </button>
                                            </div>
                                            <div className={styles.eventMeta}>
                                                <span className="flex items-center flex-wrap">
                                                    <MapPin size={12} className="shrink-0 mr-1" />
                                                    <span>{location}</span>
                                                    {distanceText && (
                                                        <span className="ml-2 inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]" title={t('distancia_estimada')}>
                                                            {distanceText}
                                                        </span>
                                                    )}
                                                </span>
                                                <span>
                                                    <Bike size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                    <span>{discipline ? translateTag(discipline, language) : conciseEscaloes(event.escaloes).map(esc => translateEscalao(esc, language)).join(' • ')}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.eventBadges}>
                                            {isCancelled(event) && <span className={styles.cancelledBadge}><AlertTriangle size={12} />{t('planning_cancelled')}</span>}
                                            {isEventMarked && (
                                                <span className={styles.eventStatus}>
                                                    <Check size={13} /> {t('card_on_agenda')}
                                                </span>
                                            )}
                                            {dateConflict.hasConflict && !isEventMarked && (
                                                <span 
                                                    className={`${styles.eventStatus} ${styles.eventConflict}`}
                                                    title={t('card_conflict_tooltip')}
                                                >
                                                    <AlertTriangle size={13} /> {t('card_same_day')}
                                                </span>
                                            )}

                                            {/* Registration Countdown Alert */}
                                            {(() => {
                                                if (!event.registrationClosesAt && !event.registrationOpensAt) return null;
                                                const now = new Date();
                                                if (event.registrationClosesAt) {
                                                    const closes = new Date(event.registrationClosesAt);
                                                    const diffDays = registrationDaysUntil(event.registrationClosesAt, now);
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
                                                    else if (/^campeonatos? naciona/i.test(rawAmbito)) displayAmbito = t('badge_national');
                                                    else if (rawAmbito === 'Nacional') displayAmbito = translateAmbito(rawAmbito, language);
                                                    else if (rawAmbito === 'Prova Aberta') displayAmbito = t('card_open_race');
                                                    else if (rawAmbito === 'Internacional') displayAmbito = t('badge_uci');
                                                    else if (rawAmbito === 'Regional') displayAmbito = t('nav_regionals');
                                                    
                                                    return (
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                                            rawAmbito === 'Taça de Portugal'
                                                                ? 'bg-brand-soft text-brand border border-brand'
                                                                : rawAmbito === 'Nacional' || rawAmbito.includes('Nacional')
                                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                : rawAmbito === 'Prova Aberta'
                                                                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                                                                : rawAmbito === 'Internacional' || rawAmbito.includes('UCI')
                                                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                                                : 'bg-slate-500/15 text-ink border border-slate-500/30'
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
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                                    {t('card_stages')}
                                                </span>
                                            )}
                                    </div>
                                    <ChevronRight size={17} className={styles.eventArrow} aria-hidden="true" />
                                </div>

                                                );
                                            })}
                                        </div>
                                    </section>
                                </Fragment>;
                            })}
                        </div>

                        {filteredEvents.length > visibleCount && (
                            <div className="flex justify-center py-6">
                                <button type="button" className={styles.filterButton} onClick={() => setVisibleCount(count => count + 100)}>{t('planning_load_more')}</button>
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
            </section>
            </div>
            {showEscalaoHelp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4" onClick={() => setShowEscalaoHelp(false)}>
                    <div className="relative w-full max-w-[500px] bg-surface rounded-xl shadow-2xl border border-line flex flex-col max-h-[90vh] text-ink transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 z-10 p-1 cursor-pointer" onClick={() => setShowEscalaoHelp(false)} aria-label={t('action_close')}><X size={20} aria-hidden="true" /></button>
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
    );
}
