import { getEventDocuments } from '../utils/eventDocuments';
import EventDetailBody from './EventDetailBody';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, X, CalendarPlus, Check, Clock, ChevronDown, Bell, Trash2 } from 'lucide-react';
import { parsePrograma } from '../utils/parsePrograma';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useTranslation } from '../i18n/useTranslation';
import { translateDateString } from '../i18n/formatters';
import { getEventCategories } from '../utils/eventClassifier';
import { downloadIcsFile, generateGoogleCalendarUrl, getGoogleCalendarDatePayload } from '../utils/calendarExport';
import styles from './site.module.css';
import { useModalFocus } from '../hooks/useModalFocus';
import { withRegistrationDates } from '../utils/registrationDates';

import useSWR from 'swr';
const fetchDetail = async url => { const response = await fetch(url); const data = await response.json(); if (!response.ok || !data.success) throw new Error('Event unavailable'); return data.event; };

export default function EventModal(props) {
    return props.selectedEvent ? <EventModalContent key={props.selectedEvent.id} {...props} /> : null;
}
function EventModalContent({ selectedEvent, setSelectedEvent, favorites, toggleFavorite, isSignedIn, standalone = false }) {
    const dialogRef = useModalFocus(!!selectedEvent && !standalone);
    const { t, language } = useTranslation();
    const { isMarked, refreshCalendar, getCalendarEntry } = useCalendarEvents();
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const [isDeletingFromCalendar, setIsDeletingFromCalendar] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { target, label }
    const [calendarStatusOverride, setCalendarStatus] = useState(null);
    const calendarStatus = calendarStatusOverride || (isMarked(selectedEvent.id, 'event', selectedEvent._allIds || []) ? 'exists' : null); // 'success', 'exists', 'error'
    const [calendarMsg, setCalendarMsg] = useState('');
    const [regOpenCalStatusOverride, setRegOpenCalStatus] = useState(null);
    const regOpenCalStatus = regOpenCalStatusOverride || (isMarked(selectedEvent.id, 'registration_open', selectedEvent._allIds || []) ? 'exists' : null);
    const [regOpenCalMsg, setRegOpenCalMsg] = useState('');
    const [regCloseCalStatusOverride, setRegCloseCalStatus] = useState(null);
    const regCloseCalStatus = regCloseCalStatusOverride || (isMarked(selectedEvent.id, 'registration_close', selectedEvent._allIds || []) ? 'exists' : null);
    const [regCloseCalMsg, setRegCloseCalMsg] = useState('');
    const [showCalMenu, setShowCalMenu] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const calMenuRef = useRef(null);
    const [isClosing, setIsClosing] = useState(false);
    const [isOpenAnimated, setIsOpenAnimated] = useState(false);
    const handleShare = async () => {
        if (!selectedEvent) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
        const shareUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/events/${encodeURIComponent(selectedEvent.id)}`
            : `https://cyclingcalendar.pt/events/${encodeURIComponent(selectedEvent.id)}`;

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

    const closeModal = useCallback(() => {
        if (standalone) return;
        setIsClosing(true);
        setTimeout(() => {
            setSelectedEvent(null);
            setIsClosing(false);
        }, 260);
    }, [standalone, setSelectedEvent]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (fullscreenImage) {
                    setFullscreenImage(null);
                    setIsImageZoomed(false);
                } else {
                    closeModal();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeModal, fullscreenImage]);

    const { data: fetchedDetail, isLoading: isLoadingFullEvent } = useSWR(
        selectedEvent._hasFullDetails ? null : '/api/events/' + encodeURIComponent(selectedEvent.id), fetchDetail,
        { revalidateOnFocus: false, dedupingInterval: 120000 }
    );
    const activeEvent = useMemo(() => {
        const full = { ...selectedEvent, ...fetchedDetail,
            extraLinks: [...new Map([...(selectedEvent.extraLinks || []), ...(fetchedDetail?.extraLinks || [])].map(link => [link.link, link])).values()] };
        return withRegistrationDates({ ...full, escaloes: getEventCategories(full) });
    }, [selectedEvent, fetchedDetail]);
    const documents = useMemo(() => getEventDocuments(activeEvent), [activeEvent]);
    const programaData = useMemo(() => ({ loading: false, html: activeEvent.programa && activeEvent.programa !== 'Não disponível' ? activeEvent.programa : null, error: null, additionalLinks: [] }), [activeEvent.programa]);
    const [showCalendarOptions, setShowCalendarOptions] = useState(false);
    const googleCalendarUrl = generateGoogleCalendarUrl(activeEvent);

    // Bloquear o scroll da página de fundo quando o modal ou imagem em ecrã inteiro estiver aberto
    useEffect(() => {
        if ((!standalone && selectedEvent) || fullscreenImage) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || '';
            };
        }
    }, [selectedEvent, fullscreenImage, standalone]);


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
                .replace(/<img /g, '<img title="Clica para ampliar o cartaz" class="max-h-[440px] sm:max-h-[480px] w-auto max-w-full rounded-xl mx-auto object-contain shadow-lg border border-slate-300 dark:border-line cursor-zoom-in hover:scale-[1.01] transition-transform" ');
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
        'class="flex items-center gap-3 p-3 bg-slate-200 dark:bg-soft hover:bg-slate-700/80 border border-white/5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-white text-sm transition-colors !no-underline shadow-sm"'
    );
    programaCleanHtml = programaCleanHtml.replace(
        /<span style="font-weight: 500;">/g,
        '<span class="font-medium">'
    );
    programaCleanHtml = programaCleanHtml.replace(
        /style="color: var\(--text-secondary\);"/g,
        'class="text-slate-600 dark:text-slate-400 group-hover:text-slate-300"'
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
    }, [activeEvent]);

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
    }, [programaData.additionalLinks, activeEvent, t]);


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
                    setCalendarMsg(isExists ? 'Já no calendário!' : t('modal_calendar_added'));
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

    const savedEntry = getCalendarEntry(activeEvent.id, activeEvent._allIds);
    const expectedDates = getGoogleCalendarDatePayload(activeEvent);
    const savedDatesChanged = savedEntry && expectedDates && (savedEntry.start?.slice(0, 10) !== expectedDates.start.date || savedEntry.end?.slice(0, 10) !== expectedDates.end.date || !savedEntry.allDay);
    const savedEnd = savedEntry?.allDay && savedEntry.end ? new Date(new Date(savedEntry.end).getTime() - 86400000).toISOString().slice(0, 10) : savedEntry?.end?.slice(0, 10);


    return (
        <div 
            className={standalone ? styles.eventPage : `${styles.overlay} fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-0 pt-8 sm:p-4 overflow-hidden transition-opacity duration-300 ${
                isClosing || !isOpenAnimated ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`} 
            onClick={standalone ? undefined : closeModal}
        >
            <div 
                role={standalone ? "article" : "dialog"}
                ref={dialogRef}
                tabIndex={-1}
                aria-modal={standalone ? undefined : true}
                aria-label={activeEvent.title}
                className={`${styles.eventDialog} ${standalone ? styles.standaloneEvent : ""} border-t sm:border w-full max-w-5xl ${
                    standalone ? '' : 'h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[92vh]'
                } flex flex-col shadow-2xl overflow-y-auto relative transition-all duration-300 ease-out transform ${
                    isClosing || !isOpenAnimated 
                        ? 'translate-y-full sm:translate-y-6 sm:scale-95 sm:opacity-0' 
                        : 'translate-y-0 sm:scale-100 sm:opacity-100'
                }`} 
                onClick={(e) => e.stopPropagation()}
            >
                
                <EventDetailBody event={activeEvent} t={t} language={language} standalone={standalone}
                    closeModal={closeModal} favorite={favorites.includes(activeEvent.id) || activeEvent._allIds?.some(id => favorites.includes(id))}
                    toggleFavorite={toggleFavorite} handleShare={handleShare} shareCopied={shareCopied}
                    routes={percursosSummary} documents={documents} links={parsedLinks} schedule={parsedSchedule}
                    programHtml={programaCleanHtml} descriptionHtml={cleanDescriptionHtml} bannerHtml={fpcBannerHtml}
                    handleHtmlClick={handleHtmlClick} loading={isLoadingFullEvent} formatRegDate={formatRegDate} isSignedIn={isSignedIn}
                    reminders={{ open: { status: regOpenCalStatus, message: regOpenCalMsg }, close: { status: regCloseCalStatus, message: regCloseCalMsg } }}
                    onReminder={(kind, marked) => {
                        const target = kind === 'open' ? 'registration_open' : 'registration_close';
                        if (marked) setDeleteConfirmation({ target, label: t(kind === 'open' ? 'cal_menu_mark_reg_open' : 'cal_menu_mark_reg_close') });
                        else handleAddToCalendar(target);
                    }}>
                    <div className="w-full">
                        <button type="button" onClick={() => setShowCalendarOptions(value => !value)} disabled={!googleCalendarUrl && !activeEvent.registrationOpensAt && !activeEvent.registrationClosesAt} aria-expanded={showCalendarOptions} className="px-4 py-2 rounded border border-brand text-brand font-semibold text-sm flex items-center gap-2">
                            <CalendarPlus size={16} />{t('action_add_calendar')}<ChevronDown size={14} />
                        </button>
                        {savedEntry && <p className="text-xs text-muted mt-2 mb-0">
                            {t('planning_saved_dates')}: {savedEntry.start?.slice(0, 10)}{savedEnd && savedEnd !== savedEntry.start?.slice(0, 10) ? ' – ' + savedEnd : ''}
                            {Array.isArray(savedEntry.reminderMinutes) && <> · {t('planning_reminders')}: {savedEntry.reminderMinutes.length ? savedEntry.reminderMinutes.map(minutes => minutes % 1440 === 0 ? (minutes / 1440) + 'd' : minutes % 60 === 0 ? (minutes / 60) + 'h' : minutes + 'min').join(' / ') : t('planning_no_reminders')}</>}
                        </p>}
                        {savedDatesChanged && <p className="text-xs text-brand mt-2">{t('planning_saved_changed')}</p>}
                        <a className="text-xs text-muted underline inline-block mt-2" href={"/contacto?event=" + encodeURIComponent(activeEvent.id) + "&title=" + encodeURIComponent(activeEvent.title)}>{t('planning_report_error')}</a>
                        {showCalendarOptions && <div className="flex flex-wrap items-center gap-2 pt-3">
                            <p className="w-full text-xs text-muted m-0">{translateDateString(activeEvent.date, language)}</p>
                    {googleCalendarUrl && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <a
                                href={googleCalendarUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 bg-soft hover:bg-slate-200 dark:hover:bg-[#4a433b] text-ink rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-line flex items-center gap-1.5"
                            >
                                <CalendarPlus size={15} className="text-brand shrink-0" />
                                <span>{t('planning_google_manual')}</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => downloadIcsFile(activeEvent)}
                                className="px-3.5 py-2 bg-soft hover:bg-slate-200 dark:hover:bg-[#4a433b] text-ink rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-line flex items-center gap-1.5 cursor-pointer"
                                title="Adicionar ao Apple Calendar, Outlook ou outro calendário"
                            >
                                <Calendar size={15} className="text-brand shrink-0" />
                                <span>Apple / Outlook (.ics)</span>
                            </button>
                            <span className="text-[10px] text-muted">{t('planning_export_help')}</span>
                        </div>
                    )}

                    {isSignedIn && googleCalendarUrl && (() => {
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
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-soft dark:hover:bg-[#4a433b] text-ink border border-line'
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
                                        className="px-2 py-2 rounded-r-xl bg-slate-100 hover:bg-slate-200 dark:bg-soft dark:hover:bg-[#4a433b] text-ink border border-line transition-colors cursor-pointer"
                                        title={t('cal_menu_google_cal')}
                                    >
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showCalMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {showCalMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-72 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in p-1.5 flex flex-col gap-1">
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-slate-100 dark:border-line">
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
                                                : 'hover:bg-slate-100 dark:hover:bg-soft text-ink'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={isEventAlreadyMarked ? "text-emerald-500 shrink-0" : "text-brand shrink-0"} />
                                            <div>
                                                <span className="font-semibold block leading-tight">{t('cal_menu_mark_event')}</span>
                                                <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('planning_race_reminders')}</span>
                                            </div>
                                        </div>
                                        {isEventAlreadyMarked && (
                                            <Check size={13} className="text-brand shrink-0" />
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
                                                    : 'hover:bg-slate-100 dark:hover:bg-soft text-ink'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegOpenMarked ? "text-emerald-500 shrink-0" : "text-brand shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">{t('cal_menu_mark_reg_open')}</span>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('reg_reminder_alert')}</span>
                                                </div>
                                            </div>
                                            {isRegOpenMarked && (
                                                <Check size={13} className="text-brand shrink-0" />
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
                                                    : 'hover:bg-slate-100 dark:hover:bg-soft text-ink'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className={isRegCloseMarked ? "text-emerald-500 shrink-0" : "text-amber-500 shrink-0"} />
                                                <div>
                                                    <span className="font-semibold block leading-tight">{t('cal_menu_mark_reg_close')}</span>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('reg_reminder_alert')}</span>
                                                </div>
                                            </div>
                                            {isRegCloseMarked && (
                                                <Check size={13} className="text-brand shrink-0" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })()}
                        </div>}
                    </div>
                </EventDetailBody>
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
                                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:bg-slate-100 dark:hover:bg-soft transition-colors cursor-pointer"
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
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 bg-surface hover:bg-soft text-ink p-2.5 rounded-full transition-colors cursor-pointer z-[10000] border border-line shadow-xl"
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
                        {/* The source poster has unknown dimensions; preserve its native aspect ratio. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
