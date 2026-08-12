"use client";
import { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../SettingsContext';
import CustomSelect from './CustomSelect';

export default function CalendarView({ 
    pageTitle = "Calendário FPC & Cabreira", 
    pageSubtitle = "Agregador oficial de ciclismo em Portugal",
    forceAmbito = null,
    forceLicenca = null,
    activeFilters = ['search', 'year', 'month', 'escalao', 'ambito', 'licenca', 'regiao'],
    applyDefaultRegiao = false
}) {
    const { 
        defaultEscalao, 
        defaultRegiao,
        useCurrentMonth,
        selectedSources 
    } = useContext(SettingsContext);
    
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEscalao, setSelectedEscalao] = useState('Todos');
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
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });

    // Sync settings on mount
    useEffect(() => {
        if (defaultEscalao) {
            setSelectedEscalao(defaultEscalao);
        }
        if (defaultRegiao && applyDefaultRegiao) {
            setSelectedRegiao(defaultRegiao);
        }
        if (useCurrentMonth) {
            const currentMonth = new Date().getMonth() + 1;
            setMonthFrom(currentMonth);
        }
    }, [defaultEscalao, defaultRegiao, useCurrentMonth]);

    useEffect(() => {
        if (selectedSources && selectedSources.length > 0) {
            fetchEvents(selectedYear, selectedSources);
        } else {
            setEvents([]);
            setLoading(false);
        }
    }, [selectedYear, selectedSources]);

    const fetchEvents = async (year, sources) => {
        setLoading(true);
        setError(null);
        try {
            const sourcesParam = sources.join(',');
            const res = await fetch(`/api/events?year=${year}&sources=${sourcesParam}`);
            const data = await res.json();
            
            if (data.success) {
                setEvents(data.events);
            } else {
                throw new Error(data.error || 'Failed to load events');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = events;
        
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(searchTerm) ||
                event.details.toLowerCase().includes(searchTerm)
            );
        }

        if (selectedEscalao !== 'Todos') {
            if (selectedEscalao === 'Elite Amador / Individual') {
                filtered = filtered.filter(event => {
                    const e = event.escalao;
                    if (e === 'Sub-19 (Juniores)' || e === 'Sub-17 (Cadetes)' || e === 'Sub-15 (Juvenis)' || e === 'Escolas' || e === 'Femininas' || e === 'Masters / Veteranos') {
                        return false;
                    }
                    
                    return (
                        e === 'Todos (Aberto)' || 
                        e === 'Geral / Vários' ||
                        e === 'Elite / Sub-23' ||
                        e === 'Elite Amador / Individual' ||
                        event.details.toLowerCase().includes('granfondo') ||
                        event.title.toLowerCase().includes('granfondo')
                    );
                });
            } else {
                filtered = filtered.filter(event => {
                    if (event.escalao === 'Todos (Aberto)' || event.escalao === 'Geral / Vários') return true;
                    if (event.escalao === selectedEscalao) return true;
                    
                    const detLow = event.details.toLowerCase();
                    const titleLow = event.title.toLowerCase();
                    
                    if (selectedEscalao === 'Elite / Sub-23') {
                        return detLow.includes('.12') || detLow.includes('.13') || titleLow.includes('elite') || titleLow.includes('sub-23') || titleLow.includes('sub23');
                    }
                    if (selectedEscalao === 'Sub-23') {
                        return detLow.includes('.13') || titleLow.includes('sub-23') || titleLow.includes('sub23');
                    }
                    if (selectedEscalao === 'Sub-19 (Juniores)') {
                        return detLow.includes('.14') || titleLow.includes('sub-19') || titleLow.includes('sub19') || titleLow.includes('juniores');
                    }
                    if (selectedEscalao === 'Sub-17 (Cadetes)') {
                        return detLow.includes('.15') || titleLow.includes('sub-17') || titleLow.includes('sub17') || titleLow.includes('cadetes');
                    }
                    if (selectedEscalao === 'Sub-15 (Juvenis)') {
                        return detLow.includes('.16') || titleLow.includes('sub-15') || titleLow.includes('sub15') || titleLow.includes('juvenis');
                    }
                    if (selectedEscalao === 'Masters / Veteranos') {
                        return detLow.includes('.17') || titleLow.includes('master') || titleLow.includes('veteranos');
                    }
                    if (selectedEscalao === 'Femininas') {
                        return detLow.includes('.18') || titleLow.includes('feminin');
                    }
                    if (selectedEscalao === 'Escolas') {
                        return detLow.includes('escolas') || titleLow.includes('escolas');
                    }
                    return false;
                });
            }
        }

        if (selectedAmbito !== 'Todos') {
            filtered = filtered.filter(event => event.ambito === selectedAmbito);
        }

        if (selectedLicenca !== 'Todas') {
            filtered = filtered.filter(event => event.licenca === selectedLicenca);
        }

        if (selectedRegiao !== 'Todas') {
            filtered = filtered.filter(event => event.regiao === selectedRegiao);
        }
        
        if (selectedDistrito !== 'Todos') {
            filtered = filtered.filter(event => event.distrito === selectedDistrito);
        }

        const monthMap = {'JAN':1, 'FEV':2, 'MAR':3, 'ABR':4, 'MAI':5, 'JUN':6, 'JUL':7, 'AGO':8, 'SET':9, 'OUT':10, 'NOV':11, 'DEZ':12};
        
        filtered = filtered.filter(event => {
            const dateStr = event.date.toUpperCase();
            for (const [mStr, mNum] of Object.entries(monthMap)) {
                if (dateStr.includes(mStr)) {
                    return mNum >= monthFrom && mNum <= monthTo;
                }
            }
            return true;
        });

        if (selectedTags.length > 0) {
            filtered = filtered.filter(event => selectedTags.includes(event.tag));
        }

        setFilteredEvents(filtered);
        setCurrentPage(1); // Reset page on filter change
    }, [events, searchTerm, selectedEscalao, selectedAmbito, selectedLicenca, selectedRegiao, selectedDistrito, monthFrom, monthTo, selectedTags]);

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

    // Fetch Programa on Modal open
    useEffect(() => {
        if (!selectedEvent) {
            setProgramaData({ loading: false, html: null, error: null, additionalLinks: [] });
            return;
        }

        const fetchPrograma = async () => {
            // Find a valid URL to extract from (prefer Cabreira, then FPC)
            let targetUrl = null;
            if (selectedEvent.extraLinks && selectedEvent.extraLinks.length > 0) {
                const cabreiraLink = selectedEvent.extraLinks.find(l => l.link.includes('cabreira'));
                const fpcLink = selectedEvent.extraLinks.find(l => l.link.includes('fpciclismo') && !l.link.includes('inscrever'));
                if (cabreiraLink) targetUrl = cabreiraLink.link;
                else if (fpcLink) targetUrl = fpcLink.link;
            }
            if (!targetUrl) {
                if (selectedEvent.link && !selectedEvent.link.includes('fpciclismo.pt/calendario')) {
                    targetUrl = selectedEvent.link;
                }
            }

            if (!targetUrl || targetUrl === 'https://www.fpciclismo.pt/' || targetUrl === 'https://cabreirasolutions.com/eventos/') {
                return; // No specific event page to scrape
            }

            setProgramaData({ loading: true, html: null, error: null, additionalLinks: [] });
            try {
                const res = await fetch(`/api/programa?url=${encodeURIComponent(targetUrl)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProgramaData({ 
                        loading: false, 
                        html: data.programa || null, 
                        error: !data.programa ? 'O programa detalhado não foi encontrado. Por favor verifique o Website Oficial.' : null,
                        additionalLinks: data.additionalLinks || []
                    });
                } else {
                    setProgramaData({ loading: false, html: null, error: 'Falha ao aceder à página oficial.', additionalLinks: [] });
                }
            } catch (err) {
                setProgramaData({ loading: false, html: null, error: 'Erro de ligação.', additionalLinks: [] });
            }
        };

        fetchPrograma();
    }, [selectedEvent]);

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
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                        </svg>
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
                                ✕
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
                            
                            {activeFilters.includes('escalao') && (
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
                        <p>Ocorreu um erro: {error}</p>
                        <button 
                            onClick={() => fetchEvents(selectedYear, selectedSources)}
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
                                <div key={event.id} className="event-list-item" onClick={() => setSelectedEvent(event)} style={{ cursor: 'pointer', padding: '0.75rem 1rem' }}>
                                    <div className="event-list-main">
                                        <div className="event-list-date" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'none', padding: '0', flex: '0 0 130px' }}>
                                            <span style={{ lineHeight: '1.2' }}>📅 {event.date}</span>
                                            {event.endDate && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.2', marginTop: '0.2rem' }}>a {event.endDate}</span>}
                                        </div>
                                        
                                        <div className="event-list-info">
                                            <h3 className="event-list-title">{event.title}</h3>
                                            <div className="event-list-details">
                                                <div className="event-list-detail-item" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                    </svg>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {event.escalao} {extraDetails ? `(${extraDetails})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="event-list-location">
                                            <span style={{ flexShrink: 0, marginTop: '1px' }}>📍</span>
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
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
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
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                            <div style={{ width: '130px' }}></div>
                        </div>
                    </>
                )}

                {selectedEvent && (
                    <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
                            <h2 className="modal-title">{selectedEvent.title}</h2>
                            <p className="modal-date" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                                📅 {selectedEvent.date}{selectedEvent.endDate ? ` a ${selectedEvent.endDate}` : ''}
                            </p>
                            
                            <div className="modal-tags" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                                <span className="event-list-tag" style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{selectedEvent.escalao}</span>
                                <span className="event-list-tag" style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{selectedEvent.ambito}</span>
                                {selectedEvent.licenca && <span className="event-list-tag" style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{selectedEvent.licenca}</span>}
                            </div>
                            
                            <div className="modal-two-cols">
                                <div className="modal-programa-section">
                                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-color)', display: 'inline-block', paddingBottom: '0.25rem' }}>Programa & Horários</h3>
                                    
                                    {programaData.loading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                            <div className="spinner"></div>
                                            <span>A procurar programa oficial...</span>
                                        </div>
                                    ) : programaData.html ? (
                                        <div className="programa-content" dangerouslySetInnerHTML={{ __html: programaData.html }} />
                                    ) : programaData.error && selectedEvent.extraLinks && selectedEvent.extraLinks.length > 0 ? (
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                                            <em>{programaData.error}</em>
                                        </div>
                                    ) : null}
                                </div>
                                
                                {selectedEvent.details && selectedEvent.details !== 'A definir' && (
                                    <div className="modal-map" style={{ height: '100%', minHeight: '400px' }}>
                                        <iframe 
                                            style={{ border: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', width: '100%', height: '100%' }}
                                            loading="lazy" 
                                            allowFullScreen 
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                        ></iframe>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                                {programaData.loading ? (
                                    <div style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                        <span>A carregar links...</span>
                                    </div>
                                ) : (() => {
                                    const allLinks = [];
                                    if (programaData.additionalLinks) allLinks.push(...programaData.additionalLinks);
                                    if (selectedEvent.extraLinks && selectedEvent.extraLinks.length > 0) allLinks.push(...selectedEvent.extraLinks);
                                    if (allLinks.length === 0) {
                                        allLinks.push({ label: `Visitar ${selectedEvent.source}`, link: selectedEvent.link || (selectedEvent.source === 'FPC' ? 'https://www.fpciclismo.pt/' : 'https://cabreirasolutions.com/eventos/') });
                                    }
                                    
                                    const uniqueLinks = Array.from(new Map(allLinks.map(item => [item.link, item])).values());
                                    const isInscrever = l => l.label.toLowerCase().includes('inscrev') || l.label.toLowerCase().includes('inscriç') || l.label.toLowerCase().includes('inscric');
                                    const inscricaoLinks = uniqueLinks.filter(isInscrever);
                                    const outrosLinks = uniqueLinks.filter(l => !isInscrever(l));

                                    return (
                                        <>
                                            {outrosLinks.map((src, idx) => (
                                                <a key={`outros-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="modal-btn secondary">
                                                    {src.label}
                                                </a>
                                            ))}
                                            
                                            {inscricaoLinks.length === 1 && (
                                                <a href={inscricaoLinks[0].link} target="_blank" rel="noopener noreferrer" className="modal-btn primary">
                                                    {inscricaoLinks[0].label}
                                                </a>
                                            )}
                                            
                                            {inscricaoLinks.length > 1 && (
                                                <div className="dropdown-container">
                                                    <button className="modal-btn primary">
                                                        Inscrever <span style={{ fontSize: '0.7em' }}>▼</span>
                                                    </button>
                                                    <div className="dropdown-menu">
                                                        <div className="dropdown-item-container">
                                                            {inscricaoLinks.map((src, idx) => {
                                                                let plat = "Plataforma";
                                                                const sLabel = src.label.toLowerCase();
                                                                const sLink = src.link.toLowerCase();
                                                                if (sLink.includes('cabreira') || sLabel.includes('cabreira')) plat = "Cabreira";
                                                                else if (sLink.includes('fpc') || sLabel.includes('fpc')) plat = "FPC";
                                                                else plat = src.label.replace(/inscrever|inscrição|inscricao|visitar|em|na|no/ig, '').replace(/\s+/g, ' ').trim() || "Plataforma";
                                                                
                                                                return (
                                                                    <a key={`inscr-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                                                        Inscrever ({plat})
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
