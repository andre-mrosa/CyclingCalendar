import { useState, useEffect, useMemo } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield, Users, Globe } from 'lucide-react';
import { useTheme } from 'next-themes';
import SmartLogo from './SmartLogo';

const eventDetailsCache = new Map();

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const { resolvedTheme } = useTheme();
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const [calendarStatus, setCalendarStatus] = useState(null); // 'success', 'exists', 'error'
    const [calendarMsg, setCalendarMsg] = useState('');
    const [activeTab, setActiveTab] = useState('info');

    const [fullEvent, setFullEvent] = useState(null);
    const [isLoadingFullEvent, setIsLoadingFullEvent] = useState(false);
    const activeEvent = fullEvent || selectedEvent;

    useEffect(() => {
        if (!selectedEvent) {
            setFullEvent(null);
            setIsLoadingFullEvent(false);
            return;
        }

        // Instant load from cache if available
        if (eventDetailsCache.has(selectedEvent.id)) {
            setFullEvent(eventDetailsCache.get(selectedEvent.id));
            setIsLoadingFullEvent(false);
            return;
        }

        setFullEvent(null);
        setIsLoadingFullEvent(true);

        const loadFullEvent = async () => {
            try {
                const res = await fetch(`/api/events/${selectedEvent.id}`);
                const data = await res.json();
                if (data.success && data.event) {
                    const merged = { ...selectedEvent, ...data.event };
                    eventDetailsCache.set(selectedEvent.id, merged);
                    setFullEvent(merged);
                }
            } catch (e) {
                console.error("Error fetching full event:", e);
            } finally {
                setIsLoadingFullEvent(false);
            }
        };

        loadFullEvent();
    }, [selectedEvent]);

    // Bloquear o scroll da página de fundo quando o modal ou imagem em ecrã inteiro estiver aberto
    useEffect(() => {
        if (selectedEvent || fullscreenImage) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || '';
            };
        }
    }, [selectedEvent, fullscreenImage]);


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
            fpcBannerHtml = bannerMatch[0]
                .replace(/style="[^"]*"/g, '')
                .replace(/<img /g, '<img title="Clica para ampliar o cartaz" class="max-h-[440px] sm:max-h-[480px] w-auto max-w-full rounded-xl mx-auto object-contain shadow-lg border border-slate-800 cursor-zoom-in hover:scale-[1.01] transition-transform" ');
            programaCleanHtml = programaContentFull.replace(bannerMatch[0], '');
        }
    }

    if (activeEvent?.source === 'FPC') {
        let fpcDownloadsHtml = '';
        const downloadsMatch = programaContentFull.match(/<div class="fpc-downloads"[\s\S]*?<\/div>\s*<\/div>/);
        if (downloadsMatch) fpcDownloadsHtml = downloadsMatch[0];

        if (fpcDownloadsHtml) {
            programaCleanHtml = fpcDownloadsHtml;
        } else {
            // Se não houver downloads, deixar vazio em vez de mostrar lixo
            programaCleanHtml = '';
        }
    }

    // Clean up fpc-downloads layout
    programaCleanHtml = programaCleanHtml.replace(/<div class="fpc-downloads" style="margin-top: 1\.5rem;">/g, '<div class="fpc-downloads">');
    
    // Convert raw FPC inline styles to beautiful Tailwind classes
    programaCleanHtml = programaCleanHtml.replace(
        /style="display: flex; flex-direction: column; gap: 0\.75rem;"/g,
        'class="flex flex-col gap-2 m-0 p-0"'
    );
    programaCleanHtml = programaCleanHtml.replace(
        /style="display: flex; align-items: center; gap: 0\.75rem; padding: 1rem; background: var\(--bg-secondary\); border: 1px solid var\(--card-border\); border-radius: var\(--radius-md\); text-decoration: none; color: var\(--text-primary\); transition: all 0\.2s ease;"/g,
        'class="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/80 border border-white/5 rounded-lg text-slate-300 hover:text-white text-sm transition-colors !no-underline shadow-sm"'
    );
    programaCleanHtml = programaCleanHtml.replace(
        /<span style="font-weight: 500;">/g,
        '<span class="font-medium">'
    );
    programaCleanHtml = programaCleanHtml.replace(
        /style="color: var\(--text-secondary\);"/g,
        'class="text-slate-400 group-hover:text-slate-300"'
    );

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

    const rawDate = activeEvent.date || '';
    const isMultiDay = rawDate.includes(',') || rawDate.includes(' e ') || rawDate.includes(' a ');
    const dateParts = rawDate.split(' ');
    const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '';
    const month = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || '';

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9000] flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedEvent(null)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] sm:h-[86vh] flex flex-col shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 p-1.5 rounded-full hover:bg-slate-800 cursor-pointer" onClick={() => setSelectedEvent(null)}>
                    <X size={20} />
                </button>
                
                {/* Header */}
                <div className="flex items-center justify-start gap-3.5 pr-12 p-4 sm:p-5 pb-1">
                    <div className="flex flex-col shrink-0 w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                        <div className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                            {month}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-white text-base sm:text-lg font-bold">
                            {day}
                        </div>
                    </div>
                    {activeEvent.logo && (
                        <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="flex shrink-0" title="Abrir página do evento">
                            <SmartLogo 
                                src={activeEvent.logo} 
                                alt={`Logo ${activeEvent.title}`} 
                                className="h-8 w-auto object-contain" 
                                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                            />
                        </a>
                    )}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <h2 className="text-base sm:text-xl font-bold text-white m-0 truncate">
                            {activeEvent.logo ? (
                                <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-400 transition-colors truncate">
                                    {activeEvent.title}
                                </a>
                            ) : (
                                <span className="text-white truncate">{activeEvent.title}</span>
                            )}
                        </h2>
                        {(() => {
                            const isEventFavorited = favorites.includes(activeEvent.id) || (activeEvent._allIds && activeEvent._allIds.some(id => favorites.includes(id)));
                            return (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(activeEvent.id);
                                    }}
                                    className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${isEventFavorited ? 'bg-amber-400/15 border border-amber-500/40 text-amber-400' : 'bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
                                    title={isEventFavorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                                >
                                    <Star 
                                        size={14} 
                                        className="transition-transform"
                                        fill={isEventFavorited ? "#fbbf24" : "none"}
                                    />
                                </button>
                            );
                        })()}
                    </div>
                </div>

                {isMultiDay && (
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 px-4 sm:px-5 mb-1.5 mt-0">
                        <Calendar size={13} className="text-blue-400" /> {rawDate}
                    </p>
                )}
                
                {/* Tabs Navigation */}
                {availableTabs.length > 0 ? (
                    <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-2 border-b border-slate-800/80 px-4 sm:px-5 no-scrollbar shrink-0">
                        {availableTabs.map(tab => {
                            const labels = {
                                info: 'Info do Evento',
                                escaloes: 'Escalões Elegíveis',
                                programa: activeEvent.source === 'FPC' ? 'Documentos & Detalhes' : 'Programa',
                                inscricao: 'Inscrição & Preços',
                                premios: 'Prémios & Seguro',
                                localizacao: 'Localização'
                            };
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                                >
                                    {labels[tab]}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mb-2 pb-2 border-b border-slate-800/80 px-4 sm:px-5 shrink-0">
                        <p className="text-slate-400 text-xs">Informação detalhada disponível na página oficial da organização.</p>
                    </div>
                )}

                {/* Tab content area */}
                <div className="flex-grow overflow-hidden flex flex-col px-4 sm:px-5 min-h-0">
                
                {availableTabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 animate-fade-in">
                        <FileText size={40} className="text-slate-600" />
                        <h3 className="m-0 text-slate-200 text-center text-lg font-semibold">Não há dados detalhados</h3>
                        <a 
                            href={activeEvent.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-blue-600 text-white no-underline px-6 py-2.5 rounded-xl font-semibold inline-block shadow-lg hover:bg-blue-500 transition-colors text-sm"
                        >
                            Visitar Site da Organização
                        </a>
                    </div>
                )}

                {/* Tab: INFO */}
                {activeTab === 'info' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {isLoadingFullEvent && (
                                <div className="w-full h-48 sm:h-60 rounded-xl bg-slate-800/30 border border-slate-800/80 animate-pulse flex flex-col items-center justify-center gap-2 mb-2 text-slate-500">
                                    <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin"></div>
                                    <span className="text-xs font-medium">A carregar detalhes do evento...</span>
                                </div>
                            )}

                            {fpcBannerHtml && !isLoadingFullEvent && (
                                <div className="mb-2 text-center" dangerouslySetInnerHTML={{ __html: fpcBannerHtml }} onClick={handleHtmlClick} />
                            )}
                            {activeEvent.description ? (
                                <div className="text-slate-300 text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.description }} />
                            ) : !isLoadingFullEvent ? (
                                <p className="text-slate-400 text-xs sm:text-sm">Descrição não disponível.</p>
                            ) : null}
                        </div>
                        
                        <div className="shrink-0 mt-2 grid grid-cols-2 gap-2 pb-1">
                            {activeEvent.licenca && (
                                <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                        <FileText size={13} className="text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">Licença</span>
                                        <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate block">{activeEvent.licenca}</span>
                                    </div>
                                </div>
                            )}
                            {(activeEvent.organizador || activeEvent.source) && (
                                <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                        <Users size={13} className="text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">Organização</span>
                                        <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate block">
                                            {activeEvent.organizador 
                                                ? (activeEvent.organizador === 'U.V.P./F.P.C' ? 'FPC' : activeEvent.organizador) 
                                                : (activeEvent.source === 'Cabreira' ? 'Cabreira Solutions' : activeEvent.source)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: ESCALOES */}
                {activeTab === 'escaloes' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        {(!activeEvent.escaloes || activeEvent.escaloes.length === 0) ? (
                            <p className="text-slate-400 text-xs sm:text-sm">Informação de escalões não disponível.</p>
                        ) : (
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-2">
                                <h4 className="mb-2.5 text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Bike size={16} className="text-blue-400" />
                                    Categorias de Participação
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeEvent.escaloes.map((esc, idx) => (
                                        <div key={`esc-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold shadow-sm cursor-default">
                                            <span>{esc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: PROGRAMA */}
                {activeTab === 'programa' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {programaCleanHtml ? (
                                <div className="prose prose-invert max-w-none text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: programaCleanHtml }} onClick={handleHtmlClick} />
                            ) : (
                                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 text-xs">
                                    <em>Programa não disponível na Base de Dados. A aguardar recolha do sistema.</em>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: INSCRIÇÃO & PREÇOS */}
                {activeTab === 'inscricao' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent mb-2">
                            {activeEvent.prices ? (
                                <div className="text-slate-300 text-xs sm:text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prices }} />
                            ) : (
                                <p className="text-slate-400 text-xs sm:text-sm">Informação não disponível.</p>
                            )}
                        </div>
                        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Abertura das Inscrições</h4>
                                <p className="text-slate-200 text-xs sm:text-sm font-semibold">
                                    {activeEvent.registrationOpensAt ? formatRegDate(activeEvent.registrationOpensAt) : 'A definir'}
                                </p>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Fecho das Inscrições</h4>
                                <p className="text-slate-200 text-xs sm:text-sm font-semibold">
                                    {activeEvent.registrationClosesAt ? formatRegDate(activeEvent.registrationClosesAt) : 'A definir'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: PREMIOS E SEGURO */}
                {activeTab === 'premios' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                                <h4 className="mb-2 text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Trophy size={15} className="text-amber-400" /> Prémios
                                </h4>
                                {activeEvent.prizes ? (
                                    <div className="text-slate-300 text-xs sm:text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prizes }} />
                                ) : (
                                    <p className="text-slate-400 text-xs">Informação não disponível.</p>
                                )}
                            </div>
                            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                                <h4 className="mb-2 text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Shield size={15} className="text-emerald-400" /> Seguro
                                </h4>
                                {activeEvent.insurance ? (
                                    <div className="text-slate-300 text-xs sm:text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.insurance }} />
                                ) : (
                                    <p className="text-slate-400 text-xs">Informação não disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="flex flex-col h-full animate-fade-in pb-2 min-h-0">
                        {activeEvent.details && activeEvent.details !== 'A definir' ? (
                            <div className="w-full h-full min-h-[220px] rounded-xl overflow-hidden border border-slate-800">
                                <iframe 
                                    className="w-full h-full border-0 grayscale invert opacity-80"
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-xs sm:text-sm">Localização a definir.</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                {/* Action footer */}
                <div className="flex gap-2 flex-wrap items-center justify-between p-3 sm:px-5 sm:py-3 bg-slate-900 border-t border-slate-800 shrink-0">
                    {programaData.loading ? (
                        <div className="px-3 py-1.5 flex items-center gap-2 text-slate-400 text-xs">
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
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
                            <div className="flex items-center gap-2 flex-wrap">
                                {outrosLinks.map((src, idx) => (
                                    <a key={`outros-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-slate-700 flex items-center justify-center">
                                        {src.label}
                                    </a>
                                ))}
                                
                                {inscricaoLinks.length === 1 && (
                                    <a href={inscricaoLinks[0].link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center">
                                        Inscrever
                                    </a>
                                )}
                                
                                {inscricaoLinks.length > 1 && (
                                    <div className="relative group">
                                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer">
                                            Inscrever <span className="text-[0.7em]">▼</span>
                                        </button>
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                            <div className="flex flex-col">
                                                {inscricaoLinks.map((src, idx) => (
                                                    <a key={`inscr-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2.5 hover:bg-slate-800 text-slate-200 text-xs transition-colors border-b border-slate-800 last:border-0 font-medium">
                                                        Inscrever ({src._plat})
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {isSignedIn && (
                        <button 
                            onClick={handleAddToCalendar}
                            disabled={isAddingToCalendar || calendarStatus === 'success' || calendarStatus === 'exists'}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                calendarStatus === 'success' || calendarStatus === 'exists'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            } ${isAddingToCalendar ? 'opacity-70 cursor-default' : ''}`}
                        >
                            {isAddingToCalendar ? (
                                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : calendarStatus === 'success' || calendarStatus === 'exists' ? (
                                <Check size={15} />
                            ) : (
                                <CalendarPlus size={15} />
                            )}
                            {calendarMsg || 'Marcar no calendário'}
                        </button>
                    )}
                </div>
            </div>

            {fullscreenImage && (
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
                    <button className="absolute top-6 right-6 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors cursor-pointer" onClick={() => setFullscreenImage(null)}>
                        <X size={22} />
                    </button>
                    <img src={fullscreenImage} alt="Programa Detalhado" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
