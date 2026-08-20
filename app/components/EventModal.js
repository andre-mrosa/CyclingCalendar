import { useState, useEffect, useMemo } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import SmartLogo from './SmartLogo';

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const { resolvedTheme } = useTheme();
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null); // 'success', 'exists', 'error'
    const [calendarMsg, setCalendarMsg] = useState('');
    const [activeTab, setActiveTab] = useState('info');
    const [fullEvent, setFullEvent] = useState(null);
    const activeEvent = fullEvent || selectedEvent;

    useEffect(() => {
        if (!selectedEvent) {
            setFullEvent(null);
            return;
        }
        
        const loadFullEvent = async () => {
            if (activeEvent.programa !== undefined) {
                setFullEvent(selectedEvent);
            } else {
                try {
                    const res = await fetch(`/api/events/${activeEvent.id}`);
                    const data = await res.json();
                    if (data.success && data.event) {
                        const mergedEvent = { ...selectedEvent, ...data.event };
                        setFullEvent(mergedEvent);
                    }
                } catch (e) {
                    console.error("Error fetching full event:", e);
                }
            }
        };

        loadFullEvent();
    }, [selectedEvent]);

    // Formata datas de inscriÃ§Ã£o em pt-PT sem segundos (usa UTC para preservar hora original)
    const formatRegDate = (isoStr) => {
        if (!isoStr) return 'A definir';
        const d = new Date(isoStr);
        const datePart = d.toLocaleDateString('pt-PT', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
        const timePart = d.toLocaleTimeString('pt-PT', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
        return `${datePart} Ã s ${timePart}`;
    };

    // Separate banner from programa content
    const programaContentFull = activeEvent?.programa || '';
    let fpcBannerHtml = '';
    let programaCleanHtml = programaContentFull;
    if (programaContentFull.includes('<div class="fpc-banner"')) {
        const bannerMatch = programaContentFull.match(/<div class="fpc-banner"[^>]*>[\s\S]*?<\/div>/);
        if (bannerMatch) {
            fpcBannerHtml = bannerMatch[0];
            programaCleanHtml = programaContentFull.replace(bannerMatch[0], '');
        }
    }

    // Calcula as tabs ativas baseadas nos dados reais do evento
    const availableTabs = useMemo(() => {
        if (!selectedEvent) return [];
        const tabs = [];
        if (activeEvent.description || activeEvent.ambito || activeEvent.organizador) tabs.push('info');
        if (activeEvent.escaloes && activeEvent.escaloes.length > 0) tabs.push('escaloes');
        if (programaCleanHtml && programaCleanHtml.trim().length > 0 && programaCleanHtml !== 'NÃ£o disponÃ­vel') tabs.push('programa');
        if (activeEvent.prices || activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) tabs.push('inscricao');
        if (activeEvent.prizes || activeEvent.insurance) tabs.push('premios');
        if (activeEvent.details && activeEvent.details !== 'A definir') tabs.push('localizacao');
        return tabs;
    }, [selectedEvent, programaCleanHtml]);

    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
            setActiveTab(availableTabs[0]);
        }
    }, [availableTabs, activeTab]);

    // Fetch Programa on Modal open (Now exclusively uses DB cache for speed)
    useEffect(() => {
        if (!selectedEvent) {
            setProgramaData({ loading: false, html: null, error: null, additionalLinks: [] });
            setCalendarStatus(null);
            setCalendarMsg('');
            // activeTab will be handled by the other useEffect
            return;
        }

        setCalendarMsg('');

        if (activeEvent.programa && activeEvent.programa.trim().length > 0 && activeEvent.programa !== 'NÃ£o disponÃ­vel') {
            setProgramaData({ loading: false, html: activeEvent.programa, error: null, additionalLinks: [] });
        } else {
            setProgramaData({ loading: false, html: null, error: null, additionalLinks: [] });
        }
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
                    setCalendarMsg('JÃ¡ existe no calendÃ¡rio!');
                } else {
                    setCalendarStatus('success');
                    setCalendarMsg('Adicionado com sucesso!');
                }
            } else {
                setCalendarStatus('error');
                setCalendarMsg(data.error || 'Erro ao adicionar ao calendÃ¡rio');
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
                <button className="modal-close" onClick={() => setSelectedEvent(null)}>âœ•</button>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem', paddingRight: '2rem', marginBottom: '0.5rem' }}>
                    {activeEvent.logo && (
                        <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexShrink: 0 }} title="Abrir pÃ¡gina do evento">
                            <SmartLogo 
                                src={activeEvent.logo} 
                                alt={`Logo ${activeEvent.title}`} 
                                style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
                            />
                        </a>
                    )}
                    <h2 className="modal-title" style={{ paddingRight: 0, marginBottom: 0 }}>
                        {activeEvent.logo ? (
                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                {activeEvent.title}
                            </a>
                        ) : (
                            activeEvent.title
                        )}
                    </h2>
                    {isSignedIn && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(activeEvent.id);
                            }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0.5rem', borderRadius: '50%',
                                transition: 'var(--transition)',
                                backgroundColor: favorites.includes(activeEvent.id) ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-secondary)'
                            }}
                            title={favorites.includes(activeEvent.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                            <Star 
                                size={24} 
                                color={favorites.includes(activeEvent.id) ? "#eab308" : "var(--text-secondary)"} 
                                fill={favorites.includes(activeEvent.id) ? "#eab308" : "none"} 
                                style={{ transition: 'var(--transition)' }}
                            />
                        </button>
                    )}
                </div>

                <p className="modal-date" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', marginTop: '0.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={18} /> {activeEvent.date}{activeEvent.endDate ? ` a ${activeEvent.endDate}` : ''}
                </p>
                
                {/* Tabs Navigation */}
                {availableTabs.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)' }} className="hide-scrollbar custom-scrollbar">
                        {availableTabs.map(tab => {
                            const labels = {
                                info: 'Info do Evento',
                                escaloes: 'EscalÃµes ElegÃ­veis',
                                programa: activeEvent.source === 'FPC' ? 'Documentos & Detalhes FPC' : 'Programa',
                                inscricao: 'InscriÃ§Ã£o & PreÃ§os',
                                premios: 'PrÃ©mios & Seguro',
                                localizacao: 'LocalizaÃ§Ã£o'
                            };
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        background: activeTab === tab ? 'var(--accent-primary)' : 'var(--bg-secondary)',
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
                ) : (
                    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--card-border)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>O nosso robÃ´ nÃ£o conseguiu encontrar dados estruturados para este evento. A informaÃ§Ã£o deverÃ¡ estar disponÃ­vel apenas na pÃ¡gina oficial da organizaÃ§Ã£o.</p>
                    </div>
                )}

                {/* Wrap all tabs in a flex-grow area so modal-actions sticks to bottom */}
                <div className="modal-tab-panel">
                
                {availableTabs.length === 0 && (
                    <div className="tab-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', padding: '2rem' }}>
                        <FileText size={48} style={{ color: 'var(--card-border)' }} />
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>NÃ£o hÃ¡ dados detalhados</h3>
                        <a 
                            href={activeEvent.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{
                                background: 'var(--accent-primary)', color: 'white', textDecoration: 'none',
                                padding: '1rem 2rem', borderRadius: 'var(--radius-full)', fontWeight: '600',
                                display: 'inline-block', boxShadow: 'var(--shadow-md)', transition: 'var(--transition)'
                            }}
                        >
                            Visitar Site da OrganizaÃ§Ã£o
                        </a>
                    </div>
                )}

                {/* Tab: INFO */}
                {activeTab === 'info' && (
                    <div className="tab-content fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* DescriÃ§Ã£o e Banner com scroll prÃ³prio */}
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '0.25rem' }} className="custom-scrollbar">
                            {/* FPC Banner at top if exists */}
                            {fpcBannerHtml && (
                                <div className="fpc-banner-container" style={{ marginBottom: '1.5rem', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: fpcBannerHtml }} />
                            )}
                            {activeEvent.description ? (
                                <div className="description-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: activeEvent.description }} />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>DescriÃ§Ã£o nÃ£o disponÃ­vel.</p>
                            )}
                        </div>
                        {/* Ã‚mbito e OrganizaÃ§Ã£o sempre visÃ­veis em baixo */}
                        <div style={{ flexShrink: 0, marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', flex: 1 }}>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Ã‚mbito</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeEvent.ambito}</span>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', flex: 1 }}>
                                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>OrganizaÃ§Ã£o</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {activeEvent.source === 'Cabreira' ? 'Cabreira Solutions' : activeEvent.source}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: ESCALOES */}
                {activeTab === 'escaloes' && (
                    <div className="tab-content escaloes-tab fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {(!selectedEvent.escaloes || activeEvent.escaloes.length === 0) ? (
                            <p style={{ color: 'var(--text-secondary)' }}>InformaÃ§Ã£o de escalÃµes nÃ£o disponÃ­vel.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                
                                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '0.25rem' }} className="custom-scrollbar">
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                                            <Bike size={18} style={{ color: 'var(--accent-primary)' }} />
                                            Categorias de ParticipaÃ§Ã£o
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            {(activeEvent.escaloes || []).map((esc, idx) => (
                                                <div key={`esc-${idx}`} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
                                                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                                                    color: 'var(--accent-secondary)', fontSize: '0.95rem', fontWeight: '500',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)', transition: 'transform 0.2s',
                                                    cursor: 'default'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    <span>{esc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flexShrink: 0, marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {activeEvent.licenca && (
                                        <div style={{ 
                                            padding: '1.25rem', background: 'var(--bg-secondary)', 
                                            borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <FileText size={16} />
                                                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>LicenÃ§a Exigida</span>
                                            </div>
                                            <span style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '500' }}>{activeEvent.licenca}</span>
                                        </div>
                                    )}
                                    {activeEvent.organizador && (
                                        <div style={{ 
                                            padding: '1.25rem', background: 'var(--bg-secondary)', 
                                            borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <Users size={16} />
                                                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Organizador Oficial</span>
                                            </div>
                                            <span style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '500' }}>{activeEvent.organizador}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: PROGRAMA */}
                {activeTab === 'programa' && (
                    <div className="tab-content programa-tab fade-in" style={{ paddingTop: 0 }}>
                        {programaCleanHtml ? (
                            <div className="programa-content custom-scrollbar" dangerouslySetInnerHTML={{ __html: programaCleanHtml }} onClick={handleHtmlClick} />
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                                <em>Programa nÃ£o disponÃ­vel na Base de Dados. A aguardar recolha do sistema.</em>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: INSCRIÃ‡ÃƒO & PREÃ‡OS */}
                {activeTab === 'inscricao' && (
                    <div className="tab-content inscricao-tab fade-in">
                        {/* PreÃ§os - full width on top */}
                        <div className="inscricao-precos-scroll">
                            {activeEvent.prices ? (
                                <div className="prices-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: activeEvent.prices }} />
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>InformaÃ§Ã£o nÃ£o disponÃ­vel.</p>
                        )}
                    </div>
                    {/* Datas - below */}
                        <div className="inscricao-datas">
                            <div>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Abertura das InscriÃ§Ãµes</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {activeEvent.registrationOpensAt ? formatRegDate(activeEvent.registrationOpensAt) : 'A definir'}
                                </p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Fecho das InscriÃ§Ãµes</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {activeEvent.registrationClosesAt ? formatRegDate(activeEvent.registrationClosesAt) : 'A definir'}
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
                                    <Trophy size={15} /> PrÃ©mios
                                </h4>
                                {activeEvent.prizes ? (
                                    <div className="prizes-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: activeEvent.prizes }} />
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>InformaÃ§Ã£o nÃ£o disponÃ­vel.</p>
                                )}
                            </div>
                            <div className="premio-seguro-panel">
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={15} /> Seguro
                                </h4>
                                {activeEvent.insurance ? (
                                    <div className="insurance-content" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: activeEvent.insurance }} />
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>InformaÃ§Ã£o nÃ£o disponÃ­vel.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="tab-content localizacao-tab fade-in">
                        {activeEvent.details && activeEvent.details !== 'A definir' ? (
                            <div className="modal-map">
                                <iframe 
                                    className={resolvedTheme === 'dark' ? 'map-dark-mode' : 'map-light-mode'}
                                    style={{ border: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', width: '100%', height: '100%' }}
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>LocalizaÃ§Ã£o a definir.</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                <div className="modal-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'stretch', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--card-border)' }}>
                    {programaData.loading ? (
                        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                            <span>A carregar links...</span>
                        </div>
                    ) : (() => {
                        const allLinks = [];
                        if (programaData.additionalLinks) allLinks.push(...programaData.additionalLinks);
                        if (activeEvent.extraLinks && activeEvent.extraLinks.length > 0) allLinks.push(...activeEvent.extraLinks);
                        if (allLinks.length === 0) {
                            allLinks.push({ label: `Visitar ${activeEvent.source}`, link: activeEvent.link || (activeEvent.source === 'FPC' ? 'https://www.fpciclismo.pt/' : 'https://cabreirasolutions.com/eventos/') });
                        }
                        
                        const uniqueLinks = Array.from(new Map(allLinks.map(item => [item.link, item])).values());
                        const isInscrever = l => l.label.toLowerCase().includes('inscrev') || l.label.toLowerCase().includes('inscriÃ§') || l.label.toLowerCase().includes('inscric');
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
                            else plat = src.label.replace(/inscrever|inscriÃ§Ã£o|inscricao|visitar|em|na|no/ig, '').replace(/\s+/g, ' ').trim() || "Plataforma";
                            
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
                                            Inscrever <span style={{ fontSize: '0.7em' }}>â–¼</span>
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
                                backgroundColor: calendarStatus === 'success' || calendarStatus === 'exists' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)',
                                color: calendarStatus === 'success' || calendarStatus === 'exists' ? 'rgb(34, 197, 94)' : 'var(--text-primary)',
                                border: `1px solid ${calendarStatus === 'success' || calendarStatus === 'exists' ? 'rgba(34, 197, 94, 0.2)' : 'var(--card-border)'}`,
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
                            {calendarMsg || 'Marcar no calendÃ¡rio'}
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


