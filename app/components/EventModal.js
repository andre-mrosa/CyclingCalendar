import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield, Users, Globe, Clock, MapPin, ExternalLink, ChevronDown, Bell, Sparkles, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import SmartLogo from './SmartLogo';
import { parsePrograma } from '../utils/parsePrograma';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

const eventDetailsCache = new Map();

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const { resolvedTheme } = useTheme();
    const { isMarked, refreshCalendar } = useCalendarEvents();
    const [programaData, setProgramaData] = useState({ loading: false, html: null, error: null, additionalLinks: [] });
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const [isDeletingFromCalendar, setIsDeletingFromCalendar] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { target, label }
    const [calendarStatus, setCalendarStatus] = useState(null); // 'success', 'exists', 'error'
    const [calendarMsg, setCalendarMsg] = useState('');
    const [regOpenCalStatus, setRegOpenCalStatus] = useState(null);
    const [regOpenCalMsg, setRegOpenCalMsg] = useState('');
    const [regCloseCalStatus, setRegCloseCalStatus] = useState(null);
    const [regCloseCalMsg, setRegCloseCalMsg] = useState('');
    const [showCalMenu, setShowCalMenu] = useState(false);
    const calMenuRef = useRef(null);
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

        // Instant load if selectedEvent already has full details from API
        if (selectedEvent.description || selectedEvent.programa || selectedEvent.prices || selectedEvent.logo || selectedEvent.image) {
            setFullEvent(selectedEvent);
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

    // Parse do programa em formato cronológico estruturado
    const parsedSchedule = useMemo(() => {
        return parsePrograma(programaCleanHtml);
    }, [programaCleanHtml]);

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
            setRegOpenCalStatus(null);
            setRegOpenCalMsg('');
            setRegCloseCalStatus(null);
            setRegCloseCalMsg('');
            setShowCalMenu(false);
            return;
        }

        const allIds = [selectedEvent.id, ...(selectedEvent._allIds || [])];
        const eventMarked = isMarked(selectedEvent.id, 'event', allIds);
        const regOpenMarked = isMarked(selectedEvent.id, 'registration_open', allIds);
        const regCloseMarked = isMarked(selectedEvent.id, 'registration_close', allIds);

        setCalendarStatus(eventMarked ? 'exists' : null);
        setCalendarMsg(eventMarked ? 'Já no calendário' : '');
        setRegOpenCalStatus(regOpenMarked ? 'exists' : null);
        setRegOpenCalMsg(regOpenMarked ? 'Marcado ✓' : '');
        setRegCloseCalStatus(regCloseMarked ? 'exists' : null);
        setRegCloseCalMsg(regCloseMarked ? 'Marcado ✓' : '');
        setShowCalMenu(false);

        if (activeEvent.programa && activeEvent.programa.trim().length > 0 && activeEvent.programa !== 'Não disponível') {
            setProgramaData({ loading: false, html: activeEvent.programa, error: null, additionalLinks: [] });
        } else {
            setProgramaData({ loading: false, html: null, error: null, additionalLinks: [] });
        }
    }, [selectedEvent, isMarked]);

    // Fechar menu do calendário ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (calMenuRef.current && !calMenuRef.current.contains(e.target)) {
                setShowCalMenu(false);
            }
        };
        if (showCalMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showCalMenu]);

    const handleHtmlClick = (e) => {
        if (e.target.tagName === 'IMG') {
            setFullscreenImage(e.target.src);
            setIsImageZoomed(false);
        }
    };

    const handleAddToCalendar = async (target = 'event') => {
        if (!isSignedIn || !selectedEvent) return;
        
        if (target === 'registration_open') {
            setRegOpenCalStatus('loading');
            setRegOpenCalMsg('');
        } else if (target === 'registration_close') {
            setRegCloseCalStatus('loading');
            setRegCloseCalMsg('');
        } else {
            setIsAddingToCalendar(true);
            setCalendarStatus(null);
            setCalendarMsg('');
        }

        setShowCalMenu(false);

        try {
            const res = await fetch('/api/calendar/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: activeEvent, target })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                const isExists = data.message === 'exists';
                const successMsg = isExists ? 'Já no calendário' : 'Marcado!';
                
                if (target === 'registration_open') {
                    setRegOpenCalStatus(isExists ? 'exists' : 'success');
                    setRegOpenCalMsg(successMsg);
                } else if (target === 'registration_close') {
                    setRegCloseCalStatus(isExists ? 'exists' : 'success');
                    setRegCloseCalMsg(successMsg);
                } else {
                    setCalendarStatus(isExists ? 'exists' : 'success');
                    setCalendarMsg(isExists ? 'Já no calendário!' : 'Adicionado com sucesso!');
                }

                // Sincronizar o estado global do calendário
                if (refreshCalendar) {
                    refreshCalendar();
                }
            } else {
                const errMsg = data.error || 'Erro ao adicionar ao calendário';
                if (target === 'registration_open') {
                    setRegOpenCalStatus('error');
                    setRegOpenCalMsg(errMsg);
                } else if (target === 'registration_close') {
                    setRegCloseCalStatus('error');
                    setRegCloseCalMsg(errMsg);
                } else {
                    setCalendarStatus('error');
                    setCalendarMsg(errMsg);
                }
            }
        } catch (error) {
            console.error("Error adding to calendar:", error);
            const errMsg = error?.message || 'Erro de rede';
            if (target === 'registration_open') {
                setRegOpenCalStatus('error');
                setRegOpenCalMsg(errMsg);
            } else if (target === 'registration_close') {
                setRegCloseCalStatus('error');
                setRegCloseCalMsg(errMsg);
            } else {
                setCalendarStatus('error');
                setCalendarMsg(errMsg);
            }
        } finally {
            if (target === 'event') {
                setIsAddingToCalendar(false);
            }
        }
    };

    const handleRemoveFromCalendar = async (target = 'event') => {
        if (!isSignedIn || !selectedEvent) return;
        setIsDeletingFromCalendar(true);

        try {
            const res = await fetch('/api/calendar/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: activeEvent, target })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (target === 'registration_open') {
                    setRegOpenCalStatus(null);
                    setRegOpenCalMsg('');
                } else if (target === 'registration_close') {
                    setRegCloseCalStatus(null);
                    setRegCloseCalMsg('');
                } else {
                    setCalendarStatus(null);
                    setCalendarMsg('');
                }

                if (refreshCalendar) {
                    refreshCalendar();
                }
                setDeleteConfirmation(null);
            } else {
                alert(data.error || 'Erro ao remover do calendário');
            }
        } catch (error) {
            console.error("Error removing from calendar:", error);
            alert('Erro de comunicação ao remover do calendário');
        } finally {
            setIsDeletingFromCalendar(false);
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9000] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl h-[92vh] sm:h-[86vh] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
                
                {/* Mobile Drag Indicator */}
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

                {/* Mobile Top Bar (sm:hidden) */}
                <div className="sm:hidden flex items-center justify-between px-4 pt-1 pb-1 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex flex-col shrink-0 w-[42px] h-[42px] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                            <div className="bg-rose-500 text-white text-[8px] font-bold uppercase tracking-wider text-center py-0.5">
                                {month}
                            </div>
                            <div className="flex-1 flex items-center justify-center text-slate-900 dark:text-white text-sm font-bold">
                                {day}
                            </div>
                        </div>
                        {activeEvent.logo && (
                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="flex shrink-0" title="Abrir página do evento">
                                <SmartLogo 
                                    src={activeEvent.logo} 
                                    alt={`Logo ${activeEvent.title}`} 
                                    className="h-7 w-auto object-contain" 
                                    style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                                />
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {(() => {
                            const isEventFavorited = favorites.includes(activeEvent.id) || (activeEvent._allIds && activeEvent._allIds.some(id => favorites.includes(id)));
                            return (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(activeEvent.id);
                                    }}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${isEventFavorited ? 'bg-amber-400/15 border border-amber-500/40 text-amber-400' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                    title={isEventFavorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                                >
                                    <Star 
                                        size={15} 
                                        fill={isEventFavorited ? "#fbbf24" : "none"}
                                    />
                                </button>
                            );
                        })()}
                        <button 
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer" 
                            onClick={() => setSelectedEvent(null)} 
                            title="Fechar"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* Mobile Title & Date (sm:hidden) */}
                <div className="sm:hidden px-4 pt-1 pb-2 shrink-0">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white m-0 leading-snug line-clamp-2">
                        {activeEvent.logo ? (
                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {activeEvent.title}
                            </a>
                        ) : (
                            <span>{activeEvent.title}</span>
                        )}
                    </h2>
                    {isMultiDay && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 mt-1 mb-0 font-medium">
                            <Calendar size={12} className="text-blue-500" /> {rawDate}
                        </p>
                    )}
                </div>

                {/* Desktop Header (hidden sm:flex) */}
                <div className="hidden sm:flex items-center justify-start gap-3.5 pr-12 p-5 pb-2 min-w-0 shrink-0">
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setSelectedEvent(null)} title="Fechar">
                        <X size={20} />
                    </button>
                    <div className="flex flex-col shrink-0 w-[54px] h-[54px] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                            {month}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-slate-900 dark:text-white text-lg font-bold">
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
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0 truncate">
                            {activeEvent.logo ? (
                                <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                                    {activeEvent.title}
                                </a>
                            ) : (
                                <span className="text-slate-900 dark:text-white truncate">{activeEvent.title}</span>
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
                                    className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${isEventFavorited ? 'bg-amber-400/15 border border-amber-500/40 text-amber-400' : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
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
                    <p className="hidden sm:flex text-slate-500 dark:text-slate-400 text-xs items-center gap-1.5 px-5 mb-1.5 mt-0 shrink-0">
                        <Calendar size={13} className="text-blue-500 dark:text-blue-400" /> {rawDate}
                    </p>
                )}
                
                {/* Tabs Navigation */}
                {availableTabs.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2.5 pt-1 px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800/80 no-scrollbar shrink-0 touch-pan-x overscroll-contain">
                        {availableTabs.map(tab => {
                            const labels = {
                                info: 'Info',
                                escaloes: 'Escalões',
                                programa: activeEvent.source === 'FPC' ? 'Documentos' : 'Programa',
                                inscricao: 'Inscrição & Preços',
                                premios: 'Prémios & Seguro',
                                localizacao: 'Localização'
                            };
                            const fullLabels = {
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
                                    className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                        activeTab === tab 
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' 
                                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                                    }`}
                                >
                                    <span className="sm:hidden">{labels[tab]}</span>
                                    <span className="hidden sm:inline">{fullLabels[tab]}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-5 shrink-0">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Informação detalhada disponível na página oficial da organização.</p>
                    </div>
                )}

                {/* Tab content area */}
                <div className="flex-grow overflow-hidden flex flex-col px-4 sm:px-5 min-h-0 pt-2">
                
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
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overscroll-contain touch-pan-y space-y-4 pb-4">
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
                                <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.description }} />
                            ) : !isLoadingFullEvent ? (
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Descrição não disponível.</p>
                            ) : null}

                            {/* Informações da Prova integradas no scroll */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                {activeEvent.licenca && (
                                    <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                            <FileText size={15} className="text-purple-500 dark:text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">Licença</span>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">{activeEvent.licenca}</span>
                                        </div>
                                    </div>
                                )}
                                {(activeEvent.organizador || activeEvent.source) && (
                                    <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <Users size={15} className="text-blue-500 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">Organização</span>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                                {activeEvent.organizador 
                                                    ? (activeEvent.organizador === 'U.V.P./F.P.C' ? 'FPC' : activeEvent.organizador) 
                                                    : (activeEvent.source === 'Cabreira' ? 'Cabreira Solutions' : activeEvent.source)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: ESCALOES */}
                {activeTab === 'escaloes' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        {(!activeEvent.escaloes || activeEvent.escaloes.length === 0) ? (
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Informação de escalões não disponível.</p>
                        ) : (
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-2 overscroll-contain touch-pan-y">
                                <h4 className="mb-2.5 text-slate-900 dark:text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Bike size={16} className="text-blue-500 dark:text-blue-400" />
                                    Categorias de Participação
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeEvent.escaloes.map((esc, idx) => (
                                        <div key={`esc-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm cursor-default">
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
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overscroll-contain touch-pan-y">
                            {parsedSchedule && parsedSchedule.type === 'timeline' ? (
                                <div className="space-y-4 pb-3">
                                    {parsedSchedule.days.map((day, dIdx) => (
                                        <div key={`day-${dIdx}`} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                                            {/* Day Header */}
                                            <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
                                                    <Calendar size={15} />
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                                                    {day.dayTitle}
                                                </h3>
                                            </div>

                                            {/* Timeline items */}
                                            <div className="relative pl-3.5 sm:pl-5 space-y-3 before:absolute before:left-[17px] sm:before:left-[23px] before:top-2.5 before:bottom-2.5 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                                                {day.activities.map((act, aIdx) => {
                                                    const isStartOrFinish = /partida|chegada|início/i.test(act.title);
                                                    const isPodium = /pódio|podio|prémio|premio/i.test(act.title);
                                                    const isSecretariado = /secretariado|frontais/i.test(act.title);
                                                    const isLunch = /almoço|almoco|reforço/i.test(act.title);

                                                    return (
                                                        <div key={`act-${aIdx}`} className="relative flex items-start gap-3 group">
                                                            {/* Dot on timeline */}
                                                            <div className={`relative z-10 w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 transition-transform group-hover:scale-125 ${
                                                                isStartOrFinish 
                                                                    ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                                    : isPodium 
                                                                    ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                                                    : isSecretariado
                                                                    ? 'bg-blue-500 border-blue-400'
                                                                    : isLunch
                                                                    ? 'bg-orange-500 border-orange-400'
                                                                    : 'bg-slate-400 dark:bg-slate-700 border-slate-300 dark:border-slate-500'
                                                            }`} />

                                                            {/* Activity Card */}
                                                            <div className="flex-1 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
                                                                        {act.title}
                                                                    </h4>
                                                                    {act.time && (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] font-semibold tracking-wide">
                                                                            <Clock size={11} />
                                                                            {act.time}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {act.desc && (
                                                                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0 mb-1.5 leading-relaxed">
                                                                        {act.desc}
                                                                    </p>
                                                                )}

                                                                {act.location && (
                                                                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1.5 flex items-center justify-between">
                                                                        {act.locationUrl ? (
                                                                            <a 
                                                                                href={act.locationUrl} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/link"
                                                                                title="Abrir no Google Maps"
                                                                            >
                                                                                <MapPin size={12} className="text-rose-500 dark:text-rose-400 shrink-0" />
                                                                                <span className="truncate">{act.location}</span>
                                                                                <ExternalLink size={10} className="opacity-60 group-hover/link:opacity-100 shrink-0" />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                                                <MapPin size={12} className="text-rose-500 dark:text-rose-400 shrink-0" />
                                                                                <span className="truncate">{act.location}</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : programaCleanHtml ? (
                                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: programaCleanHtml }} onClick={handleHtmlClick} />
                            ) : (
                                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2.5">
                                    <FileText size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span>Programa detalhado não disponível na Base de Dados. A aguardar recolha do sistema.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: INSCRIÇÃO & PREÇOS */}
                {activeTab === 'inscricao' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent mb-2 overscroll-contain touch-pan-y">
                            {activeEvent.prices ? (
                                <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prices }} />
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Informação não disponível.</p>
                            )}
                        </div>
                        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Abertura das Inscrições</h4>
                                        <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold">
                                            {activeEvent.registrationOpensAt ? formatRegDate(activeEvent.registrationOpensAt) : 'A definir'}
                                        </p>
                                    </div>
                                    {activeEvent.registrationOpensAt && isSignedIn && (() => {
                                        const isRegOpenMarked = regOpenCalStatus === 'success' || regOpenCalStatus === 'exists';
                                        return (
                                            <button 
                                                onClick={() => {
                                                    if (isRegOpenMarked) {
                                                        setDeleteConfirmation({ target: 'registration_open', label: 'o lembrete de abertura das inscrições' });
                                                    } else {
                                                        handleAddToCalendar('registration_open');
                                                    }
                                                }}
                                                disabled={regOpenCalStatus === 'loading'}
                                                className={`group shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    isRegOpenMarked
                                                        ? 'bg-emerald-500/10 hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/30'
                                                        : regOpenCalStatus === 'error'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm'
                                                } ${regOpenCalStatus === 'loading' ? 'opacity-70 cursor-default' : ''}`}
                                                title={isRegOpenMarked ? "Clica para remover este lembrete do Google Calendar" : regOpenCalMsg || "Avisar no Google Calendar (1 dia antes e 1 hora antes)"}
                                            >
                                                {regOpenCalStatus === 'loading' ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>A marcar...</span>
                                                    </>
                                                ) : isRegOpenMarked ? (
                                                    <>
                                                        <span className="flex items-center gap-1.5 group-hover:hidden">
                                                            <Check size={13} />
                                                            <span>Marcado ✓</span>
                                                        </span>
                                                        <span className="hidden group-hover:flex items-center gap-1.5">
                                                            <Trash2 size={13} />
                                                            <span>Remover?</span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CalendarPlus size={13} />
                                                        <span>{regOpenCalStatus === 'error' ? (regOpenCalMsg || 'Erro!') : 'Lembrar abertura'}</span>
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                                {activeEvent.registrationOpensAt && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                        <Clock size={10} className="text-blue-500" /> Avisa 1 dia antes e 1 hora antes
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Fecho das Inscrições</h4>
                                        <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold">
                                            {activeEvent.registrationClosesAt ? formatRegDate(activeEvent.registrationClosesAt) : 'A definir'}
                                        </p>
                                    </div>
                                    {activeEvent.registrationClosesAt && isSignedIn && (() => {
                                        const isRegCloseMarked = regCloseCalStatus === 'success' || regCloseCalStatus === 'exists';
                                        return (
                                            <button 
                                                onClick={() => {
                                                    if (isRegCloseMarked) {
                                                        setDeleteConfirmation({ target: 'registration_close', label: 'o lembrete de fecho das inscrições' });
                                                    } else {
                                                        handleAddToCalendar('registration_close');
                                                    }
                                                }}
                                                disabled={regCloseCalStatus === 'loading'}
                                                className={`group shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    isRegCloseMarked
                                                        ? 'bg-emerald-500/10 hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/30'
                                                        : regCloseCalStatus === 'error'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm'
                                                } ${regCloseCalStatus === 'loading' ? 'opacity-70 cursor-default' : ''}`}
                                                title={isRegCloseMarked ? "Clica para remover este lembrete do Google Calendar" : regCloseCalMsg || "Avisar no Google Calendar (1 dia antes e 1 hora antes)"}
                                            >
                                                {regCloseCalStatus === 'loading' ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>A marcar...</span>
                                                    </>
                                                ) : isRegCloseMarked ? (
                                                    <>
                                                        <span className="flex items-center gap-1.5 group-hover:hidden">
                                                            <Check size={13} />
                                                            <span>Marcado ✓</span>
                                                        </span>
                                                        <span className="hidden group-hover:flex items-center gap-1.5">
                                                            <Trash2 size={13} />
                                                            <span>Remover?</span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CalendarPlus size={13} />
                                                        <span>{regCloseCalStatus === 'error' ? (regCloseCalMsg || 'Erro!') : 'Lembrar fecho'}</span>
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                                {activeEvent.registrationClosesAt && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                        <Clock size={10} className="text-amber-500" /> Avisa 1 dia antes e 1 hora antes
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: PREMIOS E SEGURO */}
                {activeTab === 'premios' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 overscroll-contain touch-pan-y">
                            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                <h4 className="mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Trophy size={15} className="text-amber-500 dark:text-amber-400" /> Prémios
                                </h4>
                                {activeEvent.prizes ? (
                                    <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prizes }} />
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Informação não disponível.</p>
                                )}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                <h4 className="mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm font-semibold">
                                    <Shield size={15} className="text-emerald-500 dark:text-emerald-400" /> Seguro
                                </h4>
                                {activeEvent.insurance ? (
                                    <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.insurance }} />
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Informação não disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="flex flex-col h-full animate-fade-in pb-2 min-h-0">
                        {activeEvent.details && activeEvent.details !== 'A definir' ? (
                            <div className="w-full h-full min-h-[220px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                <iframe 
                                    className="w-full h-full border-0 dark:[filter:invert(90%)_hue-rotate(180deg)] transition-all duration-300"
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Localização a definir.</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                {/* Action footer */}
                <div className="flex gap-2 flex-wrap items-center justify-between p-2.5 sm:px-5 sm:py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
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
                                    <a key={`outros-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center">
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
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                            <div className="flex flex-col">
                                                {inscricaoLinks.map((src, idx) => (
                                                    <a key={`inscr-${idx}`} href={src.link} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-medium">
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

                    {isSignedIn && (() => {
                        const isEventAlreadyMarked = calendarStatus === 'success' || calendarStatus === 'exists';
                        const isRegOpenMarked = regOpenCalStatus === 'success' || regOpenCalStatus === 'exists';
                        const isRegCloseMarked = regCloseCalStatus === 'success' || regCloseCalStatus === 'exists';

                        return (
                        <div className="relative inline-flex items-center" ref={calMenuRef}>
                            <div className="inline-flex rounded-xl shadow-sm">
                                <button 
                                    onClick={() => {
                                        if (isEventAlreadyMarked) {
                                            setDeleteConfirmation({ target: 'event', label: 'a data desta prova' });
                                        } else {
                                            handleAddToCalendar('event');
                                        }
                                    }}
                                    disabled={isAddingToCalendar}
                                    className={`group px-3.5 py-2 rounded-xl ${(activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) ? 'rounded-r-none border-r-0' : ''} text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isEventAlreadyMarked
                                            ? 'bg-emerald-500/10 hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/30'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                    } ${isAddingToCalendar ? 'opacity-70 cursor-default' : ''}`}
                                    title={isEventAlreadyMarked ? "Clica para remover este evento do Google Calendar" : "Marcar no Google Calendar"}
                                >
                                    {isAddingToCalendar ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            <span>A marcar...</span>
                                        </>
                                    ) : isEventAlreadyMarked ? (
                                        <>
                                            <span className="flex items-center gap-1.5 group-hover:hidden">
                                                <Check size={15} />
                                                <span>{calendarMsg || 'Já no calendário'}</span>
                                            </span>
                                            <span className="hidden group-hover:flex items-center gap-1.5">
                                                <Trash2 size={15} />
                                                <span>Remover da agenda?</span>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CalendarPlus size={15} />
                                            <span>Marcar prova</span>
                                        </>
                                    )}
                                </button>

                                {(activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) && (
                                    <button
                                        onClick={() => setShowCalMenu(!showCalMenu)}
                                        className="px-2 py-2 rounded-r-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                        title="Mais opções de lembretes no calendário"
                                    >
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showCalMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {showCalMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in p-1.5 flex flex-col gap-1">
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                                        Lembretes no Google Calendar
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (isEventAlreadyMarked) {
                                                setShowCalMenu(false);
                                                setDeleteConfirmation({ target: 'event', label: 'a data desta prova' });
                                            } else {
                                                handleAddToCalendar('event');
                                            }
                                        }}
                                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                            isEventAlreadyMarked 
                                                ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={isEventAlreadyMarked ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                                            <div>
                                                <span className="font-semibold block leading-tight">Data da Prova</span>
                                                <span className="text-[10px] text-slate-400">Avisa 2 dias e 1 semana antes</span>
                                            </div>
                                        </div>
                                        {isEventAlreadyMarked && (
                                            <Check size={13} className="text-emerald-500 shrink-0" />
                                        )}
                                    </button>

                                    {activeEvent.registrationOpensAt && (
                                        <button
                                            onClick={() => {
                                                if (isRegOpenMarked) {
                                                    setShowCalMenu(false);
                                                    setDeleteConfirmation({ target: 'registration_open', label: 'o lembrete de abertura das inscrições' });
                                                } else {
                                                    handleAddToCalendar('registration_open');
                                                }
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                isRegOpenMarked 
                                                    ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegOpenMarked ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">Abertura de Inscrições</span>
                                                    <span className="text-[10px] text-slate-400">Avisa 1 dia antes e 1h antes</span>
                                                </div>
                                            </div>
                                            {isRegOpenMarked && (
                                                <Check size={13} className="text-emerald-500 shrink-0" />
                                            )}
                                        </button>
                                    )}

                                    {activeEvent.registrationClosesAt && (
                                        <button
                                            onClick={() => {
                                                if (isRegCloseMarked) {
                                                    setShowCalMenu(false);
                                                    setDeleteConfirmation({ target: 'registration_close', label: 'o lembrete de fecho das inscrições' });
                                                } else {
                                                    handleAddToCalendar('registration_close');
                                                }
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                isRegCloseMarked 
                                                    ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegCloseMarked ? "text-emerald-500 shrink-0" : "text-amber-500 shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">Fecho de Inscrições</span>
                                                    <span className="text-[10px] text-slate-400">Avisa 1 dia antes e 1h antes</span>
                                                </div>
                                            </div>
                                            {isRegCloseMarked && (
                                                <Check size={13} className="text-emerald-500 shrink-0" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })()}
                </div>
            </div>

            {/* Modal de Confirmação de Remoção do Google Calendar */}
            {deleteConfirmation && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDeletingFromCalendar) setDeleteConfirmation(null);
                    }}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative animate-scale-in text-slate-800 dark:text-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3.5 mb-4 text-rose-500">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Remover do Google Calendar?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[280px]">
                                    {activeEvent.title}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                            Tens a certeza de que pretendes remover <strong className="text-slate-900 dark:text-slate-100 font-semibold">{deleteConfirmation.label || 'este evento'}</strong> do teu Google Calendar?
                        </p>

                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                disabled={isDeletingFromCalendar}
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isDeletingFromCalendar}
                                onClick={() => handleRemoveFromCalendar(deleteConfirmation.target)}
                                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-600/30"
                            >
                                {isDeletingFromCalendar ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>A remover...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>Sim, Remover</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {fullscreenImage && (
                <div 
                    className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-auto" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenImage(null);
                        setIsImageZoomed(false);
                    }}
                >
                    <button 
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 bg-slate-900/80 hover:bg-slate-800 text-white p-2.5 rounded-full transition-colors cursor-pointer z-[10000] border border-slate-700 shadow-xl" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenImage(null);
                            setIsImageZoomed(false);
                        }}
                        title="Fechar imagem"
                    >
                        <X size={20} />
                    </button>
                    <div 
                        className={`transition-transform duration-300 ease-out flex items-center justify-center m-auto ${isImageZoomed ? 'scale-150 sm:scale-[1.75] cursor-zoom-out' : 'cursor-zoom-in'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsImageZoomed(!isImageZoomed);
                        }}
                        title={isImageZoomed ? "Clica para reduzir" : "Clica para ampliar"}
                    >
                        <img 
                            src={fullscreenImage} 
                            alt="Programa Detalhado" 
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl select-none shadow-2xl transition-all duration-300" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
