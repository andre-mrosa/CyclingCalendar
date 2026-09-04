"use client";

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Search, Calendar, LayoutGrid, List, MapPin, 
  X, ArrowUpRight, Trophy, CalendarDays, Heart, Clock 
} from 'lucide-react';
import EventModal from './components/EventModal';
import BrandLogo from './components/BrandLogo';
import { useFavorites } from './hooks/useFavorites';
import { UserButton, SignInButton } from '@clerk/nextjs';
import { getCuratedDiscipline } from './utils/curatedDisciplines';
import { formatEventLocation } from './utils/eventLocation';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao carregar provas');
  }
  return data.events || [];
};

export default function HomePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('todas');
  const [selectedRegiao, setSelectedRegiao] = useState('todas');
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { favorites, toggleFavorite, isSignedIn } = useFavorites();

  const { data: events, error, isLoading } = useSWR(
    `/api/events?years=${selectedYear}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const getDisciplineCategory = (event) => {
    // 0. Curated Registry (100% verified ground truth for non-standard / ambiguous event names)
    const curated = getCuratedDiscipline(event.title, event.id);
    if (curated) {
      const c = curated.toLowerCase();
      if (c.includes('btt')) return 'btt';
      if (c.includes('estrada')) return 'estrada';
      if (c.includes('gravel')) return 'gravel';
      if (c.includes('granfondo')) return 'granfondo';
      if (c.includes('pista')) return 'pista';
      return c;
    }

    // 0.1 UCI & FPC Official Class Code Prefix System
    // (1.x = Estrada, 2.x = BTT, 3.x = Pista, 4.x = Ciclocrosse, 5.x = BMX, 6.x = Gravel)
    const det = event.details || '';
    const fpcClassPrefix = det.match(/\b([1-6])\.\d{2}/);
    if (fpcClassPrefix) {
      const prefix = fpcClassPrefix[1];
      if (prefix === '1') return 'estrada';
      if (prefix === '2') return 'btt';
      if (prefix === '3' || prefix === '4' || prefix === '5') return 'pista';
      if (prefix === '6') return 'gravel';
    }

    const title = (event.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tag = (event.tag || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const details = det.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const text = `${title} ${tag} ${details}`;

    // 1. GRANFONDO & MEDIOFONDO
    if (/\b(granfondo|gran\s+fondo|mediofondo|minifondo)\b/.test(text)) {
      return 'granfondo';
    }

    // 2. GRAVEL
    if (/\b(gravel|strade)\b/.test(text) && !/\bbtt\b|\bmtb\b/.test(text)) {
      return 'gravel';
    }

    // 3. PISTA, CICLOCROSSE, BMX
    if (/\b(pista|velodromo|ciclocrosse|ciclo[- ]?cross|\bcx\b|bmx|pump\s*track)\b/.test(text)) {
      return 'pista';
    }

    // 4. BTT / MOUNTAIN BIKE (XCO, XCM, DHI, DHU, Downhill, Enduro, Urban Race, Trilhos, Raids, etc.)
    const bttRegex = /\b(btt|mtb|mountain\s*bike|xco|xcm|xce|xcc|xcr|dhi|dhu|downhill|enduro|urban\s*race|resistencia|trilhos?|raid|maratona|meia[- ]maratona|geotour|bike\s*challenge|racenature|race\s*nature|duros|assalto|singletrack|transportugal|iron\s*rider|gps\s*epic)\b/;
    if (bttRegex.test(text)) {
      return 'btt';
    }

    // 5. ESTRADA (Voltas, Clássicas, Circuitos, GPs, Prólogos, CRI, CRE, etc.)
    const estradaRegex = /\b(estrada|road|volta\s*a|volta\s*ao|classica|circuito|grande\s*premio|gp\b|criterium|contra[- ]?relogio|cri\b|cre\b|itt\b|ttt\b|prova\s*de\s*abertura|fundo|linha|trofeu\s*internacional\s*da\s*arrabida)\b/;
    if (estradaRegex.test(text)) {
      return 'estrada';
    }

    // 6. Se tiver tag explícita guardada
    if (tag.includes('btt')) return 'btt';
    if (tag.includes('estrada')) return 'estrada';
    if (tag.includes('gravel')) return 'gravel';

    return 'estrada';
  };

  const getDisciplineBadge = (category) => {
    switch (category) {
      case 'estrada':
        return { label: 'Estrada', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'btt':
        return { label: 'BTT & XCM', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'gravel':
        return { label: 'Gravel', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'granfondo':
        return { label: 'Granfondo', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'federadas':
        return { label: 'Taça / Nacional', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 'pista':
        return { label: 'Pista / Ciclocrosse', bg: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
      default:
        return { label: 'Ciclismo', bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30', stroke: '#64748b' };
    }
  };

  // Visual assets & topography paths for races without photos
  const getDisciplineVisuals = (category) => {
    switch (category) {
      case 'estrada':
        return {
          glow: 'from-sky-500/10 via-slate-900 to-[#0b111e]',
          border: 'border-sky-500/20',
          accent: '#38bdf8',
          bgSvg: (
            <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
              <path d="M0 100 C 60 70, 120 110, 180 60 C 240 20, 270 40, 300 20" stroke="#38bdf8" strokeWidth="2" />
              <path d="M0 115 C 60 85, 120 125, 180 75 C 240 35, 270 55, 300 35" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="260" cy="30" r="18" stroke="#38bdf8" strokeWidth="1" opacity="0.3" />
            </svg>
          )
        };
      case 'btt':
        return {
          glow: 'from-emerald-500/10 via-slate-900 to-[#0b111e]',
          border: 'border-emerald-500/20',
          accent: '#34d399',
          bgSvg: (
            <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
              <path d="M0 120 L 50 70 L 90 95 L 150 40 L 210 80 L 260 30 L 300 70" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
              <path d="M0 120 L 70 85 L 120 105 L 180 65 L 240 90 L 300 50" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
          )
        };
      case 'gravel':
        return {
          glow: 'from-amber-500/10 via-slate-900 to-[#0b111e]',
          border: 'border-amber-500/20',
          accent: '#fbbf24',
          bgSvg: (
            <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
              <path d="M0 90 Q 75 40 150 70 T 300 50" stroke="#fbbf24" strokeWidth="2" />
              <path d="M0 110 Q 75 60 150 90 T 300 70" stroke="#fbbf24" strokeWidth="1.5" />
              <circle cx="240" cy="45" r="2" fill="#fbbf24" />
              <circle cx="255" cy="40" r="2" fill="#fbbf24" />
              <circle cx="270" cy="48" r="2.5" fill="#fbbf24" />
            </svg>
          )
        };
      case 'granfondo':
        return {
          glow: 'from-purple-500/15 via-slate-900 to-[#0b111e]',
          border: 'border-purple-500/25',
          accent: '#c084fc',
          bgSvg: (
            <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
              <path d="M0 120 L 60 80 L 110 100 L 170 30 L 230 75 L 300 20" stroke="#c084fc" strokeWidth="2.5" />
              <circle cx="170" cy="30" r="4" fill="#c084fc" />
            </svg>
          )
        };
      case 'federadas':
        return {
          glow: 'from-rose-500/15 via-slate-900 to-[#0b111e]',
          border: 'border-rose-500/25',
          accent: '#fb7185',
          bgSvg: (
            <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 300 120" fill="none" preserveAspectRatio="none">
              <path d="M20 60 L 150 20 L 280 60 L 150 100 Z" stroke="#fb7185" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="150" cy="60" r="25" stroke="#fb7185" strokeWidth="1.5" />
            </svg>
          )
        };
      default:
        return {
          glow: 'from-teal-500/10 via-slate-900 to-[#0b111e]',
          border: 'border-teal-500/20',
          accent: '#2dd4bf',
          bgSvg: null
        };
    }
  };

  const getWeekdayShort = (sortDate) => {
    if (!sortDate) return '';
    try {
      const d = new Date(sortDate);
      const str = d.toLocaleDateString('pt-PT', { weekday: 'short', timeZone: 'UTC' });
      return str.toUpperCase().replace('.', '');
    } catch {
      return '';
    }
  };

  const isWeekendEvent = (ev) => {
    if (!ev.sortDate) return false;
    const d = new Date(ev.sortDate);
    const day = d.getUTCDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  };

  // Helper to check if event happens on upcoming weekend (next 7 days)
  const isUpcomingWeekend = (ev) => {
    if (!ev.sortDate) return false;
    const evDate = new Date(ev.sortDate);
    const now = new Date();
    const diffDays = (evDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const day = evDate.getUTCDay();
    return diffDays >= -1 && diffDays <= 7 && (day === 0 || day === 6);
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const q = searchTerm.toLowerCase().trim();

    return events.filter(ev => {
      if (q) {
        const matchTitle = (ev.title || '').toLowerCase().includes(q);
        const matchLoc = (ev.distrito || '').toLowerCase().includes(q) || (ev.details || '').toLowerCase().includes(q);
        const matchTag = (ev.tag || '').toLowerCase().includes(q);
        const matchEsc = Array.isArray(ev.escaloes) && ev.escaloes.some(e => String(e).toLowerCase().includes(q));
        if (!matchTitle && !matchLoc && !matchTag && !matchEsc) return false;
      }

      const cat = getDisciplineCategory(ev);
      if (selectedDiscipline !== 'todas') {
        if (selectedDiscipline === 'federadas') {
          const isFed = (ev.ambito || '').toLowerCase().includes('nacional') || 
                        (ev.ambito || '').toLowerCase().includes('taça') || 
                        /campeonato|taça|cn\b/i.test(ev.title || '');
          if (!isFed) return false;
        } else if (cat !== selectedDiscipline) {
          return false;
        }
      }

      if (selectedRegiao !== 'todas') {
        const regiaoText = `${ev.regiao || ''} ${ev.distrito || ''}`.toLowerCase();
        if (selectedRegiao === 'norte' && !/(porto|braga|viana|vila real|bragança|norte)/i.test(regiaoText)) return false;
        if (selectedRegiao === 'centro' && !/(coimbra|aveiro|viseu|guarda|leiria|castelo branco|centro|beira)/i.test(regiaoText)) return false;
        if (selectedRegiao === 'lisboa' && !/(lisboa|setúbal|setubal|santarém|santarem|tejo)/i.test(regiaoText)) return false;
        if (selectedRegiao === 'alentejo' && !/(évora|evora|beja|portalegre|alentejo)/i.test(regiaoText)) return false;
        if (selectedRegiao === 'algarve' && !/(faro|algarve|albufeira|portimão)/i.test(regiaoText)) return false;
        if (selectedRegiao === 'ilhas' && !/(açores|acores|madeira)/i.test(regiaoText)) return false;
      }

      if (weekendOnly && !isWeekendEvent(ev)) {
        return false;
      }

      if (onlyUpcoming && ev.sortDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(ev.sortDate) < today) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchTerm, selectedDiscipline, selectedRegiao, weekendOnly, onlyUpcoming]);

  const featuredEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const now = new Date();
    const upcoming = events.filter(e => e.sortDate && new Date(e.sortDate) >= now);
    
    const withImg = upcoming.find(e => e.image && (e.title.toLowerCase().includes('granfondo') || e.ambito?.includes('Nacional')));
    if (withImg) return withImg;
    
    const anyWithImg = upcoming.find(e => e.image);
    if (anyWithImg) return anyWithImg;

    return upcoming[0] || events[0];
  }, [events]);

  const countdown = useMemo(() => {
    if (!featuredEvent?.sortDate) return { days: 0, hours: 0 };
    const diff = new Date(featuredEvent.sortDate).getTime() - new Date().getTime();
    if (diff <= 0) return { days: 0, hours: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return { days, hours };
  }, [featuredEvent]);

  const eventsByMonth = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(ev => {
      let monthKey = 'Sem Data';
      if (ev.sortDate) {
        const d = new Date(ev.sortDate);
        monthKey = d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
        monthKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
      } else if (ev.date) {
        const parts = ev.date.split(' ');
        if (parts.length >= 2) monthKey = `${parts[1]} ${parts[2] || currentYear}`;
      }
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(ev);
    });
    return groups;
  }, [filteredEvents, currentYear]);

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 bg-[#090d14]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-4">
          
          <div 
            onClick={() => {
              setSearchTerm('');
              setSelectedDiscipline('todas');
              setSelectedRegiao('todas');
              setOnlyUpcoming(false);
              setWeekendOnly(false);
            }} 
            className="cursor-pointer group"
          >
            <BrandLogo size={42} showText={true} />
          </div>

          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar prova, terra, escalão..." 
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button 
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grelha</span>
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mês</span>
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            <div className="hidden sm:block">
              {isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition">
                    Entrar
                  </button>
                </SignInButton>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* UNIFIED FILTER & ACTION BAR */}
      <div className="bg-[#090d14]/90 border-b border-slate-800/80 sticky top-16 z-20 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Disciplines Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none text-xs font-semibold">
            <button 
              onClick={() => setSelectedDiscipline('todas')}
              className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${selectedDiscipline === 'todas' ? 'bg-white text-slate-950 font-bold border-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setSelectedDiscipline('estrada')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${selectedDiscipline === 'estrada' ? 'bg-sky-500 text-slate-950 font-bold border-sky-400' : 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDiscipline === 'estrada' ? 'bg-slate-950' : 'bg-sky-400'}`}></span>
              Estrada
            </button>
            <button 
              onClick={() => setSelectedDiscipline('btt')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${selectedDiscipline === 'btt' ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDiscipline === 'btt' ? 'bg-slate-950' : 'bg-emerald-400'}`}></span>
              BTT
            </button>
            <button 
              onClick={() => setSelectedDiscipline('gravel')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${selectedDiscipline === 'gravel' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDiscipline === 'gravel' ? 'bg-slate-950' : 'bg-amber-400'}`}></span>
              Gravel
            </button>
            <button 
              onClick={() => setSelectedDiscipline('granfondo')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${selectedDiscipline === 'granfondo' ? 'bg-purple-500 text-white font-bold border-purple-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDiscipline === 'granfondo' ? 'bg-white' : 'bg-purple-400'}`}></span>
              Granfondos
            </button>
            <button 
              onClick={() => setSelectedDiscipline('federadas')}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 shrink-0 ${selectedDiscipline === 'federadas' ? 'bg-rose-500 text-white font-bold border-rose-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDiscipline === 'federadas' ? 'bg-white' : 'bg-rose-400'}`}></span>
              Taças & Campeonatos
            </button>
          </div>

          {/* Quick Filters Group */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end text-xs">
            <button
              onClick={() => setOnlyUpcoming(!onlyUpcoming)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition flex items-center gap-1.5 ${
                onlyUpcoming 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{onlyUpcoming ? 'Próximas' : 'Todas'}</span>
            </button>

            <button
              onClick={() => setWeekendOnly(!weekendOnly)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition flex items-center gap-1.5 ${
                weekendOnly 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Sáb & Dom</span>
            </button>

            <select
              value={selectedRegiao}
              onChange={(e) => setSelectedRegiao(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-slate-700"
            >
              <option value="todas">Todas as Regiões</option>
              <option value="norte">Norte</option>
              <option value="centro">Centro</option>
              <option value="lisboa">Lisboa e Vale do Tejo</option>
              <option value="alentejo">Alentejo</option>
              <option value="algarve">Algarve</option>
              <option value="ilhas">Ilhas</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        
        {/* COMPACT SPOTLIGHT (Only shown on cards view and when not actively filtering) */}
        {featuredEvent && viewMode === 'cards' && !searchTerm && selectedDiscipline === 'todas' && selectedRegiao === 'todas' && !weekendOnly && (
          <div 
            onClick={() => router.push(`/events/${encodeURIComponent(featuredEvent.id)}`)}
            className="group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-purple-500/40 transition shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-purple-600/20 border border-purple-500/30 flex flex-col items-center justify-center font-mono shrink-0">
                <span className="text-[10px] font-bold text-purple-300 uppercase leading-none">{featuredEvent.date?.split(' ')[1] || 'DEST'}</span>
                <span className="text-xl font-black text-white leading-tight">{featuredEvent.date?.split(' ')[0] || '01'}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white">
                    {featuredEvent.tag || 'DESTAQUE'}
                  </span>
                  {(featuredEvent.distrito || featuredEvent.details) && (
                    <span className="text-xs text-slate-400 font-medium">
                      📍 {formatEventLocation(featuredEvent)}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {featuredEvent.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {countdown.days > 0 && (
                <span className="text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-800/60 px-3 py-1.5 rounded-xl">
                  Faltam <strong>{countdown.days}d {countdown.hours}h</strong>
                </span>
              )}
              <span className="text-xs font-bold text-slate-300 group-hover:text-white flex items-center gap-1">
                Ver Prova &rarr;
              </span>
            </div>
          </div>
        )}

        {/* RESULTS BAR (Light & Minimal) */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
          <div>
            A mostrar <strong className="text-white font-bold">{filteredEvents.length}</strong> provas
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-500">Ano:</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs font-mono"
            >
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="all">Todos os Anos</option>
            </select>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="h-36 bg-slate-800/60 rounded-xl"></div>
                <div className="h-4 bg-slate-800/60 rounded w-3/4"></div>
                <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-6 text-center text-rose-300 text-xs space-y-2">
            <p className="font-bold">Ocorreu um erro ao carregar as provas da base de dados.</p>
            <p className="text-rose-400/80">{error.message}</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Nenhuma prova encontrada</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Experimenta remover os filtros de pesquisa, mudar de região ou ver todas as modalidades.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedDiscipline('todas'); setSelectedRegiao('todas'); setWeekendOnly(false); }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* VIEW 1: ADAPTIVE CARDS */}
        {!isLoading && !error && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map(ev => {
              const cat = getDisciplineCategory(ev);
              const badge = getDisciplineBadge(cat);
              const visuals = getDisciplineVisuals(cat);
              const hasImage = !!ev.image;
              const dateParts = (ev.date || '').split(' ');
              const dayStr = dateParts[0] || '01';
              const monthStr = dateParts[1] || 'PROV';
              const weekdayStr = getWeekdayShort(ev.sortDate);
              const isFav = favorites.includes(ev.id);
              const isChampionship = (ev.ambito || '').toLowerCase().includes('nacional') || (ev.title || '').toLowerCase().includes('campeonato');
              const isCup = (ev.ambito || '').toLowerCase().includes('taça') || (ev.title || '').toLowerCase().includes('taça');

              return (
                <div 
                  key={ev.id}
                  onClick={() => router.push(`/events/${encodeURIComponent(ev.id)}`)}
                  className="group bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                >
                  <div>
                    {hasImage ? (
                      /* PHOTO HEADER (Rich Events) */
                      <div className="relative h-44 bg-slate-800 overflow-hidden">
                        <img 
                          src={ev.image} 
                          alt={ev.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                        
                        {/* Date Tag with Weekday */}
                        <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-center shadow">
                          {weekdayStr && <span className="block text-[9px] font-extrabold text-emerald-400 uppercase leading-none mb-0.5">{weekdayStr}</span>}
                          <span className="block text-base font-black text-white leading-none">{dayStr}</span>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">{monthStr}</span>
                        </div>

                        {/* Discipline Tag */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          {isChampionship && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow">
                              Nacional
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow backdrop-blur ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* TOPOGRAPHIC ART HEADER (Standard FPC / Regional Events without photos) */
                      <div className={`relative h-28 bg-gradient-to-br ${visuals.glow} border-b border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden`}>
                        {/* Dynamic SVG Elevation Contour Lines */}
                        {visuals.bgSvg}

                        {/* Top row: Date + Discipline + Trophy badge */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="bg-slate-950/95 border border-slate-800 px-3 py-1 rounded-xl font-mono text-xs flex items-center gap-2 shadow-md">
                            {weekdayStr && <span className="text-emerald-400 text-[10px] uppercase font-black">{weekdayStr}</span>}
                            <span className="text-white font-black text-sm">{dayStr}</span>
                            <span className="text-slate-400 text-[10px] uppercase font-bold">{monthStr}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isChampionship ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm flex items-center gap-1">
                                <span>🏆</span> C. Nacional
                              </span>
                            ) : isCup ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Taça PT
                              </span>
                            ) : null}

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Source tag & License chip */}
                        <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: visuals.accent }}></span>
                            {ev.source || 'Federação Portuguesa de Ciclismo'}
                          </span>
                          <span className="font-mono bg-slate-950/90 text-slate-300 px-2 py-0.5 rounded border border-slate-800 text-[9px] font-bold uppercase">
                            {ev.licenca || 'Prova Oficial'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* CARD BODY */}
                    <div className="p-5 space-y-3">
                      <div>
                        {(ev.distrito || ev.details) && (
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{formatEventLocation(ev)}</span>
                            {ev.regiao && <span className="text-slate-500 font-normal">• {ev.regiao}</span>}
                          </span>
                        )}
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {ev.title}
                        </h3>
                      </div>

                      {/* Subtle Details summary if available */}
                      {ev.details && !hasImage && (
                        <p className="text-slate-400 text-xs line-clamp-1 leading-relaxed">
                          {ev.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CARD FOOTER */}
                  <div className="px-5 py-3 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] truncate max-w-[170px] font-medium">
                      {ev.ambito || 'Competição / FPC'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ev.id); }}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                        title="Guardar nos Favoritos"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                      <span className="font-bold text-slate-300 group-hover:text-emerald-400 transition flex items-center gap-1 text-xs">
                        Ver Prova &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: MONTH VIEW */}
        {!isLoading && !error && viewMode === 'calendar' && (
          <div className="space-y-6">
            {Object.entries(eventsByMonth).map(([monthName, monthEvents]) => (
              <div key={monthName} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="font-bold text-white text-sm uppercase tracking-wider">{monthName}</h2>
                  <span className="text-xs text-slate-400 font-mono">{monthEvents.length} provas</span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {monthEvents.map(ev => {
                    const cat = getDisciplineCategory(ev);
                    const badge = getDisciplineBadge(cat);
                    const isWeekend = isWeekendEvent(ev);

                    return (
                      <div 
                        key={ev.id}
                        onClick={() => router.push(`/events/${encodeURIComponent(ev.id)}`)}
                        className={`p-4 hover:bg-slate-800/50 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isWeekend ? 'bg-slate-900/30' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1.5 rounded-xl font-mono text-center border min-w-[70px] ${isWeekend ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                            <span className="block text-[10px] uppercase font-bold text-slate-400">{ev.date?.split(' ')[1] || 'DATA'}</span>
                            <span className="block text-sm font-extrabold">{ev.date?.split(' ')[0] || '--'}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              {formatEventLocation(ev) && (
                                <span className="text-slate-400 text-xs">
                                  📍 {formatEventLocation(ev)}
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm hover:text-emerald-400 transition-colors">
                              {ev.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-slate-400 text-xs">{ev.ambito}</span>
                          <button className="px-3 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white rounded-lg text-xs font-bold transition">
                            Abrir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 3: DENSE TABLE */}
        {!isLoading && !error && viewMode === 'table' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-mono">Data</th>
                    <th className="py-3 px-4">Prova</th>
                    <th className="py-3 px-4">Modalidade</th>
                    <th className="py-3 px-4">Localização</th>
                    <th className="py-3 px-4">Âmbito / Escalões</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(eventsByMonth).map(([monthName, monthEvents]) => (
                    <Fragment key={monthName}>
                      {/* Month Separation Header */}
                      <tr className="bg-slate-950/95 border-y border-slate-800">
                        <td colSpan={6} className="py-2.5 px-4 bg-slate-950/95">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-400 font-mono">
                                {monthName}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 font-semibold bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-800">
                              {monthEvents.length} {monthEvents.length === 1 ? 'prova' : 'provas'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Month Events */}
                      {monthEvents.map(ev => {
                        const cat = getDisciplineCategory(ev);
                        const badge = getDisciplineBadge(cat);
                        const weekdayStr = getWeekdayShort(ev.sortDate);

                        return (
                          <tr 
                            key={ev.id}
                            onClick={() => router.push(`/events/${encodeURIComponent(ev.id)}`)}
                            className="hover:bg-slate-800/50 transition cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {weekdayStr && (
                                  <span className="text-[10px] text-emerald-400 font-extrabold">{weekdayStr}</span>
                                )}
                                <span className="font-bold text-white">{ev.date}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-white max-w-xs truncate group-hover:text-emerald-400 transition-colors">
                              {ev.title}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                              {formatEventLocation(ev) || '--'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                              {ev.ambito} {Array.isArray(ev.escaloes) && ev.escaloes.length > 0 ? `(${ev.escaloes.join(', ')})` : ''}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button className="px-3 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white rounded-lg text-xs font-bold transition">
                                Abrir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      
        {/* FOOTER */}
        <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-800/60 mt-12 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 font-mono">
          <p>© {new Date().getFullYear()} Cycling Calendar. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="/privacy-policy" className="hover:text-emerald-400 transition-colors">Política de Privacidade</a>
            <a href="/terms-of-service" className="hover:text-emerald-400 transition-colors">Termos de Serviço</a>
          </div>
        </footer>
      </main>


      {/* EVENT MODAL */}
      {selectedEvent && (
        <EventModal
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          isSignedIn={isSignedIn}
        />
      )}

    </div>
  );
}

