"use client";
import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import useSWR from 'swr';
import CustomSelect from './CustomSelect';
import { Calendar, MapPin, Search, X, ChevronLeft, ChevronRight, Users, Heart, Star, LayoutGrid, List, HelpCircle, Filter } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { filterEvents } from '../utils/filterEvents';
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
        useCurrentMonth,
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
        if (useCurrentMonth) {
            const currentMonth = new Date().getMonth() + 1;
            setMonthFrom(currentMonth);
        }
    }, [defaultEscalao, defaultRegiao, useCurrentMonth, forceEscalao, forceAmbito, forceLicenca, applyDefaultRegiao]);

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

    const events = fetchedEvents || EMPTY_EVENTS;

    useEffect(() => {
        const filtered = filterEvents(events, {
            filterByFavorites, favorites,
            searchTerm,
            selectedEscaloes: forceEscalao ? [forceEscalao] : selectedEscaloes,
            selectedAmbito: forceAmbito || selectedAmbito,
            selectedLicenca: forceLicenca || selectedLicenca,
            selectedRegiao,
            selectedDistrito,
            monthFrom,
            monthTo,
            selectedTags
        });

        setFilteredEvents(filtered);
        setVisibleCount(16); // Reset visible count on filter change
    }, [events, searchTerm, selectedEscaloes, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags, filterByFavorites, favorites, forceEscalao, forceAmbito, forceLicenca]);

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
        setSelectedEscaloes([]);
        setSelectedAmbito('Todos');
        setSelectedLicenca('Todas');
        setSelectedRegiao('Todas');
        setSelectedDistrito('Todos');
        setSelectedYears([new Date().getFullYear().toString()]);
        setMonthFrom(1);
        setMonthTo(12);
        setSelectedTags([]);
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
        <div className="app-container">
            <header className="app-header">
                <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                background: 'transparent',
                                color: showFilters ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                padding: '0',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'var(--transition)',
                                fontSize: '0.95rem'
                            }}
                        >
                            <Filter size={18} />
                            {showFilters ? 'Esconder Filtros' : 'Filtrar Calendário'}
                        </button>
                        
                        {(selectedEscaloes.length > 0 || selectedDistrito !== 'Todos' || selectedRegiao !== 'Todas' || selectedTags.length > 0 || monthFrom !== 1 || monthTo !== 12 || searchTerm !== '') && (
                            <button 
                                onClick={clearAllFilters}
                                title="Repor todos os filtros"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: 'none',
                                    padding: '0',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'var(--transition)',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <X size={14} /> Limpar
                            </button>
                        )}
                    </div>
                    
                    <div style={{ position: 'relative', flex: '0 1 300px', width: '100%' }}>
                        <input 
                            type="text" 
                            placeholder="Pesquisar por nome ou localidade..." 
                            value={searchTerm} 
                            onChange={onSearchChange} 
                            style={{ 
                                width: '100%',
                                padding: '0.6rem 2.5rem 0.6rem 1.25rem', 
                                borderRadius: '20px', 
                                border: '1px solid var(--card-border)', 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--card-border)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'var(--transition)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.background = 'var(--bg-secondary)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.background = 'var(--bg-secondary)'; }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '0.6rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '0.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%'
                                }}
                                title="Limpar pesquisa"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                {showFilters && (
                    <div className="filters-container" style={{ 
                        marginTop: '1rem', 
                        background: 'var(--bg-secondary)', 
                        padding: '1.25rem', 
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--card-border)',
                        width: '100%'
                    }}>
                        <div className="controls" style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '1.25rem', 
                            width: '100%' 
                        }}>
                            <style>{`
                                .controls > div { flex: 1 1 180px; }
                                .search-block { flex-basis: 100% !important; }
                            `}</style>
                            {activeFilters.includes('year') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexBasis: '100%' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Anos</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                                                    // Ensure at least one year is selected
                                                    if (newYears.length > 0) setSelectedYears(newYears);
                                                }} 
                                                style={{ 
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: 'var(--radius-full)',
                                                    border: '1px solid var(--card-border)',
                                                    background: selectedYears.includes(y) ? 'var(--accent-primary)' : 'var(--card-bg)', 
                                                    color: selectedYears.includes(y) ? 'white' : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    transition: 'var(--transition)'
                                                }}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('month') && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Inicial</label>
                                        <CustomSelect 
                                            value={monthNames[monthFrom - 1]} 
                                            onChange={(val) => onMonthFromChange({target:{value: monthNames.indexOf(val) + 1}})} 
                                            options={monthNames} 
                                            maxHeight="400px" 
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Final</label>
                                        <CustomSelect 
                                            value={monthNames[monthTo - 1]} 
                                            onChange={(val) => onMonthToChange({target:{value: monthNames.indexOf(val) + 1}})} 
                                            options={monthNames} 
                                            maxHeight="400px" 
                                        />
                                    </div>
                                </>
                            )}
                            
                            {activeFilters.includes('escalao') && !forceEscalao && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexBasis: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center' }}>Escalões</label>
                                        <button 
                                            onClick={() => setShowEscalaoHelp(true)}
                                            title="Não tens a certeza do teu escalão? Clica aqui para descobrir."
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0',
                                                marginTop: '-2px'
                                            }}
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {uniqueEscaloes.map(esc => (
                                            <button 
                                                key={esc} 
                                                onClick={() => onEscalaoToggle(esc)} 
                                                style={{ 
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: 'var(--radius-full)',
                                                    border: '1px solid var(--card-border)',
                                                    background: selectedEscaloes.includes(esc) ? 'var(--accent-primary)' : 'var(--card-bg)', 
                                                    color: selectedEscaloes.includes(esc) ? 'white' : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    transition: 'var(--transition)'
                                                }}
                                            >
                                                {esc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeFilters.includes('ambito') && !forceAmbito && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Âmbito</label>
                                    <CustomSelect 
                                        value={selectedAmbito} 
                                        onChange={setSelectedAmbito} 
                                        options={uniqueAmbitos} 
                                        maxHeight="400px" 
                                    />
                                </div>
                            )}
                            
                            {activeFilters.includes('licenca') && !forceLicenca && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Licença</label>
                                    <CustomSelect 
                                        value={selectedLicenca} 
                                        onChange={setSelectedLicenca} 
                                        options={uniqueLicencas} 
                                        maxHeight="400px" 
                                    />
                                </div>
                            )}
                            
                            {activeFilters.includes('regiao') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Região</label>
                                    <CustomSelect 
                                        value={selectedRegiao} 
                                        onChange={setSelectedRegiao} 
                                        options={uniqueRegioes} 
                                        maxHeight="400px" 
                                    />
                                </div>
                            )}
                            
                            {activeFilters.includes('distrito') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center' }}>Distrito</label>
                                        {selectedDistrito !== 'Todos' && (
                                            <button 
                                                onClick={() => setSelectedDistrito('Todos')}
                                                title="Limpar Distrito"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--accent-primary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0',
                                                    marginTop: '-2px'
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <CustomSelect 
                                        value={selectedDistrito} 
                                        onChange={setSelectedDistrito} 
                                        options={uniqueDistritos} 
                                        maxHeight="600px"
                                    />
                                </div>
                            )}
                            

                        </div>
                        
                        {activeFilters.includes('modalidade') && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--card-border)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>
                                    Modalidades
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => onTagToggle(tag)} 
                                        style={{ 
                                            padding: '0.4rem 1rem',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid var(--card-border)',
                                            background: selectedTags.includes(tag) ? 'var(--accent-primary)' : 'var(--card-bg)', 
                                            color: selectedTags.includes(tag) ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '500',
                                            transition: 'var(--transition)'
                                        }}
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
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>A carregar o calendário unificado...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="error-state">
                        <p>Ocorreu um erro: {error.message || error}</p>
                        <button 
                            onClick={() => mutate()}
                            style={{marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
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
                        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                                Nenhum evento encontrado com os filtros atuais.
                            </p>
                            
                            {selectedRegiao !== 'Todas' && (
                                <div style={{ 
                                    background: 'var(--bg-secondary)', 
                                    border: '1px solid var(--card-border)', 
                                    padding: '2rem', 
                                    borderRadius: 'var(--radius-lg)',
                                    maxWidth: '500px',
                                    margin: '0 auto',
                                }}>
                                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🌐</span>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '1.2rem' }}>
                                        Procuras provas regionais?
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                        Muitas provas da <strong>{selectedRegiao}</strong> (como Taças Regionais) podem não ser publicadas no calendário central da FPC. Consulta diretamente a fonte oficial:
                                    </p>
                                    <a 
                                        href={associationLinks[selectedRegiao] || 'https://www.fpciclismo.pt/'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            background: 'var(--card-bg)',
                                            border: '1px solid var(--accent-primary)',
                                            color: 'var(--text-primary)',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            transition: 'var(--transition)'
                                        }}
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
                        <div className="events-list">
                            {filteredEvents.slice(0, visibleCount).map(event => {
                                const parts = event.details ? event.details.split('|') : [];
                                const location = parts.length > 0 && parts[0].trim() !== '' ? parts[0].trim() : "A definir";
                                const extraDetails = parts.length > 1 ? parts.slice(1).join('|').trim() : "";

                                return (
                                <div key={event.id} className={`event-list-item ${favorites.includes(event.id) ? 'favorite-item' : ''}`} onClick={() => setSelectedEvent(event)} style={{ cursor: 'pointer', padding: '0.75rem 1rem' }}>
                                    <div className="event-list-main">
                                        <div className="event-list-date" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'none', padding: '0', flex: '0 0 130px' }}>
                                            <span style={{ lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '0.4rem', wordBreak: 'break-word' }}>
                                                <Calendar size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> 
                                                <span>{event.date}</span>
                                            </span>
                                            {event.endDate && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.2', marginTop: '0.2rem' }}>a {event.endDate}</span>}
                                        </div>
                                        
                                        <div className="event-list-info">
                                            <h3 className="event-list-title">{event.title}</h3>
                                            <div className="event-list-details">
                                                <div className="event-list-detail-item" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <Users size={14} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {(event.escaloes || []).join(' • ')} {extraDetails ? `(${extraDetails})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="event-list-location">
                                            <span style={{ flexShrink: 0, marginTop: '2px' }}><MapPin size={14} style={{ color: 'var(--text-secondary)' }} /></span>
                                            <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{location}</span>
                                        </div>
                                    </div>

                                    <div className="event-list-meta">
                                        <span className="event-list-tag">{event.ambito}</span>
                                        {event.licenca && <span className="event-list-tag">{event.licenca}</span>}
                                        
                                        {event.source === 'Cabreira' ? (
                                            <img src="/logo-cabreira.png" alt="Cabreira Solutions" className="logo-cabreira" />
                                        ) : (
                                            <img src="/logo-fpc.png" alt="FPC" className="logo-fpc" />
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        
                        {filteredEvents.length > visibleCount && (
                            <div ref={loaderRef} style={{ height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0' }}>
                                <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
                <div className="modal-overlay" onClick={() => setShowEscalaoHelp(false)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0, background: 'none' }}>
                        <button className="modal-close" onClick={() => setShowEscalaoHelp(false)} style={{ top: '1rem', right: '1rem', zIndex: 10 }}>✕</button>
                        <EscalaoAssistant onApply={(esc) => {
                            if (!selectedEscaloes.includes(esc)) {
                                setSelectedEscaloes([...selectedEscaloes, esc]);
                            }
                            setShowEscalaoHelp(false);
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
}
