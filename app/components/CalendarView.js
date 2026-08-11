"use client";
import { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../SettingsContext';

export default function CalendarView({ 
    pageTitle = "Calendário FPC & Cabreira", 
    pageSubtitle = "Agregador oficial de ciclismo em Portugal",
    forceAmbito = null,
    forceLicenca = null
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
    const [selectedYear, setSelectedYear] = useState('2026');
    const [monthFrom, setMonthFrom] = useState(1);
    const [monthTo, setMonthTo] = useState(12);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    // Sync settings on mount
    useEffect(() => {
        if (defaultEscalao) {
            setSelectedEscalao(defaultEscalao);
        }
        if (defaultRegiao) {
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
            filtered = filtered.filter(event => 
                event.regiao === selectedRegiao || 
                event.ambito === 'Nacional' || 
                event.ambito === 'Taça de Portugal' ||
                event.ambito === 'Internacional' ||
                event.source === 'Cabreira'
            );
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
    }, [events, searchTerm, selectedEscalao, selectedAmbito, selectedLicenca, selectedRegiao, monthFrom, monthTo, selectedTags]);

    const uniqueEscaloes = ['Todos', 'Elite Amador / Individual', ...new Set(events.map(e => e.escalao))].filter((value, index, self) => self.indexOf(value) === index);
    const uniqueAmbitos = ['Todos', ...new Set(events.map(e => e.ambito))];
    const uniqueLicencas = ['Todas', ...new Set(events.filter(e => e.licenca).map(e => e.licenca))];
    
    const TODAS_AS_REGIOES = [
        'AC Minho', 'AC Porto', 'AC Vila Real', 'AC Beira Litoral', 'AC Beira Alta',
        'AC Beira Interior', 'AC Santarém', 'AC Setúbal', 'AC Algarve', 'AC Madeira', 'AC Açores'
    ];
    const uniqueRegioes = ['Todas', ...new Set([...TODAS_AS_REGIOES, ...events.map(e => e.regiao).filter(r => r)])];
    const availableTags = [...new Set(events.map(e => e.tag))];

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const onSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());
    const onYearChange = (e) => setSelectedYear(e.target.value);
    
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

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <h1>{pageTitle}</h1>
                        <p>{pageSubtitle}</p>
                    </div>
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
                            fontSize: '0.95rem',
                            alignSelf: 'flex-start'
                        }}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                        </svg>
                        {showFilters ? 'Esconder Filtros' : 'Filtrar Calendário'}
                    </button>
                </div>
                
                {showFilters && (
                    <div className="filters-container" style={{ 
                        marginTop: '1.5rem', 
                        background: 'var(--bg-secondary)', 
                        padding: '1.5rem', 
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--card-border)'
                    }}>
                        <div className="controls" style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                            gap: '1.25rem', 
                            width: '100%' 
                        }}>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Ano</label>
                                <select className="searchInput" value={selectedYear} onChange={onYearChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Inicial</label>
                                <select className="searchInput" value={monthFrom} onChange={onMonthFromChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                    {monthNames.map((mName, i) => <option key={i+1} value={i+1}>{i+1} - {mName}</option>)}
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Mês Final</label>
                                <select className="searchInput" value={monthTo} onChange={onMonthToChange} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                    {monthNames.map((mName, i) => <option key={i+1} value={i+1}>{i+1} - {mName}</option>)}
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Escalão</label>
                                <select className="searchInput" value={selectedEscalao} onChange={(e) => setSelectedEscalao(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                    {uniqueEscaloes.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            
                            {!forceAmbito && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Âmbito</label>
                                    <select className="searchInput" value={selectedAmbito} onChange={(e) => setSelectedAmbito(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                        {uniqueAmbitos.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            {!forceLicenca && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Licença</label>
                                    <select className="searchInput" value={selectedLicenca} onChange={(e) => setSelectedLicenca(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                        {uniqueLicencas.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Região</label>
                                <select className="searchInput" value={selectedRegiao} onChange={(e) => setSelectedRegiao(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                                    {uniqueRegioes.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Pesquisa Livre</label>
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar por nome de prova ou localidade..." 
                                    value={searchTerm} 
                                    onChange={onSearchChange} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--accent-primary)', 
                                        background: 'var(--card-bg)', 
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>
                        
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
                        <div className="events-grid">
                            {filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(event => (
                                <div key={event.id} className="event-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span className="event-date">📅 {event.date}</span>
                                        {event.source === 'Cabreira' ? (
                                            <img 
                                                src="/logo-cabreira.png" 
                                                alt="Cabreira Solutions"
                                                style={{ height: '24px', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <img 
                                                src="/logo-fpc.png" 
                                                alt="FPC"
                                                style={{ height: '24px', objectFit: 'contain' }}
                                            />
                                        )}
                                    </div>
                                    
                                    <h3 className="event-title">{event.title}</h3>
                                    
                                    <div className="event-details">
                                        <div className="detail-item">
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            {event.escalao} ({event.details})
                                        </div>
                                        <div className="detail-item" style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span className="event-tag" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                                                {event.ambito}
                                            </span>
                                            {event.licenca && (
                                                <span className="event-tag" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                                                    {event.licenca}
                                                </span>
                                            )}
                                            {event.regiao && (
                                                <span className="event-tag" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                                                    📍 {event.regiao}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pagination" style={{ display: 'flex', width: '100%', alignItems: 'center', marginTop: '2rem', paddingBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Provas por página:</span>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '4px',
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <option value={9}>9</option>
                                    <option value={18}>18</option>
                                    <option value={30}>30</option>
                                    <option value={10000}>Todas</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--card-bg)',
                                        color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ← Anterior
                                </button>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    Página {currentPage} de {Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEvents.length / itemsPerPage), p + 1))}
                                    disabled={currentPage >= Math.ceil(filteredEvents.length / itemsPerPage)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--card-bg)',
                                        color: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 'var(--text-secondary)' : 'var(--text-primary)',
                                        cursor: currentPage >= Math.ceil(filteredEvents.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Próxima →
                                </button>
                            </div>
                            
                            <div style={{ flex: 1, minWidth: '200px' }}></div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
