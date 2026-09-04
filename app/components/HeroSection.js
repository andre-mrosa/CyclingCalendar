"use client";

import { Calendar, Filter, LayoutGrid, List, Search, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { formatMonthAbbr } from '../i18n/formatters';
import FlagIcon from './FlagIcon';

export default function HeroSection({
    onExploreClick,
    onCalendarClick,
    onTodayClick,
    selectedDiscipline,
    onDisciplineSelect,
    onOpenFilters,
    filterCount = 0,
    searchTerm = '',
    onSearchChange,
    onClearSearch,
    viewMode = 'month',
    onViewModeChange,
    upcomingEvents = [],
    onSelectEvent
}) {
    const { t, language } = useTranslation();

    const getEventDisplayDate = (ev) => {
        if (!ev) return { day: '03', month: 'MAI' };
        const rawDate = ev.date || '';
        const monthAbbrs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const parts = rawDate.trim().split(/\s+/);
        const day = parts[0] ? parts[0].replace(/,/g, '') : '01';
        const foundMonth = parts.find(p => monthAbbrs.includes(p.toUpperCase()))?.toUpperCase() || 'MAI';
        return { day: day.padStart(2, '0'), month: formatMonthAbbr(foundMonth, language) };
    };

    const disciplines = [
        { id: 'todos', label: 'Todos' },
        { id: 'Estrada', label: 'Estrada' },
        { id: 'BTT', label: 'BTT' },
        { id: 'Gravel', label: 'Gravel' },
        { id: 'Lazer', label: 'Cicloturismo' }
    ];

    const displayEvents = (upcomingEvents && upcomingEvents.length >= 4) ? upcomingEvents.slice(0, 4) : [
        { id: 'mock-1', title: 'Volta ao Algarve', date: '03 MAI', modalidade: 'Estrada', ambito: 'UCI 2.Pro', distrito: 'Portugal' },
        { id: 'mock-2', title: 'Granfondo Serra da Estrela', date: '10 MAI', modalidade: 'Granfondo', ambito: 'Granfondo', distrito: 'Portugal' },
        { id: 'mock-3', title: 'Maratonas de BTT de Lousada', date: '17 MAI', modalidade: 'BTT', ambito: 'BTT XCM', distrito: 'Portugal' },
        { id: 'mock-4', title: 'Gravel dos Caminhos', date: '24 MAI', modalidade: 'Gravel', ambito: 'Gravel', distrito: 'Portugal' }
    ];

    return (
        <div className="w-full mb-8 text-white">
            {/* Top 2-Column Hero Section (Exact Mockup Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6 sm:py-10">
                {/* Left Column: Headlines & Action Buttons */}
                <div className="lg:col-span-7 flex flex-col justify-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                        Todas as provas.
                        <span className="block text-emerald-500 mt-1">
                            Um só calendário.
                        </span>
                    </h1>

                    <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-400 font-normal max-w-xl leading-relaxed">
                        O calendário de ciclismo mais completo em Portugal. Estrada, BTT, Gravel e muito mais.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button
                            type="button"
                            onClick={onCalendarClick}
                            className="px-7 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                            Ver calendário
                        </button>
                        <button
                            type="button"
                            onClick={onExploreClick}
                            className="px-7 py-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer backdrop-blur-sm"
                        >
                            Explorar provas
                        </button>
                    </div>
                </div>

                {/* Right Column: Cyclists Photograph (Exact Mockup Photo) */}
                <div className="lg:col-span-5 w-full">
                    <div className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 group">
                        <img 
                            src="/hero-banner.jpg" 
                            alt="Pelotão de ciclistas em estrada" 
                            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Floating Filter & View Bar (Unified Modern Controller) */}
            <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl mt-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
                    {/* Hoje button */}
                    <button
                        type="button"
                        onClick={onTodayClick}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
                    >
                        <Calendar size={13} className="text-emerald-400" />
                        <span>Hoje</span>
                    </button>

                    {/* Discipline filter chips */}
                    {disciplines.map(item => {
                        const isSelected = item.id === 'todos' 
                            ? (!selectedDiscipline || selectedDiscipline.length === 0 || selectedDiscipline === 'todos') 
                            : (Array.isArray(selectedDiscipline) ? selectedDiscipline.includes(item.id) : selectedDiscipline === item.id);

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onDisciplineSelect(item.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    isSelected
                                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/25'
                                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/40'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Integrated Search Input */}
                {onSearchChange && (
                    <div className="flex-1 min-w-[180px] max-w-xs relative flex items-center">
                        <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={onSearchChange}
                            placeholder="Pesquisar prova ou local..."
                            className="w-full h-8 pl-8 pr-7 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={onClearSearch}
                                className="absolute right-2 p-0.5 text-slate-400 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* View Switcher & Filtros button */}
                <div className="flex items-center gap-2 px-1">
                    {onViewModeChange && (
                        <div className="flex items-center bg-slate-800/90 border border-slate-700/60 rounded-xl p-0.5">
                            <button
                                type="button"
                                onClick={() => onViewModeChange('month')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'month' 
                                        ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' 
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Vista de Calendário Mensal"
                            >
                                <Calendar size={13} />
                                <span className="hidden sm:inline">Mês</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewModeChange('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'grid' 
                                        ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' 
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Vista de Cartões com Altimetria"
                            >
                                <LayoutGrid size={13} />
                                <span className="hidden sm:inline">Cards</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewModeChange('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'list' 
                                        ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' 
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Vista em Lista"
                            >
                                <List size={13} />
                                <span className="hidden sm:inline">Lista</span>
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onOpenFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
                    >
                        <Filter size={13} />
                        <span>Filtros</span>
                        {filterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                                {filterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* 4 Upcoming Event Cards with Photo Background (Exact Mockup Layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-4">
                {displayEvents.map((event, index) => {
                    const { day, month } = getEventDisplayDate(event);
                    const discipline = event.modalidade || event.tipo || 'Estrada';
                    const scope = event.ambito || '';

                    return (
                        <div
                            key={event.id || index}
                            onClick={() => onSelectEvent && onSelectEvent(event)}
                            className="group relative h-28 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 flex items-center justify-between cursor-pointer shadow-lg hover:border-emerald-500/50 transition-all duration-300"
                        >
                            {/* Background image overlay */}
                            <div className="absolute inset-0 z-0">
                                <img 
                                    src="/hero-banner.jpg" 
                                    alt="" 
                                    className="w-full h-full object-cover object-center opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500 filter brightness-75"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/50" />
                            </div>

                            {/* Card Content */}
                            <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                                <div className="flex flex-col items-center justify-center text-center shrink-0 pr-3 border-r border-slate-800/80">
                                    <span className="text-2xl font-black text-white leading-none group-hover:text-emerald-400 transition-colors">
                                        {day}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                                        {month}
                                    </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                                        {event.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {discipline} {scope ? `· ${scope}` : ''}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                                        <FlagIcon code="pt" className="w-3.5 h-2 rounded-[2px]" />
                                        <span>Portugal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
