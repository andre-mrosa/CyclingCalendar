'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Calendar, MapPin, Share2, Star, Download, ExternalLink, 
    ChevronLeft, Clock, Shield, Trophy, FileText, Bike, 
    Check, AlertCircle, Compass, Mountain, Flag, Navigation,
    ArrowUpRight, Sparkles, X, ChevronDown, CheckCircle2, Play, Loader2, Users
} from 'lucide-react';
import WeatherWidget from '@/app/components/WeatherWidget';
import ElevationProfileChart from '@/app/components/ElevationProfileChart';
import BrandLogo from '@/app/components/BrandLogo';
import { categorizeEventLinks } from '@/app/utils/eventLinks';
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/app/utils/calendarExport';
import { parsePrograma } from '@/app/utils/parsePrograma';
import { formatEventLocation, extractEventTown } from '@/app/utils/eventLocation';
import { useUser } from '@clerk/nextjs';

export default function EventDetailClient({ event }) {
    const router = useRouter();
    const { isSignedIn } = useUser();
    
    // Estados interativos
    const [favorites, setFavorites] = useState([]);
    const [shareCopied, setShareCopied] = useState(false);
    const [showCalMenu, setShowCalMenu] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [activeTab, setActiveTab] = useState('geral');
    const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
    const [gpxData, setGpxData] = useState(event.gpxData || null);
    const [gpxLoading, setGpxLoading] = useState(false);
    const calMenuRef = useRef(null);

    // Carregar favoritos do localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('cycling_favorites');
            if (saved) {
                setFavorites(JSON.parse(saved));
            }
        } catch (e) {}
    }, []);

    // Fechar dropdown de calendário ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (calMenuRef.current && !calMenuRef.current.contains(event.target)) {
                setShowCalMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Processamento de hiperligações
    const links = useMemo(() => categorizeEventLinks(event), [event]);

    // Processamento do programa (prioriza dados do servidor para paridade total SSR/Hidratação)
    const parsedSchedule = useMemo(() => {
        if (event.parsedSchedule) return event.parsedSchedule;
        if (!event.programa) return null;
        try {
            return parsePrograma(event.programa);
        } catch (e) {
            return null;
        }
    }, [event.parsedSchedule, event.programa]);

    // Validação estrita de programa: apenas exibe se existir timeline real ou texto genuíno de cronograma/horários
    const hasValidSchedule = useMemo(() => {
        if (parsedSchedule && parsedSchedule.type === 'timeline' && parsedSchedule.days && parsedSchedule.days.length > 0) {
            return true;
        }
        if (event.programa) {
            const clean = event.programa.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (clean.includes('Documentos e Acessos') || clean.length < 20) return false;
            return /\b(?:\d{1,2}[:h]\d{2}|secretariado|partida|meta|chegada|abertura|encerramento|briefing|almoço|podio|pódio|troféus)\b/i.test(clean);
        }
        return false;
    }, [parsedSchedule, event.programa]);

    // Validação de documentos: apenas exibe a secção se existirem documentos oficiais de facto
    const hasDocuments = useMemo(() => {
        return !!(
            links.primaryRules || 
            (links.tracksList && links.tracksList.length > 0) || 
            (links.conditionsList && links.conditionsList.length > 0) || 
            (links.participantsList && links.participantsList.length > 0) || 
            (links.genericDocuments && links.genericDocuments.length > 0)
        );
    }, [links]);

    // Atualização dinâmica do separador ativo durante o scroll
    useEffect(() => {
        const sectionIds = ['geral', 'percursos', ...(hasValidSchedule ? ['programa'] : []), ...(hasDocuments ? ['documentos'] : [])];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveTab(entry.target.id);
                    }
                });
            },
            { rootMargin: '-15% 0px -70% 0px' }
        );

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [hasValidSchedule, hasDocuments]);

    const scrollToSection = (id) => {
        setActiveTab(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const isFavorited = favorites.includes(event.id);

    const toggleFavorite = () => {
        const next = isFavorited 
            ? favorites.filter(id => id !== event.id) 
            : [...favorites, event.id];
        setFavorites(next);
        try {
            localStorage.setItem('cycling_favorites', JSON.stringify(next));
        } catch (e) {}
    };

    const handleShare = async () => {
        const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://cyclingcalendar.pt/events/${event.id}`;
        const shareData = {
            title: `${event.title} | Cycling Calendar Portugal`,
            text: `Vê todos os detalhes de "${event.title}" (${event.date}) no Cycling Calendar:`,
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

    // Extração de banner da FPC se existir
    const fpcBannerMatch = useMemo(() => {
        if (!event.programa) return null;
        const match = event.programa.match(/<img[^>]+src="([^">]+)"[^>]*>/i);
        return match ? match[1] : null;
    }, [event.programa]);

    // Descrição editorial limpa sem cartões de resumo duplicados ou blocos de media redundantes
    const cleanDescription = useMemo(() => {
        if (!event.description) return null;
        let desc = event.description;
        // Remover cartões de resumo de percurso e blocos multimédia injectados para evitar repetições
        desc = desc.replace(/<div class="event-summary-card"[\s\S]*?<\/div>/gi, '');
        desc = desc.replace(/<div class="cabreira-course-media"[\s\S]*?<\/div>\s*<\/div>/gi, '');
        desc = desc.replace(/<h[23]>\s*APRESENTAÇÃO\s*<\/h[23]>/gi, '');
        
        // Descodificar entidades caso tenham sido duplamente codificadas
        desc = desc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

        // Desduplicar parágrafos idênticos
        const pMatches = desc.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
        if (pMatches && pMatches.length > 0) {
            const seen = new Set();
            const unique = [];
            for (const p of pMatches) {
                const textOnly = p.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                if (textOnly.length > 20) {
                    if (seen.has(textOnly)) continue;
                    seen.add(textOnly);
                }
                unique.push(p);
            }
            desc = unique.join('');
        }
        return desc.trim();
    }, [event.description]);

    // Badge limpo de preço (evita qualquer tag HTML bruta como <p> ou <br>)
    const priceBadge = useMemo(() => {
        if (!event.prices) return null;
        let str = event.prices.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        str = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        
        if (str.length <= 20 && !str.includes('\n') && !str.includes('<')) {
            return str;
        }
        
        const matches = [...str.matchAll(/(\d{1,3})\s*€/g)].map(m => parseInt(m[1])).filter(n => n >= 10 && n <= 150);
        if (matches.length > 0) {
            const minP = Math.min(...matches);
            const maxP = Math.max(...matches);
            return minP === maxP ? `${minP}€` : `Desde ${minP}€`;
        }
        if (/gratuito|livre/i.test(str)) return 'Gratuito';
        return str.length > 25 ? str.substring(0, 25) + '...' : str;
    }, [event.prices]);

    // Fases de inscrição se existirem no texto de preços
    const pricePhases = useMemo(() => {
        if (!event.prices) return [];
        const raw = event.prices;
        const textOnly = raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
        const lines = textOnly.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const phases = [];
        lines.forEach(line => {
            if (/^\d+[ªa]\s*fase/i.test(line) && line.includes('€')) {
                phases.push(line);
            }
        });
        return phases;
    }, [event.prices]);

    // Seguros desportivos limpos e sem artigos legais em excesso
    const cleanInsurance = useMemo(() => {
        if (!event.insurance) return null;
        let ins = event.insurance.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        if (ins.length > 2000) {
            const ulMatch = ins.match(/<ul[\s\S]*?<\/ul>/i);
            if (ulMatch) return ulMatch[0];
            const pMatch = ins.match(/3\.\s*SEGURO[\s\S]*?(?:<\/p>|(?=<p>\s*[4-9]\.))/i);
            if (pMatch) return pMatch[0];
            return ins.substring(0, 1000) + '...';
        }
        return ins;
    }, [event.insurance]);

    // Prémios e troféus limpos
    const cleanPrizes = useMemo(() => {
        if (!event.prizes) return null;
        let prz = event.prizes.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        if (prz.length > 2000) {
            const ulMatch = prz.match(/<ul[\s\S]*?<\/ul>/i);
            if (ulMatch) return ulMatch[0];
            const pMatch = prz.match(/7\.\s*PRÉMIOS[\s\S]*?(?:<\/p>|(?=<p>\s*[8-9]\.))/i);
            if (pMatch) return pMatch[0];
            return prz.substring(0, 1000) + '...';
        }
        return prz;
    }, [event.prizes]);

    // Formatação de datas
    const dateParts = (event.date || '').split(' ');
    const dayStr = dateParts[0] || '01';
    const monthStr = dateParts[1] || 'DATA';
    
    // Contagem decrescente
    const countdownDays = useMemo(() => {
        if (!event.sortDate) return null;
        const eventDate = new Date(event.sortDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }, [event.sortDate]);

    // Localização precisa (Localidade + Distrito)
    const displayLocation = useMemo(() => formatEventLocation(event), [event]);
    const eventTown = useMemo(() => extractEventTown(event), [event]);

    // Modality & Badges
    const isBtt = (event.tag || '').toLowerCase().includes('btt');
    const isGravel = (event.tag || '').toLowerCase().includes('gravel');
    const isGranfondo = (event.tag || '').toLowerCase().includes('granfondo');
    const isChampionship = (event.ambito || '').toLowerCase().includes('nacional') || (event.title || '').toLowerCase().includes('campeonato');
    const isCup = (event.ambito || '').toLowerCase().includes('taça') || (event.title || '').toLowerCase().includes('taça');

    // Deteção de ficheiro GPX oficial
    const gpxUrl = useMemo(() => {
        const gpxTrack = links.tracksList?.find(t => /\.gpx/i.test(t.link));
        if (gpxTrack) return gpxTrack.link;
        const text = `${event.programa || ''} ${event.extraLinks || ''} ${event.description || ''}`;
        const match = text.match(/https?:\/\/[^\s"'<>]+\.gpx/i);
        return match ? match[0] : null;
    }, [links.tracksList, event.programa, event.extraLinks, event.description]);

    // Dados altimétricos do GPX: utiliza dados já guardados na BD pelo scraper
    useEffect(() => {
        if (event.gpxData) {
            setGpxData(event.gpxData);
            setGpxLoading(false);
            return;
        }
        if (!gpxUrl) {
            setGpxData(null);
            return;
        }
        // Fallback apenas se o scraper ainda não tiver corrido para esta prova
        let isMounted = true;
        setGpxLoading(true);
        fetch(`/api/gpx?url=${encodeURIComponent(gpxUrl)}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (isMounted && data && !data.error) {
                    setGpxData(data);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (isMounted) setGpxLoading(false);
            });
        return () => { isMounted = false; };
    }, [event.gpxData, gpxUrl]);

    // Detetor genérico de imagem real de altimetria se existir no programa ou descrição
    const realAltimetryImage = useMemo(() => {
        const text = `${event.programa || ''} ${event.description || ''}`;
        const imgMatches = [...text.matchAll(/<img[^>]+src="([^">]+)"[^>]*>/gi)];
        for (const match of imgMatches) {
            const fullTag = match[0];
            const src = match[1];
            if (
                /altimetr|percurso|profile|elevation|relevo/i.test(fullTag) ||
                /altimetr|percurso|profile|elevation|relevo/i.test(src)
            ) {
                return src;
            }
        }
        return null;
    }, [event.programa, event.description]);

    // Distâncias estimadas ou detetadas do texto da prova com suporte a imagens e vídeos específicos
    const detectedCourses = useMemo(() => {
        const text = `${event.title} ${event.details || ''} ${event.description || ''} ${event.programa || ''} ${event.extraLinks || ''}`;
        const courses = [];

        let parsedExtraLinks = [];
        if (Array.isArray(event.extraLinks)) {
            parsedExtraLinks = event.extraLinks;
        } else if (typeof event.extraLinks === 'string') {
            try {
                parsedExtraLinks = JSON.parse(event.extraLinks);
            } catch (e) {}
        }

        const altimetryLinks = parsedExtraLinks.filter(l => /altimetria/i.test(l.label || ''));
        const videoLinks = parsedExtraLinks.filter(l => /v[ií]deo\s*3d/i.test(l.label || ''));

        const allImgMatches = [...text.matchAll(/<img[^>]+src="([^">]+)"[^>]*>/gi)].map(m => m[1]);
        const allIframeMatches = [...text.matchAll(/<iframe[^>]+src="([^">]+)"[^>]*>/gi)].map(m => m[1]);

        const findCourseMedia = (name, index = 0) => {
            const n = name.toLowerCase().replace(/^[-•*]\s*/, '').trim();
            let img = null;
            let vid = null;

            // 1. Procurar em altimetryLinks
            for (const l of altimetryLinks) {
                const lbl = (l.label || '').toLowerCase();
                if (
                    lbl.includes(n) || 
                    (n.includes('gran') && (lbl.includes('gran') || lbl.includes('grande'))) ||
                    (n.includes('medio') && (lbl.includes('medio') || lbl.includes('média') || lbl.includes('media'))) ||
                    (n.includes('mini') && (lbl.includes('mini') || lbl.includes('pequeno') || lbl.includes('curto') || lbl.includes('curta'))) ||
                    (n.includes('longo') && (lbl.includes('longo') || lbl.includes('longa'))) ||
                    (n.includes('etapa 1') && lbl.includes('etapa 1')) ||
                    (n.includes('etapa 2') && lbl.includes('etapa 2')) ||
                    (n.includes('etapa 3') && lbl.includes('etapa 3')) ||
                    (n.includes('prólogo') && (lbl.includes('prólogo') || lbl.includes('prologo')))
                ) {
                    img = l.link;
                    break;
                }
            }

            for (const l of videoLinks) {
                const lbl = (l.label || '').toLowerCase();
                if (
                    lbl.includes(n) || 
                    (n.includes('gran') && (lbl.includes('gran') || lbl.includes('grande'))) ||
                    (n.includes('medio') && (lbl.includes('medio') || lbl.includes('média') || lbl.includes('media'))) ||
                    (n.includes('mini') && (lbl.includes('mini') || lbl.includes('pequeno') || lbl.includes('curto') || lbl.includes('curta'))) ||
                    (n.includes('longo') && (lbl.includes('longo') || lbl.includes('longa'))) ||
                    (n.includes('etapa 1') && lbl.includes('etapa 1')) ||
                    (n.includes('etapa 2') && lbl.includes('etapa 2')) ||
                    (n.includes('etapa 3') && lbl.includes('etapa 3'))
                ) {
                    vid = l.link;
                    break;
                }
            }

            // 2. Se não encontrou em links, procurar nas imagens extraídas do HTML
            if (!img) {
                if (n.includes('gran') || n.includes('longo')) {
                    img = allImgMatches.find(src => /grande|granfondo|longa|longo/i.test(src));
                    vid = vid || allIframeMatches.find(src => /granfondo/i.test(src) || src.includes('gnNyN6FYDCY'));
                } else if (n.includes('medio')) {
                    img = allImgMatches.find(src => /medio/i.test(src));
                    vid = vid || allIframeMatches.find(src => /mediofondo/i.test(src) || src.includes('ErPWPbjm7LY'));
                } else if (n.includes('mini') || n.includes('curto')) {
                    img = allImgMatches.find(src => /mini|curt/i.test(src));
                    vid = vid || allIframeMatches.find(src => /minifondo/i.test(src) || src.includes('3ijrLXUeLcQ'));
                }
            }

            // 3. Fallback por índice se houver correspondência na ordem dos links
            img = img || altimetryLinks[index]?.link || null;
            vid = vid || videoLinks[index]?.link || null;

            return { image: img, video: vid };
        };

        // 1. Tentar extrair linhas estruturadas como "- Granfondo: 128.9 km 1800 mt D+"
        const structuredMatches = [...text.matchAll(/(?:[-•*–—\s]*)?([A-Za-zÀ-Úa-zà-ú0-9\s-]+?):\s*([\d.,]+\s*km)\s*([\d.,]+\s*(?:mt|m|metros)?\s*D\+)/gi)];
        if (structuredMatches.length > 0) {
            structuredMatches.forEach((m, idx) => {
                const cleanName = m[1].replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '').replace(/[^a-zA-ZÀ-ÿ0-9]+$/, '').trim();
                const km = m[2].trim();
                const dPlus = m[3].trim();
                const media = findCourseMedia(cleanName, idx);
                courses.push({
                    name: cleanName,
                    km,
                    dPlus,
                    image: media.image,
                    video: media.video,
                    badge: 'Oficial'
                });
            });
            return courses;
        }

        // 2. Se houver altimetryLinks registados na BD (ex: perfis oficiais de Granfondo, Mediofondo, Minifondo)
        if (altimetryLinks.length > 0) {
            altimetryLinks.forEach((l, idx) => {
                const cleanName = (l.label || `Percurso ${idx + 1}`).replace(/^altimetria\s*/i, '').trim();
                const media = findCourseMedia(cleanName, idx);
                courses.push({
                    name: cleanName,
                    km: 'Consultar perfil',
                    dPlus: 'Oficial',
                    image: l.link,
                    video: media.video,
                    badge: 'Oficial'
                });
            });
            return courses;
        }

        // 3. Se houver dados reais de ficheiro GPX medidos na BD
        if (event.gpxData?.totalKm) {
            courses.push({
                name: 'Percurso Oficial GPX',
                km: `${event.gpxData.totalKm} km`,
                dPlus: `+${event.gpxData.elevationGain}m D+`,
                badge: 'Ficheiro Oficial'
            });
            return courses;
        }

        // 4. Sem dados reais de percurso: NÃO inventar nem estimar distâncias/altimetrias fictícias
        return [];
    }, [event]);

    const activeCourse = detectedCourses[selectedCourseIndex] || detectedCourses[0];
    const rawAltimetryImage = activeCourse?.image || realAltimetryImage;
    const activeAltimetryImage = rawAltimetryImage ? (
        rawAltimetryImage.includes('cabreirasolutions.com') || rawAltimetryImage.includes('stopandgo.net')
            ? `/api/image-proxy?url=${encodeURIComponent(rawAltimetryImage)}`
            : rawAltimetryImage
    ) : null;
    const activeVideo = activeCourse?.video;

    // Primary Registration CTA
    const primaryRegLink = links.registrationList[0]?.link || event.link;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
            {/* 1. TOP NAV & BREADCRUMB BAR */}
            <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 truncate">
                        <Link href="/" className="hover:opacity-80 transition-opacity shrink-0 flex items-center mr-1" title="Página Inicial - Cycling Calendar Portugal">
                            <BrandLogo size={30} showText={false} />
                        </Link>
                        <button 
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-900 shrink-0 font-sans"
                        >
                            <ChevronLeft size={16} />
                            <span>Voltar</span>
                        </button>
                        <span className="text-slate-600">/</span>
                        <Link href="/" className="hover:text-emerald-400 transition-colors shrink-0">
                            Calendário
                        </Link>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-300 font-bold uppercase truncate">
                            {event.tag || 'Ciclismo'}
                        </span>
                        <span className="text-slate-600 hidden sm:inline">/</span>
                        <span className="text-slate-400 truncate hidden sm:inline max-w-[200px]">
                            {event.title}
                        </span>
                    </div>

                    {/* Quick Actions Header */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Share */}
                        <button 
                            onClick={handleShare}
                            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                shareCopied 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                            title="Partilhar Prova"
                        >
                            <Share2 size={13} />
                            <span className="hidden sm:inline">{shareCopied ? 'Link Copiado!' : 'Partilhar'}</span>
                        </button>

                        {/* Favorite */}
                        <button 
                            onClick={toggleFavorite}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer ${
                                isFavorited 
                                    ? 'bg-amber-400/15 border-amber-500/40 text-amber-400' 
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                            }`}
                            title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                            <Star size={14} fill={isFavorited ? '#fbbf24' : 'none'} />
                        </button>

                        {/* Calendar Dropdown */}
                        <div className="relative" ref={calMenuRef}>
                            <button 
                                onClick={() => setShowCalMenu(!showCalMenu)}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                            >
                                <Calendar size={13} className="text-emerald-400" />
                                <span className="hidden sm:inline">Calendário</span>
                                <ChevronDown size={12} className={`transition-transform ${showCalMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showCalMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                                        Exportar Evento
                                    </div>
                                    <a 
                                        href={generateGoogleCalendarUrl(event)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setShowCalMenu(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">G</div>
                                        <span>Google Calendar</span>
                                    </a>
                                    <button 
                                        onClick={() => {
                                            downloadIcsFile(event);
                                            setShowCalMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-left"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">iC</div>
                                        <span>Apple / Outlook (.ics)</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Direct Official / Registration Page Button in Header */}
                        {primaryRegLink && (
                            <a 
                                href={primaryRegLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
                            >
                                <span>{links.registrationList.length > 0 ? 'Página de Inscrição' : 'Página da Prova'}</span>
                                <ArrowUpRight size={13} />
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* 2. CINEMATIC HERO SECTION */}
            <section className="relative overflow-hidden bg-slate-950 border-b border-slate-800/80">
                {/* Visual Cover (Real Image or Topographic Grid) */}
                <div className="absolute inset-0 h-96 w-full overflow-hidden pointer-events-none">
                    {event.image ? (
                        <>
                            <img 
                                src={event.image} 
                                alt={event.title} 
                                className="w-full h-full object-cover opacity-25 filter blur-[1px] scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent"></div>
                        </>
                    ) : (
                        <div className="relative w-full h-full">
                            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
                            <svg className="absolute bottom-0 w-full h-48 opacity-20" viewBox="0 0 1200 200" fill="none" preserveAspectRatio="none">
                                <path d="M0 160 C 150 120, 300 190, 450 110 C 600 30, 750 150, 900 80 C 1050 20, 1150 70, 1200 40 L 1200 200 L 0 200 Z" fill="url(#hero-gradient)" />
                                <defs>
                                    <linearGradient id="hero-gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    )}
                </div>

                {/* Hero Content */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        
                        {/* Title & Badges */}
                        <div className="space-y-3.5 max-w-3xl">
                            {/* Badges strip */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                    <Bike size={12} />
                                    {event.tag || 'Ciclismo'}
                                </span>

                                {isChampionship && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                        <Trophy size={12} />
                                        Campeonato Nacional
                                    </span>
                                )}

                                {isCup && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                        <Flag size={12} />
                                        Taça de Portugal
                                    </span>
                                )}

                                {event.source && (
                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                                        Origem: {event.source}
                                    </span>
                                )}

                                {displayLocation && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium text-slate-300 bg-slate-900 border border-slate-800">
                                        <MapPin size={11} className="text-emerald-400" />
                                        {displayLocation}
                                    </span>
                                )}
                            </div>

                            {/* Main Title */}
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                                {event.title}
                            </h1>

                            {/* Fast Meta Info */}
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-300 pt-1">
                                <div className="flex items-center gap-2">
                                    <Calendar size={15} className="text-emerald-400 shrink-0" />
                                    <span className="font-semibold text-white">{event.date}</span>
                                </div>

                                {event.details && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={15} className="text-emerald-400 shrink-0" />
                                        <span>{event.details.split('|')[0].trim()}</span>
                                    </div>
                                )}

                                {countdownDays !== null && (
                                    <div className="flex items-center gap-2 font-mono text-xs">
                                        <Clock size={14} className="text-slate-400 shrink-0" />
                                        {countdownDays > 0 ? (
                                            <span className="text-emerald-400 font-bold">Faltam {countdownDays} dias</span>
                                        ) : countdownDays === 0 ? (
                                            <span className="text-amber-400 font-bold">É hoje!</span>
                                        ) : (
                                            <span className="text-slate-500">Realizada há {Math.abs(countdownDays)} dias</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hero Date Box & Quick Registration */}
                        <div className="flex md:flex-col items-center md:items-end gap-3 self-stretch md:self-auto justify-between md:justify-end">
                            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl backdrop-blur">
                                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center font-mono">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase leading-none">{monthStr}</span>
                                    <span className="text-xl font-black text-white leading-none mt-1">{dayStr}</span>
                                </div>
                                <div className="text-left pr-2">
                                    <span className="block text-[11px] font-mono text-slate-400 uppercase">Data Oficial</span>
                                    <span className="block text-sm font-bold text-white leading-snug">{event.date}</span>
                                    <span className="block text-[11px] text-slate-400">{event.regiao || 'Portugal'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 3. MAIN WORKSPACE (2-COLUMN ARCHITECTURE) */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: MAIN STAGE (2/3) */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Tab Switcher for Section Navigation */}
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
                            {[
                                { id: 'geral', label: 'Visão Geral', icon: Compass },
                                { id: 'percursos', label: 'Percursos & Altimetria', icon: Mountain },
                                ...(hasValidSchedule ? [{ id: 'programa', label: 'Programa & Horários', icon: Clock }] : []),
                                ...(hasDocuments ? [{ id: 'documentos', label: 'Documentos Oficiais', icon: FileText }] : [])
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => scrollToSection(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                            isActive 
                                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                                                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* SECTION: VISÃO GERAL */}
                        <section id="geral" className="space-y-6 scroll-mt-28">
                                
                                {/* Card: Descrição e Apresentação */}
                                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                                            <Bike size={18} className="text-emerald-400" />
                                            Apresentação da Prova
                                        </h2>
                                        {event.organizador && (
                                            <span className="text-xs text-slate-400 font-mono">
                                                Org: <strong className="text-slate-200">{event.organizador}</strong>
                                            </span>
                                        )}
                                    </div>

                                    {cleanDescription ? (
                                        <div 
                                            className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-2 prose-headings:text-white"
                                            dangerouslySetInnerHTML={{ __html: cleanDescription }}
                                        />
                                    ) : (
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            Edição oficial de {event.title}. Esta prova faz parte do calendário oficial de {event.tag || 'Ciclismo'} em Portugal. Consulta abaixo os percursos, os horários de partida e o regulamento oficial aprovado pela organização.
                                        </p>
                                    )}

                                    {/* Highlights metrics strip */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                                            <span className="block text-[10px] font-mono text-slate-400 uppercase">Modalidade</span>
                                            <span className="block text-sm font-bold text-white mt-0.5">{event.tag || 'Ciclismo'}</span>
                                        </div>
                                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                                            <span className="block text-[10px] font-mono text-slate-400 uppercase">Âmbito</span>
                                            <span className="block text-sm font-bold text-white mt-0.5 truncate">{event.ambito || 'Regional / Aberto'}</span>
                                        </div>
                                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                                            <span className="block text-[10px] font-mono text-slate-400 uppercase">Licença</span>
                                            <span className="block text-sm font-bold text-white mt-0.5 truncate">{event.licenca || 'Federados & CPT'}</span>
                                        </div>
                                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                                            <span className="block text-[10px] font-mono text-slate-400 uppercase">Local</span>
                                            <span className="block text-sm font-bold text-white mt-0.5 truncate">{displayLocation}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: Categorias & Escalões Admitidos */}
                                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <Flag size={18} className="text-emerald-400" />
                                        Categorias e Escalões de Competição
                                    </h3>

                                    {event.escaloes && event.escaloes.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {event.escaloes.map((esc, i) => (
                                                <span 
                                                    key={i} 
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-200"
                                                >
                                                    {esc}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">
                                            Escalões oficiais de acordo com as normas da Federação Portuguesa de Ciclismo (Elites, Masters, Sub-23 e Categorias de Promoção / CPT).
                                        </p>
                                    )}
                                </div>

                                {/* Poster Oficial se existir */}
                                {fpcBannerMatch && (
                                    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-3">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <Sparkles size={18} className="text-amber-400" />
                                            Cartaz Oficial da Edição
                                        </h3>
                                        <div 
                                            onClick={() => setFullscreenImage(fpcBannerMatch)}
                                            className="relative rounded-xl overflow-hidden border border-slate-800 cursor-zoom-in group max-h-[420px] bg-slate-950 flex items-center justify-center"
                                        >
                                            <img 
                                                src={fpcBannerMatch} 
                                                referrerPolicy="no-referrer"
                                                alt={`Cartaz ${event.title}`} 
                                                className="max-h-[400px] w-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                            />
                                            <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300 border border-slate-800">
                                                Clica para ampliar
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </section>

                        {/* SECTION: PERCURSOS & ALTIMETRIA */}
                        <section id="percursos" className="space-y-6 scroll-mt-28">
                                
                                {/* Seletor de Percursos / Distâncias se houver mais do que um */}
                                {detectedCourses.length > 1 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                                            <span>Escolhe a distância / percurso:</span>
                                            <span className="text-emerald-400 font-bold">{detectedCourses.length} percursos disponíveis</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1">
                                            {detectedCourses.map((c, i) => {
                                                const isSelected = selectedCourseIndex === i;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedCourseIndex(i)}
                                                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' 
                                                                : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <Mountain size={14} className={isSelected ? 'text-slate-950' : 'text-emerald-400'} />
                                                        <span>{c.name}</span>
                                                        <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-950 text-slate-400'}`}>
                                                            {c.km}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 1. Painel Principal de Altimetria: Gráfico GPX Interativo OU Imagem Real OU Painel Ilustrativo */}
                                {gpxData ? (
                                    <ElevationProfileChart 
                                        gpxData={gpxData} 
                                        gpxUrl={gpxUrl} 
                                        title={activeCourse?.name || event.title} 
                                    />
                                ) : gpxLoading ? (
                                    <div className="min-h-[300px] rounded-3xl bg-slate-900/70 border border-slate-800/80 flex flex-col items-center justify-center gap-3 p-8 text-center">
                                        <Loader2 size={32} className="animate-spin text-emerald-400" />
                                        <p className="text-sm font-bold text-white">A processar ficheiro GPX oficial...</p>
                                        <p className="text-xs text-slate-400 font-mono">A calcular cotas de elevação, distância e desnível acumulado D+</p>
                                    </div>
                                ) : activeAltimetryImage ? (
                                    <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                    Perfil Oficial Publicado
                                                </span>
                                                <h3 className="text-base font-bold text-white">
                                                    Altimetria {activeCourse?.name ? `• ${activeCourse.name}` : ''}
                                                </h3>
                                            </div>
                                            {links.tracksList.length > 0 && (
                                                <a 
                                                    href={`/api/download-track?eventId=${encodeURIComponent(event.id)}&url=${encodeURIComponent(links.tracksList[0].link)}&title=${encodeURIComponent(event.title)}`}
                                                    download={`${(event.title || 'track').toLowerCase().replace(/[^a-z0-9]/g, '_')}.gpx`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0 cursor-pointer"
                                                >
                                                    <Download size={13} />
                                                    <span>Baixar Track GPX</span>
                                                </a>
                                            )}
                                        </div>

                                        <div 
                                            onClick={() => setFullscreenImage(activeAltimetryImage)}
                                            className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 cursor-zoom-in group flex items-center justify-center min-h-[320px]"
                                        >
                                            <img 
                                                key={activeAltimetryImage}
                                                src={activeAltimetryImage} 
                                                referrerPolicy="no-referrer"
                                                alt={`Perfil Altimétrico ${activeCourse?.name || event.title}`} 
                                                className="max-h-[480px] w-auto object-contain group-hover:scale-[1.01] transition-all duration-300 animate-in fade-in"
                                            />
                                            <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur px-3 py-1 rounded-lg text-[11px] font-mono text-slate-300 border border-slate-800">
                                                Clica para ampliar o perfil
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ESTADO FACTUAL: SEM ALTIMETRIA PUBLICADA */
                                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 text-slate-400">
                                                    <Mountain size={20} />
                                                </div>
                                                <div>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700/50">
                                                        Altimetria & Percurso
                                                    </span>
                                                    <h3 className="text-base font-bold text-white mt-1">
                                                        Perfil Oficial a Aguardar Publicação
                                                    </h3>
                                                </div>
                                            </div>

                                            {primaryRegLink && (
                                                <a 
                                                    href={primaryRegLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
                                                >
                                                    <span>Página da Prova</span>
                                                    <ArrowUpRight size={13} />
                                                </a>
                                            )}
                                        </div>

                                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                                            A organização ainda não disponibilizou o perfil altimétrico oficial nem o track GPX desta prova. Os dados detalhados de altimetria e desnível acumulado (D+) serão apresentados aqui assim que constem no regulamento ou guia técnico oficial.
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                <span>Modalidade: <strong className="text-white">{event.tag || 'Ciclismo'}</strong></span>
                                            </div>
                                            {displayLocation && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                                                    <span>Local: <strong className="text-white">{displayLocation}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Vídeo de Reconhecimento 3D se existir */}
                                {activeVideo && (
                                    <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center gap-1.5">
                                                <Play size={11} fill="currentColor" />
                                                Sobrevoo Virtual 3D
                                            </span>
                                            <h3 className="text-base font-bold text-white">
                                                Reconhecimento 3D de Percurso {activeCourse?.name ? `• ${activeCourse.name}` : ''}
                                            </h3>
                                        </div>
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-[480px]">
                                            <iframe 
                                                key={activeVideo}
                                                src={activeVideo} 
                                                title={`Percurso 3D ${activeCourse?.name || event.title}`}
                                                className="w-full h-full border-0 animate-in fade-in"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Cards de Distâncias Oficiais com Seleção Interativa */}
                                {detectedCourses.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {detectedCourses.map((c, i) => {
                                            const isSelected = selectedCourseIndex === i;
                                            return (
                                                <div 
                                                    key={i} 
                                                    onClick={() => setSelectedCourseIndex(i)}
                                                    className={`bg-slate-900/70 border rounded-2xl p-5 space-y-3 cursor-pointer transition-all ${
                                                        isSelected 
                                                            ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/10' 
                                                            : 'border-slate-800/80 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold border ${
                                                            isSelected 
                                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                            {c.badge}
                                                        </span>
                                                        <Mountain size={15} className={isSelected ? 'text-emerald-400' : 'text-slate-500'} />
                                                    </div>
                                                    <h3 className="text-base font-bold text-white">{c.name}</h3>
                                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Extensão</span>
                                                            <strong className="text-white text-sm">{c.km}</strong>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Altimetria</span>
                                                            <strong className="text-emerald-400 text-sm">{c.dPlus}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                        </section>

                        {/* SECTION: PROGRAMA & HORÁRIOS */}
                        {hasValidSchedule && (
                            <section id="programa" className="space-y-6 scroll-mt-28">
                                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-5">
                                    <div>
                                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                                            <Clock size={18} className="text-emerald-400" />
                                            Programa Horário Oficial
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Cronograma com os principais momentos da prova e secretariado
                                        </p>
                                    </div>

                                    {/* Timeline Parser View */}
                                    {parsedSchedule && parsedSchedule.type === 'timeline' ? (
                                        <div className="space-y-6">
                                            {parsedSchedule.days.map((day, dIdx) => (
                                                <div key={dIdx} className="space-y-4">
                                                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
                                                        <Calendar size={13} />
                                                        <span>{day.dayTitle}</span>
                                                    </div>

                                                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                                        {day.activities.map((act, aIdx) => (
                                                            <div key={aIdx} className="relative flex items-start gap-4 group">
                                                                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                                </div>
                                                                <div className="flex-1 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <h4 className="text-xs sm:text-sm font-bold text-white">{act.title}</h4>
                                                                        {act.time && (
                                                                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                                                                                {act.time}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {act.desc && (
                                                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{act.desc}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-2"
                                            dangerouslySetInnerHTML={{ __html: event.programa }}
                                        />
                                    )}
                                </div>
                            </section>
                        )}

                        {/* SECTION: DOWNLOADS & DOCUMENTOS OFICIAIS */}
                        {hasDocuments && (
                            <section id="documentos" className="space-y-6 scroll-mt-28">
                                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                                        <FileText size={18} className="text-emerald-400" />
                                        Documentos & Ficheiros Oficiais
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Regulamento Oficial */}
                                        {links.primaryRules && (
                                            <a 
                                                href={links.primaryRules.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                        Regulamento Oficial da Prova
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Normas técnicas, escalões e segurança (PDF / Link Oficial)</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 mt-2">
                                                        <span>Abrir Regulamento</span>
                                                        <ArrowUpRight size={12} />
                                                    </span>
                                                </div>
                                            </a>
                                        )}

                                        {/* Tracks GPX Oficiais (APENAS se existirem) */}
                                        {links.tracksList.length > 0 && links.tracksList.map((track, i) => (
                                            <a 
                                                key={`track-${i}`}
                                                href={`/api/download-track?eventId=${encodeURIComponent(event.id)}&url=${encodeURIComponent(track.link)}&title=${encodeURIComponent(track.label || event.title)}`}
                                                download={`${(track.label || event.title || 'track').toLowerCase().replace(/[^a-z0-9]/g, '_')}.gpx`}
                                                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-start gap-3 group cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                                                    <Navigation size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                                                        {track.label || `Track GPX ${i + 1}`}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Ficheiro oficial para GPS Garmin, Wahoo e Hammerhead</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 mt-2">
                                                        <Download size={12} />
                                                        <span>Baixar GPX</span>
                                                    </span>
                                                </div>
                                            </a>
                                        ))}

                                        {/* Condições & Cancelamentos */}
                                        {links.conditionsList.length > 0 && links.conditionsList.map((cond, i) => (
                                            <a
                                                key={`cond-${i}`}
                                                href={cond.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                                                        {cond.label || 'Condições & Cancelamentos'}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Termos da organização e política de cancelamento</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 mt-2">
                                                        <span>Consultar Condições</span>
                                                        <ArrowUpRight size={12} />
                                                    </span>
                                                </div>
                                            </a>
                                        ))}

                                        {/* Lista de Inscritos */}
                                        {links.participantsList.length > 0 && links.participantsList.map((part, i) => (
                                            <a
                                                key={`part-${i}`}
                                                href={part.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                                                        {part.label || 'Lista Oficial de Inscritos'}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Consulta de dorsais e atletas confirmados</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400 mt-2">
                                                        <span>Ver Lista de Inscritos</span>
                                                        <ArrowUpRight size={12} />
                                                    </span>
                                                </div>
                                            </a>
                                        ))}

                                        {/* Outros Documentos Oficiais */}
                                        {links.genericDocuments.length > 0 && links.genericDocuments.map((doc, i) => (
                                            <a
                                                key={`doc-${i}`}
                                                href={doc.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                                                        {doc.label || 'Documento Oficial'}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Informação e regulamentação complementar</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 mt-2">
                                                        <span>Abrir Documento</span>
                                                        <ArrowUpRight size={12} />
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Informações Complementares: Prémios & Seguro */}
                        {(cleanPrizes || cleanInsurance) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {cleanPrizes && (
                                    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                                        <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                            <Trophy size={14} />
                                            Prémios e Pódios
                                        </h3>
                                        <div 
                                            className="text-xs text-slate-300 leading-relaxed prose prose-invert"
                                            dangerouslySetInnerHTML={{ __html: cleanPrizes }}
                                        />
                                    </div>
                                )}
                                {cleanInsurance && (
                                    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                                        <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                            <Shield size={14} />
                                            Seguro Desportivo
                                        </h3>
                                        <div 
                                            className="text-xs text-slate-300 leading-relaxed prose prose-invert"
                                            dangerouslySetInnerHTML={{ __html: cleanInsurance }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* RIGHT COLUMN: TECHNICAL SIDEBAR (1/3) */}
                    <aside className="space-y-6">
                        
                        {/* 1. CARTÃO DE INSCRIÇÃO PRIMÁRIA */}
                        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Inscrições
                                </span>
                                {priceBadge && (
                                    <span className="text-xs font-bold text-emerald-400 font-mono px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                                        {priceBadge}
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-lg font-extrabold text-white">Inscrições & Página Oficial</h3>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    O Cycling Calendar divulga o calendário desportivo. As inscrições e informações oficiais decorrem diretamente na página da entidade organizadora.
                                </p>
                            </div>

                            {pricePhases.length > 0 && (
                                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Tabela de Preços</span>
                                    {pricePhases.map((phase, pIdx) => (
                                        <div key={pIdx} className="text-slate-300 text-[11px] leading-relaxed border-b border-slate-900 last:border-0 pb-1 last:pb-0">
                                            {phase}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {primaryRegLink ? (
                                <div className="space-y-2">
                                    <a 
                                        href={primaryRegLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/25"
                                    >
                                        <span>{links.registrationList.length > 0 ? 'Página de Inscrição' : 'Página da Prova'}</span>
                                        <ArrowUpRight size={16} />
                                    </a>

                                    {links.officialSite && links.officialSite.link !== primaryRegLink && (
                                        <a
                                            href={links.officialSite.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                                        >
                                            <span>Site Oficial da Organização</span>
                                            <ArrowUpRight size={13} />
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full py-3 px-4 rounded-xl text-center bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold">
                                    Página da Prova a Disponibilizar Brevemente
                                </div>
                            )}

                            {/* Prazos de inscrição se disponíveis */}
                            {(event.registrationOpensAt || event.registrationClosesAt) && (
                                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-300">
                                    {event.registrationOpensAt && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Abertura:</span>
                                            <span>{new Date(event.registrationOpensAt).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                    )}
                                    {event.registrationClosesAt && (
                                        <div className="flex items-center justify-between text-amber-400 font-bold">
                                            <span>Encerramento:</span>
                                            <span>{new Date(event.registrationClosesAt).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. METEOROLOGIA OFICIAL (OPEN-METEO) */}
                        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-sky-400" />
                                    Previsão Meteorológica
                                </h3>
                                <span className="text-[10px] font-mono text-slate-500">Open-Meteo</span>
                            </div>

                            <WeatherWidget 
                                location={eventTown || event.distrito || 'Portugal'} 
                                distrito={event.distrito} 
                                date={event.sortDate ? new Date(event.sortDate).toISOString().substring(0, 10) : event.date}
                                variant="default"
                            />
                        </div>

                        {/* 3. FICHA TÉCNICA RÁPIDA */}
                        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                                <FileText size={14} className="text-emerald-400" />
                                Ficha Técnica
                            </h3>

                            <dl className="divide-y divide-slate-800/80 text-xs">
                                <div className="py-2.5 flex items-center justify-between">
                                    <dt className="text-slate-400">Modalidade</dt>
                                    <dd className="font-bold text-white">{event.tag || 'Ciclismo'}</dd>
                                </div>
                                <div className="py-2.5 flex items-center justify-between">
                                    <dt className="text-slate-400">Chancela</dt>
                                    <dd className="font-bold text-white">{event.source || 'Oficial'}</dd>
                                </div>
                                <div className="py-2.5 flex items-center justify-between">
                                    <dt className="text-slate-400">Âmbito</dt>
                                    <dd className="font-bold text-slate-200">{event.ambito || 'Nacional'}</dd>
                                </div>
                                <div className="py-2.5 flex items-center justify-between">
                                    <dt className="text-slate-400">Localização</dt>
                                    <dd className="font-bold text-slate-200">{displayLocation}</dd>
                                </div>
                                {event.organizador && (
                                    <div className="py-2.5 flex items-center justify-between">
                                        <dt className="text-slate-400">Organizador</dt>
                                        <dd className="font-bold text-slate-200 max-w-[150px] truncate text-right">{event.organizador}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* 4. LOCALIZAÇÃO & COMO CHEGAR (MAPA) */}
                        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                                    <MapPin size={14} className="text-rose-400" />
                                    Ponto de Concentração
                                </h3>
                                <a 
                                    href={`https://maps.google.com/?q=${encodeURIComponent(displayLocation + ', Portugal')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                                >
                                    <span>Como Chegar</span>
                                    <ArrowUpRight size={11} />
                                </a>
                            </div>

                            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                                <iframe 
                                    className="w-full h-full border-0 [filter:invert(90%)_hue-rotate(180deg)] transition-all duration-300"
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(displayLocation + ', Portugal')}&output=embed`}
                                ></iframe>
                            </div>

                            <span className="block text-[11px] text-slate-400 font-mono">
                                📍 {displayLocation}
                            </span>
                        </div>

                    </aside>

                </div>
            </main>

            {/* 4. MODAL DE ZOOM DE IMAGEM */}
            {fullscreenImage && (
                <div 
                    className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => {
                        setFullscreenImage(null);
                        setIsImageZoomed(false);
                    }}
                >
                    <button 
                        className="fixed top-5 right-5 bg-slate-900 text-white p-2.5 rounded-full border border-slate-700 hover:bg-slate-800 cursor-pointer z-50"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <X size={20} />
                    </button>
                    <img 
                        src={fullscreenImage} 
                        referrerPolicy="no-referrer"
                        alt="Cartaz ou Altimetria" 
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
                    />
                </div>
            )}

            {/* 5. STICKY MOBILE BOTTOM BAR */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 p-3 flex items-center gap-2 z-40 backdrop-blur">
                <button 
                    onClick={toggleFavorite}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        isFavorited ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                    <Star size={18} fill={isFavorited ? '#fbbf24' : 'none'} />
                </button>

                <button 
                    onClick={() => setShowCalMenu(true)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer"
                    title="Adicionar ao Calendário"
                >
                    <Calendar size={18} className="text-emerald-400" />
                </button>

                {primaryRegLink ? (
                    <a 
                        href={primaryRegLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl text-center text-xs font-black bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                        <span>{links.registrationList.length > 0 ? 'Página de Inscrição' : 'Página da Prova'}</span>
                        <ArrowUpRight size={14} />
                    </a>
                ) : (
                    <div className="flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold bg-slate-900 text-slate-400 border border-slate-800">
                        Página a Disponibilizar Brevemente
                    </div>
                )}
            </div>

        </div>
    );
}
