"use client";
import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import useSWR from 'swr';
import CustomSelect from './CustomSelect';
import { Calendar, MapPin, Search, X, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { filterEvents } from '../utils/filterEvents';
import EventModal from './EventModal';

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
    const [selectedEscalao, setSelectedEscalao] = useState(forceEscalao || 'Todos');
    const [selectedAmbito, setSelectedAmbito] = useState(forceAmbito || 'Todos');
    const [selectedLicenca, setSelectedLicenca] = useState(forceLicenca || 'Todas');
    const [selectedRegiao, setSelectedRegiao] = useState('Todas');
    const [selectedDistrito, setSelectedDistrito] = useState('Todos');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [monthFrom, setMonthFrom] = useState(1);
    const [monthTo, setMonthTo] = useState(12);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const { favorites, toggleFavorite, isSignedIn } = useFavorites();

    // Sync settings on mount
    useEffect(() => {
        if (forceEscalao) setSelectedEscalao(forceEscalao);
        else if (defaultEscalao) setSelectedEscalao(defaultEscalao);
        else setSelectedEscalao('Todos');

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
            ? `/api/events?year=${selectedYear}&sources=${selectedSources.join(',')}` 
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
            selectedEscalao: forceEscalao || selectedEscalao,
            selectedAmbito: forceAmbito || selectedAmbito,
            selectedLicenca: forceLicenca || selectedLicenca,
            selectedRegiao,
            selectedDistrito,
            monthFrom,
            monthTo,
            selectedTags
        });

        setFilteredEvents(filtered);
        setCurrentPage(1); // Reset page on filter change
    }, [events, searchTerm, selectedEscalao, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags, filterByFavorites, favorites, forceEscalao, forceAmbito, forceLicenca]);

    const uniqueEscaloes = ['Todos', 'Elite Amador / Individual', ...new Set(events.map(e => e.escalao))].filter((value, index, self) => self.indexOf(value) === index);
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
        setCurrentPage(1);
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

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Header title removed as requested */}
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
                        <Search size={18} />
                        {showFilters ? 'Esconder Filtros' : 'Filtrar Calendário'}
                    </button>
                    
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
                                background: 'rgba(255, 255, 255, 0.03)', 
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'var(--transition)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.background = 'rgba(255, 255, 255, 0.03)'; }}
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Ano</label>
                                    <CustomSelect 
                                        value={selectedYear} 
                                        onChange={(val) => onYearChange({target:{value:val}})} 
                                        options={['2024', '2025', '2026']} 
                                        maxHeight="400px" 
                                    />
                                </div>
                            )}
                            
                            {activeFilters.includes('month') && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Inicial</label>
                                        <CustomSelect 
                                            value={`${monthFrom} - ${monthNames[monthFrom - 1]}`} 
                                            onChange={(val) => onMonthFromChange({target:{value: parseInt(val.split(' - ')[0])}})} 
                                            options={monthNames.map((mName, i) => `${i+1} - ${mName}`)} 
                                            maxHeight="400px" 
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Final</label>
                                        <CustomSelect 
                                            value={`${monthTo} - ${monthNames[monthTo - 1]}`} 
                                            onChange={(val) => onMonthToChange({target:{value: parseInt(val.split(' - ')[0])}})} 
                                            options={monthNames.map((mName, i) => `${i+1} - ${mName}`)} 
                                            maxHeight="400px" 
                                        />
                                    </div>
                                </>
                            )}
                            
                            {activeFilters.includes('escalao') && !forceEscalao && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Escalão</label>
                                    <CustomSelect 
                                        value={selectedEscalao} 
                                        onChange={setSelectedEscalao} 
                                        options={uniqueEscaloes} 
                                        maxHeight="400px" 
                                    />
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
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Distrito</label>
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
                            {filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(event => {
                                const parts = event.details ? event.details.split('|') : [];
                                const location = parts.length > 0 && parts[0].trim() !== '' ? parts[0].trim() : "A definir";
                                const extraDetails = parts.length > 1 ? parts.slice(1).join('|').trim() : "";

                                return (
                                <div key={event.id} className={`event-list-item ${favorites.includes(event.id) ? 'favorite-item' : ''}`} onClick={() => setSelectedEvent(event)} style={{ cursor: 'pointer', padding: '0.75rem 1rem' }}>
                                    <div className="event-list-main">
                                        <div className="event-list-date" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'none', padding: '0', flex: '0 0 130px' }}>
                                            <span style={{ lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} style={{ color: 'var(--text-secondary)' }} /> {event.date}</span>
                                            {event.endDate && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.2', marginTop: '0.2rem' }}>a {event.endDate}</span>}
                                        </div>
                                        
                                        <div className="event-list-info">
                                            <h3 className="event-list-title">{event.title}</h3>
                                            <div className="event-list-details">
                                                <div className="event-list-detail-item" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <Users size={14} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {event.escalao} {extraDetails ? `(${extraDetails})` : ''}
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
                        
                        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', gap: '2rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provas por página:</span>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1); 
                                    }}
                                    style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    <option value={8}>8</option>
                                    <option value={16}>16</option>
                                    <option value={24}>24</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                <button 
                                    className="modal-btn" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                    Anterior
                                </button>
                            
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span>Página</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))}
                                        value={currentPage}
                                        onChange={(e) => {
                                            let p = parseInt(e.target.value);
                                            const m = Math.ceil(filteredEvents.length / itemsPerPage);
                                            if (p >= 1 && p <= m) {
                                                setCurrentPage(p);
                                            }
                                        }}
                                        style={{ width: '45px', padding: '0.3rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                                    />
                                    <span>de {Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))}</span>
                                </div>
                                
                                <button 
                                    className="modal-btn" 
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 'not-allowed' : 'pointer', opacity: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEvents.length / itemsPerPage), p + 1))}
                                    disabled={currentPage >= Math.ceil(filteredEvents.length / itemsPerPage)}
                                >
                                    Próxima
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <div style={{ width: '130px' }}></div>
                        </div>
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
        </div>
    );
}
