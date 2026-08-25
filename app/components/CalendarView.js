"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import useSWR from 'swr';

import { Calendar, MapPin, Search, X, ChevronLeft, ChevronRight, Users, Heart, Star, LayoutGrid, List, HelpCircle, Filter, Bike } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { filterEvents } from '../utils/filterEvents';
import { mergeEvents } from '../utils/mergeEvents';
import EventModal from './EventModal';
import EscalaoAssistant from './EscalaoAssistant';

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
    const [pastEventsFilter, setPastEventsFilter] = useState('todos');
    const [visibleCount, setVisibleCount] = useState(16);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const loaderRef = useRef(null);

    const { favorites, toggleFavorite, isSignedIn } = useFavorites();

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

    const { data: fetchedEvents, error, isLoading: loading, mutate } = useSWR(
        selectedSources && selectedSources.length > 0 
            ? `/api/events?years=${selectedYears.join(',')}&sources=${selectedSources.join(',')}` 
            : null,
        fetcher,
        {
            revalidateOnFocus: false, // Don't refetch just by switching tabs, saves FPC servers
            dedupingInterval: 60000 // Cache for 1 minute in memory
        }
    );

    const events = useMemo(() => {
        const raw = fetchedEvents || EMPTY_EVENTS;
        return mergeEvents(raw);
    }, [fetchedEvents]);

    useEffect(() => {
        let filtered = filterEvents(events, {
            filterByFavorites, favorites,
            searchTerm,
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
        setVisibleCount(16); // Reset visible count on filter change
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
        setVisibleCount(16);
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
        setPastEventsFilter('todos');
        setSearchTerm('');
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && filteredEvents.length > visibleCount) {
                    setVisibleCount((prev) => Math.min(prev + 16, filteredEvents.length));
                }
            },
            { threshold: 0.1 }
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
        <div className="bg-slate-950 min-h-screen text-slate-100 pt-8 pb-12 px-4 sm:px-8">
            <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <div className="flex justify-between items-center w-full gap-4 flex-wrap">
                    <div className="flex gap-4 items-center">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-1.5 font-semibold transition-colors text-[0.95rem] ${showFilters ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            <Filter size={18} />
                            {showFilters ? 'Esconder Filtros' : 'Filtrar Calendário'}
                        </button>
                        
                        {(selectedEscaloes.length > 0 || selectedDistrito !== 'Todos' || selectedRegiao !== 'Todas' || selectedTags.length > 0 || selectedType !== 'Todos' || monthFrom !== 1 || monthTo !== 12 || searchTerm !== '' || pastEventsFilter !== 'todos') && (
                            <button 
                                onClick={clearAllFilters}
                                title="Repor todos os filtros"
                                className="inline-flex items-center gap-1 font-medium text-sm text-slate-400 hover:text-slate-300 transition-colors"
                            >
                                <X size={14} /> Limpar
                            </button>
                        )}
                    </div>
                    
                    <div className="relative flex-[0_1_300px] w-full">
                        <input 
                            type="text" 
                            placeholder="Pesquisar por nome ou localidade..." 
                            value={searchTerm} 
                            onChange={onSearchChange} 
                            className="w-full py-2.5 pl-5 pr-10 rounded-full border border-slate-700 bg-slate-800 text-sm outline-none transition-colors focus:border-blue-500 text-slate-50 placeholder-slate-400"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 p-1 flex items-center justify-center rounded-full"
                                title="Limpar pesquisa"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                {showFilters && (
                    <div className="mt-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 w-full">
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedYears.includes(y) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
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
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Mês Inicial</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                            value={monthNames[monthFrom - 1]} 
                                            onChange={(e) => onMonthFromChange({target:{value: monthNames.indexOf(e.target.value) + 1}})} 
                                        >
                                            {monthNames.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Mês Final</label>
                                        <select 
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">Escalões</label>
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedEscaloes.includes(esc) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
                                            >
                                                {esc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('ambito') && !forceAmbito && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Âmbito</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedAmbito} 
                                        onChange={(e) => setSelectedAmbito(e.target.value)} 
                                    >
                                        {uniqueAmbitos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            {activeFilters.includes('licenca') && !forceLicenca && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Licença</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedLicenca} 
                                        onChange={(e) => setSelectedLicenca(e.target.value)} 
                                    >
                                        {uniqueLicencas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Tipo de Prova</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                    value={selectedType} 
                                    onChange={(e) => setSelectedType(e.target.value)} 
                                >
                                    <option value="Todos">Todos</option>
                                    <option value="Etapas">Etapas (Multi-dia)</option>
                                    <option value="Um Dia">Um Dia</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Eventos Passados / Futuros</label>
                                <select 
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1">Região</label>
                                    <select 
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1 flex items-center">Distrito</label>
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
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        value={selectedDistrito} 
                                        onChange={(e) => setSelectedDistrito(e.target.value)} 
                                    >
                                        {uniqueDistritos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {activeFilters.includes('modalidade') && (
                            <div className="mt-6 pt-5 border-t border-slate-700">
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold ml-1 block mb-3">
                                    Modalidades
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => onTagToggle(tag)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${selectedTags.includes(tag) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}
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
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p>A carregar o calendário unificado...</p>
                    </div>
                )}

                {!loading && error && (
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

                {!loading && !error && filteredEvents.length === 0 && (() => {
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

                {!loading && !error && filteredEvents.length > 0 && (
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

                                return (
                                <div 
                                    key={event.id} 
                                    onClick={() => setSelectedEvent(event)} 
                                    className={`group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border ${favorites.includes(event.id) ? 'border-yellow-500/50' : 'border-slate-800'} rounded-xl py-2.5 px-3 sm:py-3 sm:px-4 cursor-pointer hover:border-slate-600 transition-all`}
                                >
                                    <div className="flex gap-4 flex-1 min-w-0">
                                        <div className="flex flex-col shrink-0 w-[56px] h-[56px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                                            <div className="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                                                {month}
                                            </div>
                                            <div className="flex-1 flex items-center justify-center text-white text-lg font-bold">
                                                {day}
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                            <h3 className="text-[0.95rem] font-bold text-slate-100 truncate mb-1">
                                                {event.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-400 font-medium">
                                                <span className="flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none">
                                                    <MapPin size={13} className="text-rose-500 shrink-0" />
                                                    <span className="truncate">{location}</span>
                                                </span>
                                                <span className="hidden sm:inline text-slate-700">•</span>
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <Bike size={13} className="text-slate-500 shrink-0" />
                                                    <span className="truncate">{(event.escaloes || []).join(' | ')} {extraDetails ? `(${extraDetails})` : ''}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 ml-[72px] md:ml-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {event.ambito && (
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${event.ambito === 'Nacional' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : event.ambito === 'Prova Aberta' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : event.ambito === 'Taça de Portugal' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                                    {event.ambito}
                                                </span>
                                            )}
                                            {event.licenca && (
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${event.licenca === 'Competição' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : event.licenca === 'CPT / Lazer' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                    {event.licenca}
                                                </span>
                                            )}
                                            {isMultiDay && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                    Etapas
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="pl-3 border-l border-slate-800 flex items-center shrink-0">
                                            {event.source === 'Cabreira' ? (
                                                <img src="/logo-cabreira.png" alt="Cabreira" className="h-5 object-contain opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                                            ) : (
                                                <img src="/logo-fpc.png" alt="FPC" className="h-5 object-contain opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                                            )}
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
                    <div className="relative w-full max-w-[500px] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 z-10 p-1" onClick={() => setShowEscalaoHelp(false)}>✕</button>
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







