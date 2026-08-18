import { useState, useEffect } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const { resolvedTheme } = useTheme();
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null); // 'success', 'exists', 'error'
    const [calendarMsg, setCalendarMsg] = useState('');
    const [activeTab, setActiveTab] = useState('info');

    // Formata datas de inscrição em pt-PT sem segundos (usa UTC para preservar hora original)
    const formatRegDate = (isoStr) => {
        if (!isoStr) return 'A definir';
        const d = new Date(isoStr);
        const datePart = d.toLocaleDateString('pt-PT', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
        const timePart = d.toLocaleTimeString('pt-PT', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
        return `${datePart} às ${timePart}`;
    };

    // Fetch Programa on Modal open
    useEffect(() => {
        if (!selectedEvent) {
            setProgramaData({ loading: false, html: null, error: null, additionalLinks: [] });
            setCalendarStatus(null);
            setCalendarMsg('');
            setActiveTab('info');
            return;
        }

        setCalendarMsg('');

        const fetchPrograma = async () => {
            if (selectedEvent.programa && selectedEvent.programa.trim().length > 0) {
                setProgramaData({ loading: false, html: selectedEvent.programa, error: null, additionalLinks: [] });
                return;
            }

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

    const handleHtmlClick = (e) => {
        if (e.target.tagName === 'IMG') {
            setFullscreenImage(e.target.src);
        }
    };

    const handleAddToCalendar = async () => {
        if (!isSignedIn || !selectedEvent) return;
        setIsAddingToCalendar(true);
        setCalendarStatus(null);
        setCalendarMsg('');
        try {
            const res = await fetch('/api/calendar/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: selectedEvent })
            });
            const data = await res.json();
            
            if (res.ok) {
                if (data.message === 'exists') {
                    setCalendarStatus('exists');
                    setCalendarMsg('Já existe no calendário!');
                } else {
                    setCalendarStatus('success');
                    setCalendarMsg('Adicionado com sucesso!');
                }
            } else {
                setCalendarStatus('error');
                setCalendarMsg(data.error || 'Erro ao adicionar ao calendário');
            }
        } catch (error) {
            console.error("Error adding to calendar:", error);
            setCalendarStatus('error');
            setCalendarMsg('Erro de rede');
        } finally {
            setIsAddingToCalendar(false);
        }
    };

    if (!selectedEvent) return null;

    return (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem', paddingRight: '2rem', marginBottom: '0.5rem' }}>
                    {selectedEvent.logo && (
                        <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexShrink: 0 }} title="Abrir página do evento">
                            <img 
                                src={selectedEvent.logo} 
                                alt={`Logo ${selectedEvent.title}`} 
                                style={{ height: '40px', width: 'auto', borderRadius: '4px', objectFit: 'contain' }} 
                            />
                        </a>
                    )}
                    <h2 className="modal-title" style={{ paddingRight: 0, marginBottom: 0 }}>
                        {selectedEvent.logo ? (
                            <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {selectedEvent.title}
                            </a>
                        ) : (
                            selectedEvent.title
                        )}
                    </h2>
                    {isSignedIn && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(selectedEvent.id);
                            }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0.5rem', borderRadius: '50%',
                                transition: 'var(--transition)',
                                backgroundColor: favorites.includes(selectedEvent.id) ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                            }}
                            title={favorites.includes(selectedEvent.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                            <Star 
                                size={24} 
                                color={favorites.includes(selectedEvent.id) ? "#eab308" : "var(--text-secondary)"} 
                                fill={favorites.includes(selectedEvent.id) ? "#eab308" : "none"} 
                                style={{ transition: 'var(--transition)' }}
                            />
                        </button>
                    )}
                </div>

                <p className="modal-date" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', marginTop: '0.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={18} /> {selectedEvent.date}{selectedEvent.endDate ? ` a ${selectedEvent.endDate}` : ''}
                </p>
                
                {/* Tabs Navigation */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }} className="hide-scrollbar custom-scrollbar">
                    {['info', 'escaloes', 'programa', 'inscricao', 'premios', 'localizacao'].map(tab => {
                        const labels = {
                            info: 'Info do Evento',
                            escaloes: 'Escalões Elegíveis',
                            programa: 'Programa',
                            inscricao: 'Inscrição & Preços',
                            premios: 'Prémios & Seguro',
                            localizacao: 'Localização'
                        };
                        return (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    background: activeTab === tab ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-full)',
                                    cursor: 'pointer',
                                    fontWeight: activeTab === tab ? '600' : '400',
                                    whiteSpace: 'nowrap',
                                    transition: 'var(--transition)',
                                    boxShadow: activeTab === tab ? 'var(--shadow-glow)' : 'none'
                                }}
                            >
                                {labels[tab]}
                            </button>
                        );
                    })}
                </div>

                {/* Wrap all tabs in a flex-grow area so modal-actions sticks to bottom */}
                <div className="modal-tab-panel">

                {/* Tab: INFO */}
                {activeTab === 'info' && (
                    <div className="tab-content fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Descrição com scroll próprio */}
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '0.25rem' }} className="custom-scrollbar">
                            {selectedEvent.description ? (
                                <div className="description-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: selectedEvent.description }} />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Descrição não disponível.</p>
                            )}
                        </div>
                        {/* Âmbito e Organização sempre visíveis em baixo */}
                        <div style={{ flexShrink: 0, marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', flex: 1 }}>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Âmbito</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedEvent.ambito}</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', flex: 1 }}>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Organização</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {selectedEvent.source === 'Cabreira' ? 'Cabreira Solutions' : selectedEvent.source}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: ESCALOES */}
                {activeTab === 'escaloes' && (
                    <div className="tab-content escaloes-tab fade-in">
                        {(!selectedEvent.escaloes || selectedEvent.escaloes.length === 0) ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Informação de escalões não disponível.</p>
                        ) : (
                            <div className="eligibilidade-card">
                                <p className="escaloes-intro">
                                    Este evento está aberto às seguintes categorias de participação:
                                </p>
                                <div className="escaloes-list">
                                    {(selectedEvent.escaloes || []).map((esc, idx) => (
                                        <div key={`esc-${idx}`} className="escalao-chip">
                                            <Bike size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                            <span>{esc}</span>
                                        </div>
                                    ))}
                                </div>
                                {selectedEvent.licenca && (
                                    <div className="licenca-card">
                                        <FileText size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                        <div>
                                            <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Licença</strong>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedEvent.licenca}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: PROGRAMA */}
                {activeTab === 'programa' && (
                    <div className="tab-content programa-tab fade-in" style={{ paddingTop: 0 }}>
                        {selectedEvent.programa ? (
                            <div className="programa-content custom-scrollbar" dangerouslySetInnerHTML={{ __html: selectedEvent.programa }} onClick={handleHtmlClick} />
                        ) : programaData.loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', paddingTop: '1rem' }}>
                                <div className="spinner"></div>
                                <span>A procurar programa oficial...</span>
                            </div>
                        ) : programaData.html ? (
                            <div className="programa-content" dangerouslySetInnerHTML={{ __html: programaData.html }} onClick={handleHtmlClick} />
                        ) : programaData.error && selectedEvent.extraLinks && selectedEvent.extraLinks.length > 0 ? (
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                <em>{programaData.error}</em>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                <em>Programa não disponível na Base de Dados. A aguardar recolha do sistema.</em>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: INSCRIÇÃO & PREÇOS */}
                {activeTab === 'inscricao' && (
                    <div className="tab-content inscricao-tab fade-in">
                        {/* Preços - full width on top */}
                        <div className="inscricao-precos-scroll">
                            {selectedEvent.prices ? (
                                <div className="prices-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: selectedEvent.prices }} />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Informação não disponível.</p>
                        )}
                    </div>
                    {/* Datas - below */}
                        <div className="inscricao-datas">
                            <div>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Abertura das Inscrições</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {selectedEvent.registrationOpensAt ? formatRegDate(selectedEvent.registrationOpensAt) : 'A definir'}
                                </p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Fecho das Inscrições</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {selectedEvent.registrationClosesAt ? formatRegDate(selectedEvent.registrationClosesAt) : 'A definir'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: PREMIOS E SEGURO */}
                {activeTab === 'premios' && (
                    <div className="tab-content fade-in">
                        <div className="premios-seguro-content">
                            <div className="premio-seguro-panel">
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Trophy size={15} /> Prémios
                                </h4>
                                {selectedEvent.prizes ? (
                                    <div className="prizes-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: selectedEvent.prizes }} />
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Informação não disponível.</p>
                                )}
                            </div>
                            <div className="premio-seguro-panel">
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={15} /> Seguro
                                </h4>
                                {selectedEvent.insurance ? (
                                    <div className="insurance-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: selectedEvent.insurance }} />
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Informação não disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="tab-content localizacao-tab fade-in">
                        {selectedEvent.details && selectedEvent.details !== 'A definir' ? (
                            <div className="modal-map">
                                <iframe 
                                    className={resolvedTheme === 'dark' ? 'map-dark-mode' : 'map-light-mode'}
                                    style={{ border: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', width: '100%', height: '100%' }}
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>Localização a definir.</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                <div className="modal-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'stretch', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
                        const inscricaoLinksRaw = uniqueLinks.filter(isInscrever);
                        const outrosLinks = uniqueLinks.filter(l => !isInscrever(l));
                        
                        const inscricaoLinks = [];
                        const seenPlats = new Set();
                        for (const src of inscricaoLinksRaw) {
                            let plat = "Plataforma";
                            const sLabel = src.label.toLowerCase();
                            const sLink = src.link.toLowerCase();
                            if (sLink.includes('cabreira') || sLabel.includes('cabreira')) plat = "Cabreira";
                            else if (sLink.includes('fpc') || sLabel.includes('fpc')) plat = "FPC";
                            else plat = src.label.replace(/inscrever|inscrição|inscricao|visitar|em|na|no/ig, '').replace(/\s+/g, ' ').trim() || "Plataforma";
                            
                            if (!seenPlats.has(plat)) {
                                seenPlats.add(plat);
                                inscricaoLinks.push({ ...src, _plat: plat });
                            }
                        }

                        return (
                            <>
                                {outrosLinks.map((src, idx) => (
                                    <a key={`outros-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="modal-btn secondary">
                                        {src.label}
                                    </a>
                                ))}
                                
                                {inscricaoLinks.length === 1 && (
                                    <a href={inscricaoLinks[0].link} target="_blank" rel="noopener noreferrer" className="modal-btn primary">
                                        Inscrever
                                    </a>
                                )}
                                
                                {inscricaoLinks.length > 1 && (
                                    <div className="dropdown-container">
                                        <button className="modal-btn primary">
                                            Inscrever <span style={{ fontSize: '0.7em' }}>▼</span>
                                        </button>
                                        <div className="dropdown-menu">
                                            <div className="dropdown-item-container">
                                                {inscricaoLinks.map((src, idx) => (
                                                    <a key={`inscr-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                                        Inscrever ({src._plat})
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {isSignedIn && (
                        <button 
                            onClick={handleAddToCalendar}
                            disabled={isAddingToCalendar || calendarStatus === 'success' || calendarStatus === 'exists'}
                            className="modal-btn"
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                backgroundColor: calendarStatus === 'success' || calendarStatus === 'exists' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                color: calendarStatus === 'success' || calendarStatus === 'exists' ? '#22c55e' : 'var(--text-primary)',
                                border: `1px solid ${calendarStatus === 'success' || calendarStatus === 'exists' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                                opacity: isAddingToCalendar ? 0.7 : 1,
                                cursor: (isAddingToCalendar || calendarStatus === 'success' || calendarStatus === 'exists') ? 'default' : 'pointer'
                            }}
                        >
                            {isAddingToCalendar ? (
                                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                            ) : calendarStatus === 'success' || calendarStatus === 'exists' ? (
                                <Check size={18} />
                            ) : (
                                <CalendarPlus size={18} />
                            )}
                            {calendarMsg || 'Marcar no calendário'}
                        </button>
                    )}
                </div>
            </div>

            {fullscreenImage && (
                <div className="fullscreen-image-overlay" onClick={() => setFullscreenImage(null)}>
                    <button className="modal-close" style={{ top: '2rem', right: '2rem', background: 'rgba(0,0,0,0.5)', zIndex: 10000 }} onClick={() => setFullscreenImage(null)}>
                        <X size={24} />
                    </button>
                    <img src={fullscreenImage} alt="Programa Detalhado" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
