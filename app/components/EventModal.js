import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Star, X, CalendarPlus, Check, Bike, FileText, CreditCard, Trophy, Shield, Users, Globe, Clock, MapPin, ExternalLink, ChevronDown, Bell, Sparkles, Trash2, Info, Tag, Share2, Flag } from 'lucide-react';
import { useTheme } from 'next-themes';
import SmartLogo from './SmartLogo';
import { parsePrograma } from '../utils/parsePrograma';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import WeatherWidget from './WeatherWidget';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthAbbr, translateDateString, translateEscalao, translateAmbito, translateLicenca, translateTag } from '../i18n/formatters';
import { getEventDiscipline } from '../utils/eventClassifier';
import { detectRaceDate } from '../utils/detectRaceDate';
import styles from './site.module.css';
import { useModalFocus } from '../hooks/useModalFocus';

const eventDetailsCache = new Map();

export default function EventModal({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn }) {
    const dialogRef = useModalFocus(!!selectedEvent);
    const { resolvedTheme } = useTheme();
    const { t, language } = useTranslation();
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
    const [shareCopied, setShareCopied] = useState(false);
    const calMenuRef = useRef(null);
    const [activeTab, setActiveTab] = useState('info');
    const [isClosing, setIsClosing] = useState(false);
    const [isOpenAnimated, setIsOpenAnimated] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const touchStartY = useRef(0);
    const currentDragY = useRef(0);

    const handleShare = async () => {
        if (!selectedEvent) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
        const shareUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/?event=${selectedEvent.id}` 
            : `https://cyclingcalendar.pt/?event=${selectedEvent.id}`;

        const shareData = {
            title: `${selectedEvent.title} | Cycling Calendar Portugal`,
            text: `Vê todos os detalhes de "${selectedEvent.title}" (${selectedEvent.date}) no Cycling Calendar:`,
            url: shareUrl
        };

        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (e) {}
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2200);
            } catch (e) {}
        }
    };

    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setIsOpenAnimated(true);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedEvent(null);
            setIsClosing(false);
            setDragY(0);
            setIsDragging(false);
            setIsExpanded(false);
        }, 260);
    };

    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
        currentDragY.current = 0;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0) {
            currentDragY.current = diff;
            setDragY(diff);
        } else if (diff < 0 && !isExpanded) {
            currentDragY.current = diff;
            setDragY(diff * 0.25);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (currentDragY.current > 75) {
            closeModal();
        } else if (currentDragY.current < -50) {
            setIsExpanded(true);
            setDragY(0);
            currentDragY.current = 0;
        } else {
            setDragY(0);
            currentDragY.current = 0;
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

        // If selectedEvent already has full deep details explicitly
        if (selectedEvent._hasFullDetails) {
            setFullEvent(selectedEvent);
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
                    const merged = { ...selectedEvent, ...data.event, _hasFullDetails: true };
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


    // Formata datas de inscrição no idioma ativo sem segundos (usa UTC para preservar hora original)
    const formatRegDate = (isoStr) => {
        if (!isoStr) return t('summary_to_be_defined');
        const localeMap = { pt: 'pt-PT', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
        const loc = localeMap[language] || 'pt-PT';
        const atWordMap = { pt: 'às', en: 'at', es: 'a las', fr: 'à' };
        const atWord = atWordMap[language] || 'às';
        const d = new Date(isoStr);
        const datePart = d.toLocaleDateString(loc, { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' });
        const timePart = d.toLocaleTimeString(loc, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
        return `${datePart} ${atWord} ${timePart}`;
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

    // Extrai os percursos e distâncias para o cartão de resumo nativo
    const percursosSummary = useMemo(() => {
        if (!activeEvent) return [];
        const items = [];
        
        // 1. Procura se a descrição tem itens de percurso formatados
        if (activeEvent.description) {
            const desc = activeEvent.description;
            // Padrão: <strong>PERCURSOS:</strong> ...
            const percBlockMatch = desc.match(/<strong>PERCURSOS:<\/strong>\s*(?:<span>)?([\s\S]*?)(?:<\/span>|<\/li>|<\/div>|<h[1-6]>)/i);
            let targetText = percBlockMatch ? percBlockMatch[1] : desc;
            
            targetText = targetText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');

            // Divide por marcadores de percurso individuais
            const splitRegex = /(?:^|\s*[-•*]\s*|\s+(?=(?:Percurso\s+(?:Longo|Curto|Médio|Medio|Gravel|BTT|Mini|Promoção|Promocao|Principal|Alternativo|1|2|3)|Granfondo|Mediofondo|Minifondo|Meia\s+Maratona|Maratona|Mini\s+Maratona|Passeio\s+Guiado|Passeio)\b))/i;
            
            const rawSegments = targetText.split(splitRegex);
            for (let seg of rawSegments) {
                let clean = seg.replace(/^[-•*:\s]+/, '').replace(/[-•*:\s]+$/, '').trim();
                if (clean.length < 4) continue;
                
                if (/\b\d+(?:[.,]\d+)?\s*km\b/i.test(clean) || /\b\d+\s*(?:m|mt)?\s*D\+/i.test(clean) || /percurso/i.test(clean)) {
                    // Formata espaçamentos e acumulado
                    clean = clean
                        .replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, '$1 km')
                        .replace(/(\d+)\s*(?:mt|m)\s*D\+/gi, '• $1 m D+')
                        .replace(/(\d+)\s*D\+/gi, '• $1 m D+')
                        .replace(/(\d+(?:[.,]\d+)?\s*km)\s+(\d{3,4})\b/i, '$1 • $2 m D+');
                    
                    clean = clean.replace(/:\s*/, ': ');
                    clean = clean.replace(/•\s*•/g, '•').replace(/\s+/g, ' ').trim();
                    
                    if (!items.includes(clean)) {
                        items.push(clean);
                    }
                }
            }
        }

        // 2. Procura nas details da prova (comum na FPC ex: "80 Km | XCM")
        if (items.length === 0 && activeEvent.details) {
            const kmMatch = activeEvent.details.match(/\b(\d{1,3}(?:[.,]\d+)?\s*km)\b/gi);
            if (kmMatch) {
                kmMatch.forEach(k => {
                    const clean = `Percurso: ${k.trim()}`;
                    if (!items.includes(clean)) items.push(clean);
                });
            }
        }

        return items;
    }, [activeEvent]);

    // Limpeza da descrição removendo o bloco raw HTML de resumo para usar o componente nativo React
    const cleanDescriptionHtml = useMemo(() => {
        if (!activeEvent?.description) return '';
        return activeEvent.description
            .replace(/<div class="event-summary-card"[\s\S]*?<\/div>(?:<br\s*\/?>)*/gi, '')
            .trim();
    }, [activeEvent?.description]);

    // Processamento e categorização inteligente de links (evita duplicações e hierarquiza fontes)
    const parsedLinks = useMemo(() => {
        const rawList = [];
        if (programaData.additionalLinks && Array.isArray(programaData.additionalLinks)) {
            rawList.push(...programaData.additionalLinks);
        }
        if (activeEvent?.extraLinks) {
            const extra = typeof activeEvent.extraLinks === 'string' 
                ? (() => { try { return JSON.parse(activeEvent.extraLinks); } catch(e) { return []; } })()
                : activeEvent.extraLinks;
            if (Array.isArray(extra)) rawList.push(...extra);
        }
        if (activeEvent?.link) {
            rawList.push({ label: 'Site do Evento', link: activeEvent.link });
        }

        // Deduplica por URL exato
        const uniqueByUrl = Array.from(new Map(
            rawList
                .filter(item => item && item.link && typeof item.link === 'string' && item.link.startsWith('http'))
                .map(item => [item.link.trim(), item])
        ).values());

        const isRegistration = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('inscrev') || l.includes('inscriç') || l.includes('inscric') || url.includes('/registrations/create') || url.includes('prova-inscrever');
        };

        const isResults = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('resultado') || l.includes('classifica') || l.includes('ranking') || l.includes('tempos') || l.includes('results') || url.includes('/results') || url.includes('/classificacoes') || url.includes('classificacoes.net') || url.includes('/download/');
        };

        const isRules = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('regulamento') || l.includes('rules') || url.includes('/rules') || url.includes('regulamento');
        };

        const isTracks = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('track') || l.includes('percurso') || l.includes('gpx') || l.includes('kml') || l.includes('mapa') || url.includes('gpx') || url.includes('strava');
        };

        const isParticipants = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('inscritos') || l.includes('participantes') || l.includes('entries') || (url.includes('/registrations') && !url.includes('/create'));
        };

        const isConditions = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return l.includes('condiç') || l.includes('condic') || l.includes('cancelam') || url.includes('/conditions');
        };

        const isFpcPage = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return (l.includes('fpc') || url.includes('fpciclismo.pt')) && !isRegistration(item) && !isRules(item);
        };

        const isCabreiraPage = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return (l.includes('cabreira') || url.includes('cabreirasolutions.com')) && !isRegistration(item) && !isRules(item);
        };

        const isStopAndGoPage = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return (l.includes('stopandgo') || l.includes('stop and go') || url.includes('stopandgo.net')) && !isRegistration(item) && !isRules(item);
        };

        const isClassificacoesPage = (item) => {
            const l = (item.label || '').toLowerCase();
            const url = (item.link || '').toLowerCase();
            return (l.includes('classificacoes') || url.includes('classificacoes.net')) && !isRegistration(item) && !isRules(item);
        };

        // Categoriza
        const registrationList = uniqueByUrl.filter(isRegistration);
        const resultsList = uniqueByUrl.filter(isResults);
        const rulesList = uniqueByUrl.filter(isRules);
        const tracksList = uniqueByUrl.filter(isTracks);
        const participantsList = uniqueByUrl.filter(isParticipants);
        const conditionsList = uniqueByUrl.filter(isConditions);
        const fpcList = uniqueByUrl.filter(isFpcPage);

        // Regulamento principal desduplicado (prioridade: Cabreira/Domínio da prova > StopAndGo > FPC)
        const primaryRules = rulesList.find(r => r.link.includes('cabreira')) 
            || rulesList.find(r => !r.link.includes('fpc') && !r.link.includes('stopandgo')) 
            || rulesList[0] 
            || null;

        // Resultados principais desduplicados
        const primaryResults = resultsList[0] || null;

        // Site oficial da organização
        let officialSite = null;
        if (activeEvent?.source?.includes('Cabreira') || (activeEvent?.organizador && activeEvent.organizador.toLowerCase().includes('cabreira'))) {
            const cabLink = uniqueByUrl.find(isCabreiraPage);
            officialSite = cabLink ? { label: t('action_cabreira_site'), link: cabLink.link } : { label: t('action_cabreira_site'), link: 'https://cabreirasolutions.com/eventos/' };
        } else if (activeEvent?.source?.includes('Stop') || (activeEvent?.link && activeEvent.link.includes('stopandgo.net'))) {
            const sgLink = uniqueByUrl.find(isStopAndGoPage) || { label: t('action_stopandgo_page'), link: activeEvent.link || 'https://stopandgo.net' };
            officialSite = sgLink;
        } else if (activeEvent?.source?.includes('Classificações') || (activeEvent?.link && activeEvent.link.includes('classificacoes.net'))) {
            officialSite = { label: 'Classificações.net', link: activeEvent.link || 'https://www.classificacoes.net' };
        } else if (activeEvent?.link && !activeEvent.link.includes('fpciclismo.pt')) {
            officialSite = { label: t('action_official_site'), link: activeEvent.link };
        } else if (activeEvent?.link && activeEvent.link.includes('fpciclismo.pt')) {
            officialSite = { label: t('action_fpc_page'), link: activeEvent.link };
        }

        // Recursos secundários organizados para o corpo do modal
        const resources = [];
        tracksList.forEach(tItem => resources.push({ icon: 'track', label: tItem.label && (tItem.label.includes('Percurso') || tItem.label.includes('Track')) ? tItem.label : t('resource_tracks'), link: tItem.link }));
        participantsList.forEach(p => resources.push({ icon: 'users', label: t('resource_participants'), link: p.link }));
        resultsList.forEach(r => resources.push({ icon: 'trophy', label: r.label && (r.label.includes('Resultado') || r.label.includes('Classifica')) ? r.label : t('resource_results'), link: r.link }));
        if (primaryRules) {
            resources.push({ icon: 'file', label: t('resource_rules'), link: primaryRules.link });
        }
        conditionsList.forEach(c => resources.push({ icon: 'shield', label: t('resource_conditions'), link: c.link }));
        if (fpcList.length > 0 && !activeEvent?.source?.startsWith('FPC')) {
            fpcList.forEach(f => resources.push({ icon: 'fpc', label: t('resource_fpc'), link: f.link }));
        }

        // Inscrições limpas e desduplicadas por plataforma
        const registrationClean = [];
        const seenPlats = new Set();
        for (const src of registrationList) {
            let plat = "Oficial";
            const sLink = (src.link || '').toLowerCase();
            if (sLink.includes('stopandgo')) plat = "Stop & Go";
            else if (sLink.includes('cabreira')) plat = "Cabreira";
            else if (sLink.includes('classificacoes')) plat = "Classificações.net";
            else if (sLink.includes('fpc')) plat = "FPC";
            else plat = (src.label || 'Oficial').replace(/inscrever|inscrição|inscricao|visitar|em|na|no/ig, '').trim() || "Oficial";

            if (!seenPlats.has(plat)) {
                seenPlats.add(plat);
                registrationClean.push({ ...src, _plat: plat });
            }
        }

        if (registrationClean.length === 0 && activeEvent?.link && (activeEvent.link.includes('prova-inscrever') || activeEvent.link.includes('stopandgo'))) {
            registrationClean.push({ label: t('action_register'), link: activeEvent.link, _plat: 'Oficial' });
        }

        return {
            registrationList: registrationClean,
            primaryResults,
            primaryRules,
            officialSite,
            resources: Array.from(new Map(resources.map(r => [r.link, r])).values())
        };
    }, [programaData.additionalLinks, activeEvent, language, t]);

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
        setRegOpenCalMsg(regOpenMarked ? 'Marcado' : '');
        setRegCloseCalStatus(regCloseMarked ? 'exists' : null);
        setRegCloseCalMsg(regCloseMarked ? 'Marcado' : '');
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
    const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    
    // Extrai o dia ou intervalo real do evento
    let day = '';
    let month = '';
    const fullRangeMatch = rawDate.trim().match(/^(\d{1,2})\s*(?:[A-ZÀ-Úa-zà-ú]{3})?(?:\s*\d{4})?\s*(?:a|-|e)\s*(\d{1,2})\s+([A-ZÀ-Úa-zà-ú]{3})/i);
    if (fullRangeMatch && monthAbbrs.includes(fullRangeMatch[3].toUpperCase())) {
        const startDay = fullRangeMatch[1];
        const endDay = fullRangeMatch[2];
        month = fullRangeMatch[3].toUpperCase();
        day = startDay === endDay ? startDay : `${startDay}-${endDay}`;
    } else {
        const dateParts = rawDate.trim().split(/\s+/);
        day = dateParts[0] ? dateParts[0].replace(/,/g, '') : '';
        month = dateParts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || '';
    }

    return (
        <div 
            className={`${styles.overlay} fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-0 pt-8 sm:p-4 overflow-hidden transition-opacity duration-300 ${
                isClosing || !isOpenAnimated ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`} 
            style={{
                opacity: isDragging && dragY > 0 ? Math.max(0.2, 1 - (dragY / 400)) : undefined
            }}
            onClick={closeModal}
        >
            <div 
                role="dialog"
                ref={dialogRef}
                tabIndex={-1}
                aria-modal="true"
                aria-label={activeEvent.title}
                className={`${styles.eventDialog} border-t sm:border rounded-t-3xl sm:rounded-3xl w-full max-w-5xl ${
                    isExpanded ? 'h-[96dvh] max-h-[96dvh]' : 'h-[90dvh] sm:h-[88vh] max-h-[calc(100dvh-2rem)] sm:max-h-[88vh]'
                } flex flex-col shadow-2xl overflow-hidden relative ${
                    isDragging ? 'transition-none' : 'transition-all duration-300 ease-out'
                } transform ${
                    isClosing || !isOpenAnimated 
                        ? 'translate-y-full sm:translate-y-6 sm:scale-95 sm:opacity-0' 
                        : 'translate-y-0 sm:scale-100 sm:opacity-100'
                }`} 
                style={{
                    transform: isDragging ? `translateY(${Math.max(-40, dragY)}px)` : undefined
                }}
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Mobile Drag / Dismiss Handle */}
                <div 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                        if (isExpanded) setIsExpanded(false);
                        else closeModal();
                    }}
                    className="w-full pt-3 pb-2 flex items-center justify-center sm:hidden shrink-0 group cursor-grab active:cursor-grabbing touch-none select-none"
                    title="Arrastar para baixo para fechar ou para cima para expandir"
                >
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 rounded-full transition-colors" />
                </div>

                {/* Mobile Top Bar (sm:hidden) */}
                <div className="sm:hidden flex items-center justify-between px-4 pt-1 pb-1 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex flex-col shrink-0 w-[42px] h-[42px] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-line">
                            <div className="bg-brand-soft text-brand text-[8px] font-bold uppercase tracking-wider text-center py-0.5">
                                {formatMonthAbbr(month, language)}
                            </div>
                            <div className={`flex-1 flex items-center justify-center text-ink font-bold ${day.length > 2 ? 'text-[11px] tracking-tight' : 'text-sm'}`}>
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
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={handleShare}
                            className={`flex items-center justify-center gap-1 h-8 px-2 rounded-full transition-all cursor-pointer text-xs font-semibold ${shareCopied ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40' : 'bg-soft border border-line text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            title={t('action_share')}
                        >
                            <Share2 size={13} />
                            {shareCopied && <span className="text-[10px]">{t('action_copied')}</span>}
                        </button>
                        {(() => {
                            const isEventFavorited = favorites.includes(activeEvent.id) || (activeEvent._allIds && activeEvent._allIds.some(id => favorites.includes(id)));
                            return (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(activeEvent.id);
                                    }}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${isEventFavorited ? 'bg-amber-400/15 border border-amber-500/40 text-amber-400' : 'bg-soft border border-line text-slate-400'}`}
                                    title={isEventFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
                                >
                                    <Star 
                                        size={15} 
                                        fill={isEventFavorited ? "#fbbf24" : "none"}
                                    />
                                </button>
                            );
                        })()}
                        <button 
                            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full bg-soft border border-line cursor-pointer"
                            onClick={closeModal} 
                            title={t('action_close')}
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* Mobile Title & Date & Weather Badge (sm:hidden) */}
                <div className="sm:hidden px-4 pt-1 pb-2 shrink-0 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        {(() => {
                            const translation = activeEvent.translations?.find(t => t.language === language)
                                || (language !== 'pt' ? activeEvent.translations?.find(t => t.language === 'en') : null);
                            const modalTitle = language === 'pt' ? activeEvent.title : (translation?.title || activeEvent.title);
                            return (
                                <h2 className="text-base font-bold text-ink m-0 leading-snug line-clamp-2">
                                    {activeEvent.logo ? (
                                        <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {modalTitle}
                                        </a>
                                    ) : (
                                        <span>{modalTitle}</span>
                                    )}
                                </h2>
                            );
                        })()}
                    </div>
                    <WeatherWidget 
                        location={activeEvent.details?.split('|')[0]?.trim()} 
                        distrito={activeEvent.distrito} 
                        date={activeEvent.sortDate ? new Date(activeEvent.sortDate).toISOString().substring(0, 10) : activeEvent.date}
                        variant="mobile-badge"
                    />
                </div>

                {/* Desktop Header (hidden sm:flex) */}
                <div className="hidden sm:flex items-center justify-between gap-3.5 pr-14 p-5 pb-2 min-w-0 shrink-0">
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={closeModal} title={t('action_close')}>
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="flex flex-col shrink-0 w-[54px] h-[54px] bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-line">
                            <div className="bg-brand-soft text-brand text-[10px] font-bold uppercase tracking-wider text-center py-0.5">
                                {formatMonthAbbr(month, language)}
                            </div>
                            <div className={`flex-1 flex items-center justify-center text-ink font-bold ${day.length > 2 ? 'text-xs sm:text-sm tracking-tight' : 'text-lg'}`}>
                                {day}
                            </div>
                        </div>
                        {activeEvent.logo && (
                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="flex shrink-0" title={t('action_official_site')}>
                                <SmartLogo 
                                    src={activeEvent.logo} 
                                    alt={`Logo ${activeEvent.title}`} 
                                    className="h-8 w-auto object-contain" 
                                    style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                                />
                            </a>
                        )}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {(() => {
                                const translation = activeEvent.translations?.find(t => t.language === language)
                                    || (language !== 'pt' ? activeEvent.translations?.find(t => t.language === 'en') : null);
                                const modalTitle = language === 'pt' ? activeEvent.title : (translation?.title || activeEvent.title);
                                return (
                                    <h2 className="text-xl font-bold text-ink m-0 truncate">
                                        {activeEvent.logo ? (
                                            <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                                                {modalTitle}
                                            </a>
                                        ) : (
                                            <span className="text-ink truncate">{modalTitle}</span>
                                        )}
                                    </h2>
                                );
                            })()}
                            <button 
                                onClick={handleShare}
                                className={`flex shrink-0 items-center justify-center gap-1.5 h-7 px-2.5 rounded-full transition-all cursor-pointer text-xs font-semibold ${shareCopied ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40' : 'bg-soft border border-line text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                title={t('action_share')}
                            >
                                <Share2 size={13} />
                                <span className="text-[11px]">{shareCopied ? t('action_copied') : t('action_share')}</span>
                            </button>
                            {(() => {
                                const isEventFavorited = favorites.includes(activeEvent.id) || (activeEvent._allIds && activeEvent._allIds.some(id => favorites.includes(id)));
                                return (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(activeEvent.id);
                                        }}
                                        className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${isEventFavorited ? 'bg-amber-400/15 border border-amber-500/40 text-amber-400' : 'bg-soft border border-line text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        title={isEventFavorited ? t('card_remove_favorite') : t('card_add_favorite')}
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

                    {/* Weather in Header (Top Right box) */}
                    <WeatherWidget 
                        location={activeEvent.details?.split('|')[0]?.trim()} 
                        distrito={activeEvent.distrito} 
                        date={activeEvent.sortDate ? new Date(activeEvent.sortDate).toISOString().substring(0, 10) : activeEvent.date}
                        variant="header"
                    />
                </div>
                
                {/* Tabs Navigation */}
                {availableTabs.length > 0 ? (
                    <div className="px-3 sm:px-5 pb-2 pt-1 border-b border-line shrink-0">
                        <div className={styles.eventTabs}>
                            {availableTabs.map(tab => {
                                const tabIcons = {
                                    info: <Info size={13} className="shrink-0" />,
                                    escaloes: <Users size={13} className="shrink-0" />,
                                    programa: <Clock size={13} className="shrink-0" />,
                                    inscricao: <Tag size={13} className="shrink-0" />,
                                    premios: <Trophy size={13} className="shrink-0" />,
                                    localizacao: <MapPin size={13} className="shrink-0" />
                                };
                                const shortLabels = {
                                    info: 'Info',
                                    escaloes: t('tab_categories'),
                                    programa: activeEvent.source === 'FPC' ? 'Docs' : t('tab_schedule'),
                                    inscricao: t('tab_registration'),
                                    premios: t('tab_prizes'),
                                    localizacao: t('tab_location')
                                };
                                const fullLabels = {
                                    info: t('tab_info'),
                                    escaloes: t('tab_categories'),
                                    programa: activeEvent.source === 'FPC' ? t('tab_docs') : t('tab_schedule'),
                                    inscricao: t('tab_registration'),
                                    premios: t('tab_prizes'),
                                    localizacao: t('tab_location')
                                };
                                const isActive = activeTab === tab;
                                return (
                                    <button 
                                        key={tab} 
                                        onClick={() => setActiveTab(tab)} 
                                        className={styles.eventTab}
                                        aria-pressed={isActive}
                                    >
                                        {tabIcons[tab]}
                                        <span className="sm:hidden leading-none truncate max-w-full">{shortLabels[tab]}</span>
                                        <span className="hidden sm:inline">{fullLabels[tab]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mb-2 pb-2 border-b border-line px-4 sm:px-5 shrink-0">
                        <p className="text-muted text-xs">
                            {t('summary_no_description')}
                        </p>
                    </div>
                )}

                {/* Tab content area */}
                <div className="flex-grow overflow-hidden flex flex-col px-4 sm:px-5 min-h-0 pt-2">
                
                {availableTabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 animate-fade-in">
                        <FileText size={40} className="text-slate-600" />
                        <h3 className="m-0 text-slate-200 text-center text-lg font-semibold">{t('summary_no_description')}</h3>
                        <a 
                            href={activeEvent.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-blue-600 text-white no-underline px-6 py-2.5 rounded-xl font-semibold inline-block shadow-lg hover:bg-blue-500 transition-colors text-sm"
                        >
                            {t('action_official_site')}
                        </a>
                    </div>
                )}

                {/* Tab: INFO */}
                {activeTab === 'info' && (
                    <div className="flex flex-col h-full animate-fade-in min-h-0">
                        {/* Registration Alert Banner */}
                        {(() => {
                            if (!activeEvent.registrationClosesAt && !activeEvent.registrationOpensAt) return null;
                            const now = new Date();
                            const locale = language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'pt-PT';
                            if (activeEvent.registrationClosesAt) {
                                const closes = new Date(activeEvent.registrationClosesAt);
                                const diffDays = Math.ceil((closes - now) / (1000 * 60 * 60 * 24));
                                if (diffDays >= 0 && diffDays <= 7) {
                                    const closesLabel = diffDays === 0
                                        ? t('card_last_day')
                                        : `${t('reg_close_title')}: ${t('card_days_to_close').replace('{days}', diffDays)} (${closes.toLocaleDateString(locale)})`;
                                    return (
                                        <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Clock size={15} className="shrink-0 animate-pulse text-rose-500" />
                                                <span>{closesLabel}</span>
                                            </div>
                                            {activeEvent.link && (
                                                <a href={activeEvent.link} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold no-underline transition-colors shrink-0">
                                                    {t('action_register')}
                                                </a>
                                            )}
                                        </div>
                                    );
                                }
                            }
                            if (activeEvent.registrationOpensAt) {
                                const opens = new Date(activeEvent.registrationOpensAt);
                                const diffDays = Math.ceil((opens - now) / (1000 * 60 * 60 * 24));
                                if (diffDays > 0 && diffDays <= 14) {
                                    return (
                                        <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center gap-2 text-lime-700 dark:text-lime-400 text-xs font-semibold shrink-0">
                                            <Clock size={15} className="shrink-0 text-lime-500" />
                                            <span>{t('reg_open_title')}: {diffDays}d ({opens.toLocaleDateString(locale)})</span>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overscroll-contain touch-pan-y">
                            {/* Native Universal Resumo da Prova Card */}
                            {(() => {
                                const raceInfo = detectRaceDate(activeEvent);
                                return (
                                <div className={styles.eventSummary}>
                                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-brand flex items-center justify-center shrink-0">
                                                <Sparkles size={13} />
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-bold text-ink m-0 tracking-tight">
                                                {t('summary_title')}
                                            </h4>
                                        </div>
                                        {activeEvent.source && (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {activeEvent.source.split(',').map(s => s.trim()).filter(Boolean).map(src => (
                                                    <span key={src} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
                                                        {src}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {/* Data */}
                                        <div className="flex items-start gap-2 text-ink">
                                            <Calendar size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted block font-semibold uppercase leading-tight">{t('summary_date')}</span>
                                                <span className="font-semibold text-ink truncate block">{translateDateString(activeEvent.date, language)}</span>
                                                {raceInfo && raceInfo.raceDayOnly && raceInfo.label !== activeEvent.date && (
                                                    <span className="text-[11px] text-brand font-bold block mt-0.5"><Flag size={12} className="inline-block align-middle shrink-0 mr-1" aria-hidden="true" />{translateDateString(raceInfo.label, language)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Localização */}
                                        <div className="flex items-start gap-2 text-ink">
                                            <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted block font-semibold uppercase leading-tight">{t('summary_location')}</span>
                                                <span className="font-semibold text-ink truncate block">
                                                    {activeEvent.details?.split('|')[0]?.trim() || t('summary_location_tbd')}
                                                    {activeEvent.distrito && !activeEvent.details?.includes(activeEvent.distrito) ? ` (${activeEvent.distrito})` : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Modalidade */}
                                        <div className="flex items-start gap-2 text-ink">
                                            <Bike size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted block font-semibold uppercase leading-tight">{t('summary_discipline')}</span>
                                                <span className="font-semibold text-ink truncate block">{translateTag(getEventDiscipline(activeEvent), language) || t('summary_cycling')}</span>
                                            </div>
                                        </div>

                                        {/* Âmbito & Licença */}
                                        <div className="flex items-start gap-2 text-ink">
                                            <Shield size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted block font-semibold uppercase leading-tight">{t('summary_scope_license')}</span>
                                                <span className="font-semibold text-ink truncate block">
                                                    {translateAmbito(activeEvent.ambito, language)} {activeEvent.licenca ? `• ${translateLicenca(activeEvent.licenca, language)}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Percursos & Distâncias */}
                                    {percursosSummary && percursosSummary.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                                            <span className="text-[10px] text-muted font-semibold uppercase block mb-1.5">
                                                <Bike size={16} className="inline-block align-middle shrink-0 mr-1" aria-hidden="true" />{t('summary_routes_distances')}
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                {percursosSummary.map((p, idx) => {
                                                    const parts = p.split(/:\s*/);
                                                    const title = parts.length > 1 ? parts[0] : null;
                                                    const metrics = parts.length > 1 ? parts.slice(1).join(': ') : p;
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-xs shadow-sm">
                                                            <div className="w-5 h-5 rounded-lg bg-blue-500/20 text-brand flex items-center justify-center shrink-0">
                                                                <Bike size={12} />
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                                {title && (
                                                                    <span className="font-bold text-ink">{title}:</span>
                                                                )}
                                                                <span className="font-semibold text-blue-700 dark:text-blue-300">{metrics}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })()}

                            {isLoadingFullEvent && (
                                <div className="w-full h-32 rounded-xl bg-slate-800/30 border border-slate-800/80 animate-pulse flex flex-col items-center justify-center gap-2 mb-2 text-slate-500">
                                    <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin"></div>
                                    <span className="text-xs font-medium">{t('action_loading_data')}</span>
                                </div>
                            )}

                            {fpcBannerHtml && !isLoadingFullEvent && (
                                <div className="mb-2 text-center" dangerouslySetInnerHTML={{ __html: fpcBannerHtml }} onClick={handleHtmlClick} />
                            )}
                            {cleanDescriptionHtml ? (
                                <div className="text-ink text-xs sm:text-sm leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: cleanDescriptionHtml }} />
                            ) : !isLoadingFullEvent ? (
                                <p className="text-muted text-xs sm:text-sm">{t('summary_no_description')}</p>
                            ) : null}

                            {/* Recursos e Documentos Úteis da Prova */}
                            {parsedLinks.resources.length > 0 && !isLoadingFullEvent && (
                                <div className="mt-3.5 mb-1 p-3.5 bg-soft rounded-2xl border border-line">
                                    <h5 className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2.5 flex items-center gap-1.5">
                                        <ExternalLink size={12} className="text-blue-500" /> {t('resources_title')}
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {parsedLinks.resources.map((res, idx) => (
                                            <a 
                                                key={`res-${idx}`} 
                                                href={res.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-line hover:border-blue-400 dark:hover:border-slate-700 text-ink hover:text-blue-600 dark:hover:text-white transition-colors text-xs font-semibold shadow-2xs group"
                                            >
                                                <span className="p-1 rounded-lg bg-soft group-hover:bg-blue-500/10 transition-colors shrink-0">
                                                    {res.icon === 'track' && <MapPin size={13} className="text-emerald-500" />}
                                                    {res.icon === 'users' && <Users size={13} className="text-blue-500" />}
                                                    {res.icon === 'trophy' && <Trophy size={13} className="text-amber-500" />}
                                                    {res.icon === 'file' && <FileText size={13} className="text-indigo-500" />}
                                                    {res.icon === 'shield' && <Shield size={13} className="text-purple-500" />}
                                                    {res.icon === 'fpc' && <Globe size={13} className="text-slate-400" />}
                                                </span>
                                                <span className="truncate flex-1">{res.label}</span>
                                                <ExternalLink size={11} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="shrink-0 mt-2 grid grid-cols-2 gap-2 pb-1">
                            {activeEvent.licenca && (
                                <div className="px-3 py-2 bg-soft rounded-xl border border-line flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                        <FileText size={13} className="text-purple-500 dark:text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">{t('summary_license')}</span>
                                        <span className="text-xs sm:text-sm font-semibold text-ink truncate block">{translateLicenca(activeEvent.licenca, language)}</span>
                                    </div>
                                </div>
                            )}
                            {(activeEvent.organizador || activeEvent.source) && (
                                <div className="px-3 py-2 bg-soft rounded-xl border border-line flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                        <Users size={13} className="text-brand" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block leading-tight">{t('summary_organizer')}</span>
                                        <span className="text-xs sm:text-sm font-semibold text-ink truncate block">
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
                            <p className="text-muted text-xs sm:text-sm">{t('summary_no_description')}</p>
                        ) : (
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-2 overscroll-contain touch-pan-y">
                                <h4 className="mb-2.5 text-ink flex items-center gap-2 text-sm font-semibold">
                                    <Bike size={16} className="text-brand" />
                                    {t('tab_categories')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeEvent.escaloes.map((esc, idx) => (
                                        <div key={`esc-${idx}`} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm cursor-default">
                                            <span>{translateEscalao(esc, language)}</span>
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
                                        <div key={`day-${dIdx}`} className="bg-soft border border-line rounded-2xl p-3.5 sm:p-4 shadow-sm">
                                            {/* Day Header */}
                                            <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-line">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-brand shrink-0">
                                                    <Calendar size={15} />
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-bold text-ink m-0">
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
                                                            <div className="flex-1 bg-surface border border-line rounded-xl p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                                    <h4 className="text-xs sm:text-sm font-bold text-ink m-0 flex items-center gap-1.5">
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
                                                                                className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/link"
                                                                                title="Abrir no Google Maps"
                                                                            >
                                                                                <MapPin size={12} className="text-rose-500 dark:text-rose-400 shrink-0" />
                                                                                <span className="truncate">{act.location}</span>
                                                                                <ExternalLink size={10} className="opacity-60 group-hover/link:opacity-100 shrink-0" />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
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
                                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: programaCleanHtml }} onClick={handleHtmlClick} />
                            ) : (
                                <div className="p-4 bg-soft border border-line rounded-xl text-muted text-xs flex items-center gap-2.5">
                                    <FileText size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span>{t('schedule_not_available')}</span>
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
                                <div className="text-ink text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prices }} />
                            ) : (
                                <p className="text-muted text-xs sm:text-sm">{t('summary_no_description')}</p>
                            )}
                        </div>
                        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                            <div className="bg-soft p-3 rounded-xl border border-line flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">{t('reg_open_title')}</h4>
                                        <p className="text-ink text-xs sm:text-sm font-semibold">
                                            {activeEvent.registrationOpensAt ? formatRegDate(activeEvent.registrationOpensAt) : t('summary_to_be_defined')}
                                        </p>
                                    </div>
                                    {activeEvent.registrationOpensAt && isSignedIn && (() => {
                                        const isRegOpenMarked = regOpenCalStatus === 'success' || regOpenCalStatus === 'exists';
                                        return (
                                            <button 
                                                onClick={() => {
                                                    if (isRegOpenMarked) {
                                                        setDeleteConfirmation({ target: 'registration_open', label: t('cal_menu_mark_reg_open') });
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
                                                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-brand border border-line shadow-sm'
                                                } ${regOpenCalStatus === 'loading' ? 'opacity-70 cursor-default' : ''}`}
                                                title={isRegOpenMarked ? t('action_remove_confirm') : regOpenCalMsg || t('reg_reminder_alert')}
                                            >
                                                {regOpenCalStatus === 'loading' ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>{t('action_marking')}</span>
                                                    </>
                                                ) : isRegOpenMarked ? (
                                                    <>
                                                        <span className="flex items-center gap-1.5 group-hover:hidden">
                                                            <Check size={13} />
                                                            <span>{t('action_marked')}</span>
                                                        </span>
                                                        <span className="hidden group-hover:flex items-center gap-1.5">
                                                            <Trash2 size={13} />
                                                            <span>{t('action_remove_confirm')}</span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CalendarPlus size={13} />
                                                        <span>{regOpenCalStatus === 'error' ? (regOpenCalMsg || 'Erro!') : t('reg_remind_open')}</span>
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                                {activeEvent.registrationOpensAt && (
                                    <span className="text-[10px] text-muted mt-1 flex items-center gap-1">
                                        <Clock size={10} className="text-blue-500" /> {t('reg_reminder_alert')}
                                    </span>
                                )}
                            </div>

                            <div className="bg-soft p-3 rounded-xl border border-line flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="mb-1 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">{t('reg_close_title')}</h4>
                                        <p className="text-ink text-xs sm:text-sm font-semibold">
                                            {activeEvent.registrationClosesAt ? formatRegDate(activeEvent.registrationClosesAt) : t('summary_to_be_defined')}
                                        </p>
                                    </div>
                                    {activeEvent.registrationClosesAt && isSignedIn && (() => {
                                        const isRegCloseMarked = regCloseCalStatus === 'success' || regCloseCalStatus === 'exists';
                                        return (
                                            <button 
                                                onClick={() => {
                                                    if (isRegCloseMarked) {
                                                        setDeleteConfirmation({ target: 'registration_close', label: t('cal_menu_mark_reg_close') });
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
                                                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-brand border border-line shadow-sm'
                                                } ${regCloseCalStatus === 'loading' ? 'opacity-70 cursor-default' : ''}`}
                                                title={isRegCloseMarked ? t('action_remove_confirm') : regCloseCalMsg || t('reg_reminder_alert')}
                                            >
                                                {regCloseCalStatus === 'loading' ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>{t('action_marking')}</span>
                                                    </>
                                                ) : isRegCloseMarked ? (
                                                    <>
                                                        <span className="flex items-center gap-1.5 group-hover:hidden">
                                                            <Check size={13} />
                                                            <span>{t('action_marked')}</span>
                                                        </span>
                                                        <span className="hidden group-hover:flex items-center gap-1.5">
                                                            <Trash2 size={13} />
                                                            <span>{t('action_remove_confirm')}</span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CalendarPlus size={13} />
                                                        <span>{regCloseCalStatus === 'error' ? (regCloseCalMsg || 'Erro!') : t('reg_remind_close')}</span>
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                                {activeEvent.registrationClosesAt && (
                                    <span className="text-[10px] text-muted mt-1 flex items-center gap-1">
                                        <Clock size={10} className="text-amber-500" /> {t('reg_reminder_alert')}
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
                            <div className="bg-soft p-3.5 rounded-xl border border-line">
                                <h4 className="mb-2 text-ink flex items-center gap-2 text-sm font-semibold">
                                    <Trophy size={15} className="text-amber-500 dark:text-amber-400" /> {t('summary_prizes')}
                                </h4>
                                {activeEvent.prizes ? (
                                    <div className="text-ink text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.prizes }} />
                                ) : (
                                    <p className="text-muted text-xs">{t('summary_no_description')}</p>
                                )}
                            </div>
                            <div className="bg-soft p-3.5 rounded-xl border border-line">
                                <h4 className="mb-2 text-ink flex items-center gap-2 text-sm font-semibold">
                                    <Shield size={15} className="text-emerald-500 dark:text-emerald-400" /> {t('summary_insurance')}
                                </h4>
                                {activeEvent.insurance ? (
                                    <div className="text-ink text-xs sm:text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeEvent.insurance }} />
                                ) : (
                                    <p className="text-muted text-xs">{t('summary_no_description')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: LOCALIZACAO */}
                {activeTab === 'localizacao' && (
                    <div className="flex flex-col h-full animate-fade-in pb-2 min-h-0 overflow-hidden pr-1">
                        {activeEvent.details && activeEvent.details !== 'A definir' ? (
                            <div className="w-full h-full min-h-[300px] flex-1 rounded-xl overflow-hidden border border-line shadow-sm relative">
                                <iframe 
                                    className="w-full h-full border-0 dark:[filter:invert(90%)_hue-rotate(180deg)] transition-all duration-300 min-h-[300px]"
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEvent.details.split('|')[0] + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>
                        ) : (
                            <p className="text-muted text-xs sm:text-sm">{t('summary_location_tbd')}</p>
                        )}
                    </div>
                )}

                </div> {/* end flex-grow tab area */}

                {/* Action footer */}
                <div className="flex gap-2 flex-wrap items-center justify-between p-2.5 sm:px-5 sm:py-3 bg-soft border-t border-line shrink-0 transition-colors duration-200">
                    {programaData.loading ? (
                        <div className="px-3 py-1.5 flex items-center gap-2 text-slate-400 text-xs">
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>{t('action_loading_data')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* 1. Classificações / Resultados da Prova (Destaque quando existem) */}
                            {parsedLinks.primaryResults && (
                                <a 
                                    href={parsedLinks.primaryResults.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <Trophy size={14} className="text-amber-500 shrink-0" />
                                    <span>{t('action_results')}</span>
                                </a>
                            )}

                            {/* 2. Regulamento Oficial Único */}
                            {parsedLinks.primaryRules && (
                                <a 
                                    href={parsedLinks.primaryRules.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-3.5 py-2 bg-soft hover:bg-slate-200 dark:hover:bg-slate-700 text-ink rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-line flex items-center gap-1.5"
                                >
                                    <FileText size={14} className="text-muted shrink-0" />
                                    <span>{t('action_rules')}</span>
                                </a>
                            )}

                            {/* 3. Site Oficial / Organização */}
                            {parsedLinks.officialSite && (
                                <a 
                                    href={parsedLinks.officialSite.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-3.5 py-2 bg-soft hover:bg-slate-200 dark:hover:bg-slate-700 text-ink rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-line flex items-center gap-1.5"
                                >
                                    <Globe size={14} className="text-muted shrink-0" />
                                    <span>{parsedLinks.officialSite.label}</span>
                                </a>
                            )}

                            {/* 4. Botão Principal de Inscrição */}
                            {parsedLinks.registrationList.length === 1 && (
                                <a 
                                    href={parsedLinks.registrationList[0].link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-4 py-2 bg-brand hover:brightness-110 text-surface rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center justify-center"
                                >
                                    {t('action_register')}
                                </a>
                            )}
                            
                            {parsedLinks.registrationList.length > 1 && (
                                <div className="relative group">
                                    <button className="px-4 py-2 bg-brand hover:brightness-110 text-surface rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer">
                                        <span>{t('action_register')}</span>
                                        <ChevronDown size={13} className="shrink-0" />
                                    </button>
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                                        <div className="flex flex-col">
                                            {parsedLinks.registrationList.map((src, idx) => (
                                                <a 
                                                    key={`inscr-${idx}`} 
                                                    href={src.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-ink text-xs transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-medium flex items-center justify-between"
                                                >
                                                    <span>{t('action_register')}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-brand font-semibold">{src._plat}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                            setDeleteConfirmation({ target: 'event', label: t('cal_menu_mark_event') });
                                        } else {
                                            handleAddToCalendar('event');
                                        }
                                    }}
                                    disabled={isAddingToCalendar}
                                    className={`group px-3.5 py-2 rounded-xl ${(activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) ? 'rounded-r-none border-r-0' : ''} text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isEventAlreadyMarked
                                            ? 'bg-emerald-500/10 hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/30'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink border border-line'
                                    } ${isAddingToCalendar ? 'opacity-70 cursor-default' : ''}`}
                                    title={isEventAlreadyMarked ? t('action_remove_confirm') : t('cal_menu_google_cal')}
                                >
                                    {isAddingToCalendar ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            <span>{t('action_marking')}</span>
                                        </>
                                    ) : isEventAlreadyMarked ? (
                                        <>
                                            <span className="flex items-center gap-1.5 group-hover:hidden">
                                                <Check size={15} />
                                                <span>{calendarMsg || `${t('action_marked')}`}</span>
                                            </span>
                                            <span className="hidden group-hover:flex items-center gap-1.5">
                                                <Trash2 size={15} />
                                                <span>{t('action_remove_confirm')}</span>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CalendarPlus size={15} />
                                            <span>{t('cal_menu_mark_event')}</span>
                                        </>
                                    )}
                                </button>

                                {(activeEvent.registrationOpensAt || activeEvent.registrationClosesAt) && (
                                    <button
                                        onClick={() => setShowCalMenu(!showCalMenu)}
                                        className="px-2 py-2 rounded-r-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink border border-line transition-colors cursor-pointer"
                                        title={t('cal_menu_google_cal')}
                                    >
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showCalMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {showCalMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in p-1.5 flex flex-col gap-1">
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-slate-100 dark:border-slate-800/80">
                                        {t('cal_menu_google_cal')}
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (isEventAlreadyMarked) {
                                                setShowCalMenu(false);
                                                setDeleteConfirmation({ target: 'event', label: t('cal_menu_mark_event') });
                                            } else {
                                                handleAddToCalendar('event');
                                            }
                                        }}
                                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                            isEventAlreadyMarked 
                                                ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-ink'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={isEventAlreadyMarked ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                                            <div>
                                                <span className="font-semibold block leading-tight">{t('cal_menu_mark_event')}</span>
                                                <span className="text-[10px] text-slate-400">{t('reg_reminder_alert')}</span>
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
                                                    setDeleteConfirmation({ target: 'registration_open', label: t('cal_menu_mark_reg_open') });
                                                } else {
                                                    handleAddToCalendar('registration_open');
                                                }
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                isRegOpenMarked 
                                                    ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-ink'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegOpenMarked ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">{t('cal_menu_mark_reg_open')}</span>
                                                    <span className="text-[10px] text-slate-400">{t('reg_reminder_alert')}</span>
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
                                                    setDeleteConfirmation({ target: 'registration_close', label: t('cal_menu_mark_reg_close') });
                                                } else {
                                                    handleAddToCalendar('registration_close');
                                                }
                                            }}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                isRegCloseMarked 
                                                    ? 'hover:bg-rose-500/10 text-emerald-600 hover:text-rose-600 dark:text-emerald-400 dark:hover:text-rose-400' 
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-ink'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegCloseMarked ? "text-emerald-500 shrink-0" : "text-amber-500 shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">{t('cal_menu_mark_reg_close')}</span>
                                                    <span className="text-[10px] text-slate-400">{t('reg_reminder_alert')}</span>
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
                        className="bg-surface border border-line rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative animate-scale-in text-ink"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3.5 mb-4 text-rose-500">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-ink">
                                    {t('action_confirm_delete_title')}
                                </h3>
                                <p className="text-xs text-muted mt-0.5 truncate max-w-[280px]">
                                    {activeEvent.title}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                            {t('action_confirm_delete_desc').replace('{label}', deleteConfirmation.label || '')}
                        </p>

                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                disabled={isDeletingFromCalendar}
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                {t('action_cancel')}
                            </button>
                            <button
                                disabled={isDeletingFromCalendar}
                                onClick={() => handleRemoveFromCalendar(deleteConfirmation.target)}
                                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-600/30"
                            >
                                {isDeletingFromCalendar ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>{t('action_deleting')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>{t('action_confirm_delete_btn')}</span>
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
                        title={t('action_close')}
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
