import { useState, useEffect, useMemo } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield, Users, Globe } from 'lucide-react';
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
            if (activeEvent?.programa !== undefined) {
                setFullEvent(selectedEvent);
            } else {
                try {
                    const res = await fetch(`/api/events/${selectedEvent.id}`);
                    const data = await res.json();
                    if (data.success && data.event) {
                        setFullEvent({ ...selectedEvent, ...data.event });
                    }
                } catch (e) {
                    console.error("Error fetching full event:", e);
                }
            }
        };

        loadFullEvent();
    }, [selectedEvent]);


    // Formata datas de inscrição em pt-PT sem segundos (usa UTC para preservar hora original)
    const formatRegDate = (isoStr) => {
        if (!isoStr) return 'A definir';
        const d = new Date(isoStr);
        const datePart = d.toLocaleDateString('pt-PT', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
        const timePart = d.toLocaleTimeString('pt-PT', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
        return `${datePart} às ${timePart}`;
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

    // Clean up fpc-downloads layout
    programaCleanHtml = programaCleanHtml.replace(/<div class="fpc-downloads" style="margin-top: 1\.5rem;">/g, '<div class="fpc-downloads">');
    programaCleanHtml = programaCleanHtml.replace(/<h4[^>]*>.*?<\/h4>/g, '');
    programaCleanHtml = programaCleanHtml.replace(/width="24" height="24"/g, 'width="18" height="18"');
    programaCleanHtml = programaCleanHtml.replace(/color: var\(--accent-primary\);/g, 'color: var(--text-secondary);');

    // Calcula as tabs ativas baseadas nos dados reais do evento
    const availableTabs = useMemo(() => {
        if (!selectedEvent) return [];
        const tabs = [];
        if (activeEvent.description || activeEvent.ambito || activeEvent.organizador) tabs.push('info');
        if (activeEvent.escaloes && activeEvent.escaloes.length > 0) tabs.push('escaloes');
        if (programaCleanHtml && programaCleanHtml.trim().length > 0 && programaCleanHtml !== 'Não disponível') tabs.push('programa');
        if (activeEvent.prices || activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) tabs.push('inscricao');
        if (activeEvent.prizes || activeEvent.insurance) tabs.push('premios');
        if (activeEvent.details && activeEvent.details !== 'A definir') tabs.push('localizacao');
        return tabs;
    }, [activeEvent, programaCleanHtml]);

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

        if (activeEvent.programa && activeEvent.programa.trim().length > 0 && activeEvent.programa !== 'Não disponível') {
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

    const dateParts = activeEvent.date ? activeEvent.date.split(' ') : [];
    const day = dateParts[0] || '';
    const month = dateParts[1] || '';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedEvent(null)}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10" onClick={() => setSelectedEvent(null)}>
                    <X size={24} />
                </button>
                
                <div className="flex items-center justify-start gap-4 pr-12 mb-2 p-6 pb-0">
                    <div className="flex flex-col shrink-0 w-[56px] h-[56px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                        <div className="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                            {month}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-white text-lg font-bold">
                            {day}
                        </div>
                    </div>
                    {activeEvent.logo && (
                        <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="flex shrink-0" title="Abrir página do evento">
                            <SmartLogo 
                                src={activeEvent.logo} 
                                alt={`Logo ${activeEvent.title}`} 
                                className="h-10 w-auto object-contain" 
                                style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                            />
                        </a>
                    )}
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-50 m-0">
                        {activeEvent.logo ? (
                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-400 transition-colors">
                                {activeEvent.title}
                            </a>
                        ) : (
                            <span className="text-slate-50">{activeEvent.title}</span>
                        )}
                    </h2>
                    {isSignedIn && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(activeEvent.id);
                            }}
                            className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${favorites.includes(activeEvent.id) ? 'bg-slate-800 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-slate-800/50 border border-transparent hover:bg-slate-700'}`}
                            title={favorites.includes(activeEvent.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                        >
                            <Star 
                                size={16} 
                                className={`transition-all duration-300 ${favorites.includes(activeEvent.id) ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]' : 'text-slate-400'}`}
                                fill={favorites.includes(activeEvent.id) ? "#facc15" : "none"}
                            />
                        </button>
                    )}
                </div>

                {activeEvent.endDate ? (
                    <p className="text-slate-400 mb-6 mt-2 text-sm flex items-center gap-2 px-6">
                        <Calendar size={14} /> Até {activeEvent.endDate}
                    </p>
                ) : (
                    <div className="mb-6 mt-2"></div>
                )}
                
                {/* Tabs Navigation */}
                {availableTabs.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-white/10 px-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {availableTabs.map(tab => {
                            const labels = {
                                info: 'Info do Evento',
                                escaloes: 'Escalões Elegíveis',
                                programa: activeEvent.source === 'FPC' ? 'Documentos & Detalhes FPC' : 'Programa',
                                inscricao: 'Inscrição & Preços',
                                premios: 'Prémios & Seguro',
                                localizacao: 'Localização'
                            };
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab ? 'bg-slate-700/60 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                                >
                                    {labels[tab]}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mb-4 pb-4 border-b border-white/10 px-6">
                        <p className="text-slate-400 text-sm">O nosso robô não conseguiu encontrar dados estruturados para este evento. A informação deverá estar disponível apenas na página oficial da organização.</p>
                    </div>
                )}

                {/* Wrap all tabs in a flex-grow area so modal-actions sticks to bottom */}
                <div className="flex-grow overflow-hidden flex flex-col px-6">
                
                {availableTabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 animate-fade-in">
                        <FileText size={48} className="text-slate-600" />
                        <h3 className="m-0 text-slate-200 text-center text-xl font-semibold">Não há dados detalhados</h3>
                        <a 
                            href={activeEvent.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-blue-600 text-white no-underline px-8 py-4 rounded-full font-semibold inline-block shadow-lg hover:bg-blue-500 transition-colors"
                        >
                            Visitar Site da Organização
                        </a>
                    </div>
                )}

                {/* Tab: INFO */}
                {activeTab === 'info' && (
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {fpcBannerHtml && (
                                <div className="mb-6 text-center" dangerouslySetInnerHTML={{ __html: fpcBannerHtml }} />
                            )}
                            {activeEvent.description ? (
                                <div className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.description }} />
                            ) : (
                                <p className="text-slate-400">Descrição não disponível.</p>
                            )}
                        </div>
                        
                        <div className="shrink-0 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                            {activeEvent.licenca && (
                                <div className="p-5 bg-slate-800/50 rounded-lg border border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <FileText size={16} />
                                        <span className="text-xs uppercase tracking-wider font-semibold">Licença</span>
                                    </div>
                                    <span className="text-slate-200 text-base font-medium">{activeEvent.licenca}</span>
                                </div>
                            )}
                            {(activeEvent.organizador || activeEvent.source) && (
                                <div className="p-5 bg-slate-800/50 rounded-lg border border-white/5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users size={16} />
                                        <span className="text-xs uppercase tracking-wider font-semibold">Organização</span>
                                    </div>
                                    <span className="text-slate-200 text-base font-medium">
                                        {activeEvent.organizador 
                                            ? (activeEvent.organizador === 'U.V.P./F.P.C' ? 'FPC' : activeEvent.organizador) 
                                            : (activeEvent.source === 'Cabreira' ? 'Cabreira Solutions' : activeEvent.source)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Tab: ESCALOES */}
                {activeTab === 'escaloes' && (
                    <div className="flex flex-col h-full animate-fade-in">
                        {(!activeEvent.escaloes || activeEvent.escaloes.length === 0) ? (
                            <p className="text-slate-400">Informação de escalões não disponível.</p>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    <div className="mb-8">
                                        <h4 className="mb-4 text-slate-200 flex items-center gap-2 text-lg font-medium">
                                            <Bike size={18} className="text-blue-400" />
                                            Categorias de Participação
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {activeEvent.escaloes.map((esc, idx) => (
                                                <div key={`esc-${idx}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-transform cursor-default">
                                                    <span>{esc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: PROGRAMA */}
                {activeTab === 'programa' && (
                    <div className="pt-0 flex flex-col h-full animate-fade-in">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {fpcBannerHtml && (
                                <div className="mb-6 text-center" dangerouslySetInnerHTML={{ __html: fpcBannerHtml }} />
                            )}
                            {programaCleanHtml ? (
                                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: programaCleanHtml }} onClick={handleHtmlClick} />
                            ) : (
                                <div className="p-4 bg-slate-800/50 rounded-lg text-slate-400 mt-4">
                                    <em>Programa não disponível na Base de Dados. A aguardar recolha do sistema.</em>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: INSCRIÇÃO & PREÇOS */}
                {activeTab === 'inscricao' && (
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent mb-4">
                            {activeEvent.prices ? (
                                <div className="text-slate-300 text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prices }} />
                            ) : (
                                <p className="text-slate-400 text-sm">Informação não disponível.</p>
                            )}
                        </div>
                        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                <h4 className="mb-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">Abertura das Inscrições</h4>
                                <p className="text-slate-200 text-sm font-medium">
                                    {activeEvent.registrationOpensAt ? formatRegDate(activeEvent.registrationOpensAt) : 'A definir'}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                <h4 className="mb-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">Fecho das Inscrições</h4>
                                <p className="text-slate-200 text-sm font-medium">
                                    {activeEvent.registrationClosesAt ? formatRegDate(activeEvent.registrationClosesAt) : 'A definir'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: PREMIOS E SEGURO */}
                {activeTab === 'premios' && (
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                            <div className="bg-slate-800/30 p-5 rounded-lg border border-white/5">
                                <h4 className="mb-4 text-slate-200 flex items-center gap-2 text-lg font-medium">
                                    <Trophy size={18} className="text-yellow-400" /> Prémios
                                </h4>
                                {activeEvent.prizes ? (
                                    <div className="text-slate-300 text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prizes }} />
                                ) : (
                                    <p className="text-slate-400 text-sm">Informação não disponível.</p>
                                )}
                            </div>
                            <div className="bg-slate-800/30 p-5 rounded-lg border border-white/5">
                                <h4 className="mb-4 text-slate-200 flex items-center gap-2 text-lg font-medium">
                                    <Shield size={18} className="text-green-400" /> Seguro
                                </h4>
                                {activeEvent.insurance ? (
                                    <div className="text-slate-300 text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.insurance }} />
                                ) : (
                                    <p className="text-slate-400 text-sm">Informação não disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="flex flex-col h-full animate-fade-in pb-4">
                        {activeEvent.details && activeEvent.details !== 'A definir' ? (
                            <div className="w-full h-64 sm:h-full min-h-[300px] rounded-lg overflow-hidden border border-white/10">
                                <iframe 
                                    className="w-full h-full border-0 grayscale invert opacity-80"
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p className="text-slate-400">Localização a definir.</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                <div className="flex gap-4 flex-wrap items-stretch mt-3 pt-4 border-t border-white/10 px-6 pb-6 bg-slate-900 shrink-0">
                    {programaData.loading ? (
                        <div className="px-6 py-3 flex items-center gap-2 text-slate-400">
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
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
                                    <a key={`outros-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-white/5 flex items-center justify-center text-center">
                                        {src.label}
                                    </a>
                                ))}
                                
                                {inscricaoLinks.length === 1 && (
                                    <a href={inscricaoLinks[0].link} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center text-center">
                                        Inscrever
                                    </a>
                                )}
                                
                                {inscricaoLinks.length > 1 && (
                                    <div className="relative group">
                                        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                            Inscrever <span className="text-[0.7em]">▼</span>
                                        </button>
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                                            <div className="flex flex-col">
                                                {inscricaoLinks.map((src, idx) => (
                                                    <a key={`inscr-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-4 py-3 hover:bg-slate-700 text-slate-200 text-sm transition-colors border-b border-slate-700 last:border-0">
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
                            className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                                calendarStatus === 'success' || calendarStatus === 'exists'
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5'
                            } ${isAddingToCalendar ? 'opacity-70 cursor-default' : ''}`}
                        >
                            {isAddingToCalendar ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
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
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
                    <button className="absolute top-6 right-6 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors" onClick={() => setFullscreenImage(null)}>
                        <X size={24} />
                    </button>
                    <img src={fullscreenImage} alt="Programa Detalhado" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
