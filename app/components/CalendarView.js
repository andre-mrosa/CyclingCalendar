"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
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
import OrganizationLogo from './OrganizationLogo';

const fetcher = (url) => fetch(url).then((res) => res.json()).then((data) => {
    if (!data.success) throw new Error(data.error || 'Failed to load events');
    return data.events;
});

const EMPTY_EVENTS = [];

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
    const [selectedYears, setSelectedYears] = useState([new Date().getFullYear().toString()]);
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

    const effectiveSources = (selectedSources && selectedSources.length > 0) ? selectedSources : ['FPC', 'Cabreira'];
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
            filtered = filtered.filter(e => !e.sortDate || new Date(e.sortDate) >= today);
        } else if (pastEventsFilter === 'passados') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => e.sortDate && new Date(e.sortDate) < today);
        }

        setFilteredEvents(filtered);
        setVisibleCount(15); // Reset visible count on filter change
    }, [events, searchTerm, selectedEscaloes, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags, selectedType, pastEventsFilter, filterByFavorites, favorites, forceEscalao, forceAmbito, forceLicenca]);

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
    const availableTags = [...new Set(events.map(e => e.tag))];

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const onSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());
    const onYearChange = (e) => setSelectedYear(e.target.value);
    
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
        setSelectedYears([new Date().getFullYear().toString()]);
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
                        <span>Modo Offline — A mostrar o calendário guardado no teu telemóvel.</span>
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
                            <span className="truncate">{showFilters ? 'Filtros' : 'Filtrar'}</span>
                            <span className="hidden sm:inline">{showFilters ? 'Ativos' : 'Calendário'}</span>
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
                            title={pastEventsFilter === 'passados' ? "A mostrar apenas eventos passados. Clica para voltar aos futuros." : "Clica para ver o histórico de provas que já passaram."}
                        >
                            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                                <History size={14} className={`shrink-0 ${pastEventsFilter === 'passados' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`} />
                                <span className="truncate">{pastEventsFilter === 'passados' ? 'A ver passados' : 'Ver passados'}</span>
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
                                title="Repor todos os filtros"
                                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1 font-medium text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors h-8 sm:h-10 px-2 cursor-pointer"
                            >
                                <X size={14} /> Limpar filtros
                            </button>
                        )}
                    </div>
                    
                    <div className="relative w-full sm:w-auto sm:flex-[0_1_320px]">
                        <input 
                            type="text" 
                            placeholder="Pesquisar por nome ou localidade..." 
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
                        <span>A mostrar <strong className="text-slate-800 dark:text-slate-200 font-semibold">{Math.min(visibleCount, filteredEvents.length)}</strong> de <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'prova' : 'provas'}</span>
                        {events.length > 0 && filteredEvents.length !== events.length && (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">({events.length} no total)</span>
                        )}
                    </div>

                    {(filterByAgenda || filterByFavorites) && filteredEvents.length > 0 && (
                        <button
                            onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                                exportEventsToICS(filteredEvents, filterByAgenda ? 'minha_agenda.ics' : 'favoritos.ics');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-all cursor-pointer shadow-xs ml-auto"
                            title="Exportar todas as provas desta lista para o teu calendário (.ics)"
                        >
                            <Download size={13} />
                            <span>Exportar Calendário (.ics)</span>
                        </button>
                    )}
                </div>
                
                {showFilters && (
                    <div className="mt-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                            {activeFilters.includes('year') && (
                                <div className="flex flex-col gap-2 col-span-full">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Anos</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            (new Date().getFullYear() - 2).toString(),
                                            (new Date().getFullYear() - 1).toString(),
                                            new Date().getFullYear().toString(),
                                            (new Date().getFullYear() + 1).toString()
                                        ].map(y => (
                                            <button 
                                                key={y} 
                                                onClick={() => {
                                                    const newYears = selectedYears.includes(y) 
                                                        ? selectedYears.filter(yr => yr !== y) 
                                                        : [...selectedYears, y];
                                                    if (newYears.length > 0) setSelectedYears(newYears);
                                                }} 
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedYears.includes(y) ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
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
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Mês Inicial</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                            value={monthNames[monthFrom - 1]} 
                                            onChange={(e) => onMonthFromChange({target:{value: monthNames.indexOf(e.target.value) + 1}})} 
                                        >
                                            {monthNames.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Mês Final</label>
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
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">Escalões</label>
                                        <button 
                                            onClick={() => setShowEscalaoHelp(true)}
                                            title="Não tens a certeza do teu escalão? Clica aqui para descobrir."
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
                                                {esc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('ambito') && !forceAmbito && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Âmbito</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedAmbito} 
                                        onChange={(e) => setSelectedAmbito(e.target.value)} 
                                    >
                                        {uniqueAmbitos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            {activeFilters.includes('licenca') && !forceLicenca && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Licença</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedLicenca} 
                                        onChange={(e) => setSelectedLicenca(e.target.value)} 
                                    >
                                        {uniqueLicencas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Tipo de Prova</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                    value={selectedType} 
                                    onChange={(e) => setSelectedType(e.target.value)} 
                                >
                                    <option value="Todos">Todos</option>
                                    <option value="Etapas">Etapas (Multi-dia)</option>
                                    <option value="Um Dia">Um Dia</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Eventos Passados / Futuros</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                    value={pastEventsFilter} 
                                    onChange={(e) => setPastEventsFilter(e.target.value)} 
                                >
                                    <option value="todos">Todos os Eventos</option>
                                    <option value="futuros">Apenas Futuros (Próximos)</option>
                                    <option value="passados">Apenas Passados (Já Realizados)</option>
                                </select>
                            </div>
                            
                            {activeFilters.includes('regiao') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1">Região</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedRegiao} 
                                        onChange={(e) => setSelectedRegiao(e.target.value)} 
                                    >
                                        {uniqueRegioes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            {activeFilters.includes('distrito') && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">Distrito</label>
                                        {selectedDistrito !== 'Todos' && (
                                            <button 
                                                onClick={() => setSelectedDistrito('Todos')}
                                                title="Limpar Distrito"
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
                                        {uniqueDistritos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {activeFilters.includes('modalidade') && (
                            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 block mb-3">
                                    Modalidades
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => onTagToggle(tag)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedTags.includes(tag) ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                                    >
                                        {tag}
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
                        <p>A carregar o calendário unificado...</p>
                    </div>
                )}

                {!isInitialLoading && error && events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <p className="text-red-400">Ocorreu um erro: {error.message || error}</p>
                        <button 
                            onClick={() => mutate()}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border-none cursor-pointer font-medium"
                        >
                            Tentar novamente
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
                                Nenhum evento encontrado com os filtros atuais.
                            </p>
                            
                            {selectedRegiao !== 'Todas' && (
                                <div className="bg-slate-800 border border-slate-700 p-8 rounded-xl max-w-lg mx-auto">
                                    <span className="text-4xl block mb-4">🌐</span>
                                    <h3 className="text-slate-50 mb-3 text-xl font-medium">
                                        Procuras provas regionais?
                                    </h3>
                                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                                        Muitas provas da <strong className="text-slate-200">{selectedRegiao}</strong> (como Taças Regionais) podem não ser publicadas no calendário central da FPC. Consulta diretamente a fonte oficial:
                                    </p>
                                    <a 
                                        href={associationLinks[selectedRegiao] || 'https://www.fpciclismo.pt/'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-slate-900 border border-blue-500 text-slate-50 px-6 py-3 rounded-lg no-underline font-semibold hover:bg-blue-600 transition-colors"
                                    >
                                        Visitar Site da {selectedRegiao}
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
                            {filteredEvents.slice(0, visibleCount).map(event => {
                                const parts = event.details ? event.details.split('|') : [];
                                const location = parts.length > 0 && parts[0].trim() !== '' ? parts[0].trim() : "A definir";
                                const extraDetails = parts.length > 1 ? parts.slice(1).join('|').trim() : "";
                                
                                const rawDate = event.date || '';
                                const isMultiDay = rawDate.includes(',') || rawDate.includes(' e ') || rawDate.includes(' a ');
                                const dateParts = rawDate.split(' ');
                                const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
                                const day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '';
                                const month = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || '';

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

                                return (
                                <div 
                                    key={event.id} 
                                    onClick={() => setSelectedEvent(event)} 
                                    className={`group flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 bg-white dark:bg-slate-900 border ${cardBorderAndBg} rounded-xl p-3 sm:py-3 sm:px-4 cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 shadow-sm transition-all overflow-hidden`}
                                >
                                    <div className="flex gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                                        <div className="flex flex-col shrink-0 w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                            <div className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                                                {month}
                                            </div>
                                            <div className="flex-1 flex items-center justify-center text-slate-900 dark:text-white text-base sm:text-lg font-bold">
                                                {day}
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <div className="flex items-center justify-between md:justify-start gap-2 mb-1 min-w-0">
                                                <h3 className="text-sm sm:text-[0.95rem] font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
                                                    {event.title}
                                                </h3>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(event.id);
                                                    }}
                                                    className={`p-1 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${isEventFavorited ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-400/15 hover:bg-yellow-400/25' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                    title={isEventFavorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
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
                                                    <span className="truncate">{(event.escaloes || []).join(' | ')} {extraDetails ? `(${extraDetails})` : ''}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 w-full md:w-auto md:justify-end border-t border-slate-100 dark:border-slate-800/60 md:border-0 pt-2 md:pt-0 pl-[62px] sm:pl-[70px] md:pl-0">
                                        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                            {isEventMarked && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                                    <Check size={11} className="stroke-[3]" /> Na agenda
                                                </span>
                                            )}
                                            {dateConflict.hasConflict && !isEventMarked && (
                                                <span 
                                                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0"
                                                    title={`Já tens uma prova marcada neste dia: "${dateConflict.conflictingTitle}"`}
                                                >
                                                    <AlertTriangle size={11} className="stroke-[2.5] text-orange-500" /> Prova no mesmo dia
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
                                                        return (
                                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                                                                <Clock size={10} className="shrink-0" /> {diffDays === 0 ? 'Último dia!' : `${diffDays}d p/ fechar`}
                                                            </span>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}

                                            {/* Main Scope / Âmbito */}
                                            {event.ambito && (
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                                                    event.ambito === 'Taça de Portugal'
                                                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                        : event.ambito === 'Nacional' || event.ambito.includes('Nacional')
                                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                        : event.ambito === 'Prova Aberta'
                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                        : event.ambito === 'Internacional' || event.ambito.includes('UCI')
                                                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                                        : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                                                }`}>
                                                    {event.ambito}
                                                </span>
                                            )}

                                            {/* Licença / Caráter (Evita duplicar Prova Aberta + CPT/Lazer) */}
                                            {event.licenca && (
                                                event.licenca === 'Competição' ? (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
                                                        Competição
                                                    </span>
                                                ) : event.licenca === 'CPT / Lazer' && event.ambito !== 'Prova Aberta' ? (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                                        Lazer
                                                    </span>
                                                ) : event.licenca !== 'CPT / Lazer' && event.licenca !== 'Competição' ? (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                                                        {event.licenca}
                                                    </span>
                                                ) : null
                                            )}

                                            {/* Prova por Etapas */}
                                            {isMultiDay && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
                                                    Etapas
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="pl-2.5 sm:pl-3 md:border-l border-slate-200 dark:border-slate-800 flex items-center shrink-0">
                                            <OrganizationLogo source={event.source} className="h-4 sm:h-5 w-auto object-contain" />
                                        </div>
                                    </div>
                                </div>
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







