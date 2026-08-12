import { useState, useEffect } from 'react';
import { Calendar, Star, X } from 'lucide-react';

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });
    const [fullscreenImage, setFullscreenImage] = useState(null);

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

    const handleHtmlClick = (e) => {
        if (e.target.tagName === 'IMG') {
            setFullscreenImage(e.target.src);
        }
    };

    if (!selectedEvent) return null;

    return (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem', paddingRight: '2rem', marginBottom: '0.5rem' }}>
                    <h2 className="modal-title" style={{ paddingRight: 0, marginBottom: 0 }}>{selectedEvent.title}</h2>
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
                            <div className="programa-content" dangerouslySetInnerHTML={{ __html: programaData.html }} onClick={handleHtmlClick} />
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
