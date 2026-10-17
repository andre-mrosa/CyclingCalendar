'use client';

import { useState, useMemo } from 'react';
import { 
    AlertTriangle, 
    Search, 
    ExternalLink, 
    RotateCcw, 
    Trash2, 
    Filter, 
    Compass, 
    Footprints, 
    Flag, 
    Mountain, 
    Truck,
    ChevronLeft,
    ChevronRight,
    Info
} from 'lucide-react';
import { Button, Empty, Panel, RefreshButton, number } from './ui';

const CATEGORIES = [
    { id: 'ALL', label: 'Todas as categorias', icon: Filter },
    { id: 'trail', label: 'Trail / Montanha', icon: Mountain },
    { id: 'athletics', label: 'Atletismo / Corrida', icon: Footprints },
    { id: 'skyrunning', label: 'Skyrunning', icon: Compass },
    { id: 'ocr', label: 'Obstáculos (OCR)', icon: Flag },
    { id: 'motor', label: 'TT Motorizado', icon: Truck },
    { id: 'other_sport', label: 'Outras modalidades', icon: AlertTriangle },
];

export default function Quarantine({
    events = [],
    categoriesCount = {},
    busy = false,
    refresh,
    onRestore,
    onDelete,
    actionBusy = false,
}) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const filtered = useMemo(() => {
        return events.filter(event => {
            const matchesCategory = categoryFilter === 'ALL' || event.category === categoryFilter;
            const q = search.toLowerCase().trim();
            const matchesSearch = !q || 
                event.title?.toLowerCase().includes(q) ||
                event.details?.toLowerCase().includes(q) ||
                event.reason?.toLowerCase().includes(q) ||
                event.badge?.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [events, categoryFilter, search]);

    const handleSearchChange = (val) => {
        setSearch(val);
        setPage(1);
    };

    const handleCategoryChange = (catId) => {
        setCategoryFilter(catId);
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const getBadgeStyle = (color) => {
        switch (color) {
            case 'orange':
                return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/60';
            case 'blue':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60';
            case 'purple':
                return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60';
            case 'amber':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60';
            case 'red':
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    return (
        <div className="space-y-4">
            {/* Explainer Accordion (Compact & Non-intrusive) */}
            <details className="group bg-surface border border-line rounded-xl text-xs overflow-hidden transition-all">
                <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer font-medium text-muted hover:text-ink hover:bg-soft/40 transition-colors list-none select-none">
                    <div className="flex items-center gap-2">
                        <Info size={15} className="text-amber-500 shrink-0" />
                        <span>Porque estão estas <strong>{events.length} provas</strong> em quarentena?</span>
                    </div>
                    <span className="text-[10px] text-muted group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-3 pt-1 text-muted leading-relaxed border-t border-line/40 bg-soft/20 text-xs">
                    Plataformas como a <em>Stop & Go</em> alojam inscrições de atletismo, trail e caminhadas além de ciclismo. 
                    O filtro automático guarda-as aqui para que o calendário de ciclismo fique limpo. Se alguma prova tiver sido excluída por engano (ex: um Granfondo ou Maratona de BTT), podes restaurá-la para o calendário com um só clique.
                </div>
            </details>

            {/* Category Quick Badges */}
            <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => {
                    const count = cat.id === 'ALL' ? events.length : (categoriesCount[cat.id] || 0);
                    const isSelected = categoryFilter === cat.id;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                isSelected
                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 shadow-sm'
                                    : 'bg-surface text-muted border-line hover:text-ink hover:bg-soft'
                            }`}
                        >
                            <Icon size={13} />
                            <span>{cat.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                isSelected ? 'bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900' : 'bg-soft text-muted'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={15} />
                    <input
                        type="text"
                        placeholder="Pesquisar por título, localidade ou motivo…"
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40 text-ink placeholder:text-muted"
                    />
                </div>
                <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2">
                    <label className="text-xs text-muted flex items-center gap-1.5">
                        <span>Ver:</span>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                            className="bg-surface border border-line rounded-md px-2 py-1 text-xs text-ink focus:outline-none cursor-pointer"
                        >
                            <option value={15}>15 por página</option>
                            <option value={25}>25 por página</option>
                            <option value={50}>50 por página</option>
                            <option value={100}>Todas</option>
                        </select>
                    </label>
                    <RefreshButton busy={busy} onClick={refresh} />
                </div>
            </div>

            {/* Events Panel */}
            <Panel
                title={`Lista de Exclusões (${filtered.length})`}
                description={categoryFilter === 'ALL' ? 'Todos os registos em quarentena' : `A filtrar por: ${CATEGORIES.find(c => c.id === categoryFilter)?.label}`}
            >
                {filtered.length === 0 ? (
                    <Empty busy={busy}>
                        {events.length === 0 ? 'Não existem provas em quarentena. O calendário está limpo!' : 'Nenhuma prova encontrada com os filtros atuais.'}
                    </Empty>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block w-full">
                            <table className="w-full text-left border-collapse text-sm table-fixed">
                                <colgroup>
                                    <col className="w-[36%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[16%]" />
                                    <col className="w-[18%]" />
                                    <col className="w-[16%]" />
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-line bg-soft/40 text-xs font-semibold text-muted tracking-wider uppercase">
                                        <th className="px-4 py-3">Prova</th>
                                        <th className="px-4 py-3">Data Detetada</th>
                                        <th className="px-4 py-3">Localidade</th>
                                        <th className="px-4 py-3">Motivo da Quarentena</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {paginated.map(event => (
                                        <tr key={event.id} className="hover:bg-soft/40 transition-colors">
                                            {/* Prova */}
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex flex-col min-w-0 pr-2">
                                                    <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                                                        <span className="truncate" title={event.title}>{event.title}</span>
                                                        {event.link && (
                                                            <a 
                                                                href={event.link} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-muted hover:text-brand transition-colors shrink-0"
                                                                title="Ver página original"
                                                            >
                                                                <ExternalLink size={13} />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-muted font-mono truncate">{event.id}</span>
                                                </div>
                                            </td>

                                            {/* Data */}
                                            <td className="px-4 py-3 align-middle text-xs text-ink font-medium whitespace-nowrap">
                                                {event.date || 'Sem data'}
                                            </td>

                                            {/* Localidade */}
                                            <td className="px-4 py-3 align-middle text-xs text-muted">
                                                <span className="truncate block" title={event.details || event.distrito || event.regiao || 'Portugal'}>
                                                    {event.details || event.distrito || event.regiao || 'Portugal'}
                                                </span>
                                            </td>

                                            {/* Motivo */}
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span 
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeStyle(event.color)}`}
                                                        title={event.reason}
                                                    >
                                                        {event.badge}
                                                    </span>
                                                    <span className="text-[11px] text-muted truncate max-w-full mt-0.5" title={event.reason}>
                                                        {event.reason}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Ações */}
                                            <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        tone="default"
                                                        disabled={actionBusy}
                                                        onClick={() => onRestore(event)}
                                                        className="text-xs py-1 px-2.5 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400"
                                                        title="Mover esta prova para o calendário público de ciclismo"
                                                    >
                                                        <RotateCcw size={12} />
                                                        Restaurar
                                                    </Button>
                                                    <Button
                                                        tone="danger"
                                                        disabled={actionBusy}
                                                        onClick={() => onDelete(event)}
                                                        className="text-xs py-1 px-2.5"
                                                        title="Eliminar permanentemente da base de dados"
                                                    >
                                                        <Trash2 size={12} />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="md:hidden divide-y divide-line">
                            {paginated.map(event => (
                                <div key={event.id} className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                                                <span className="break-words">{event.title}</span>
                                                {event.link && (
                                                    <a 
                                                        href={event.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-muted hover:text-brand shrink-0"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </a>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted font-mono">{event.id}</span>
                                        </div>
                                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(event.color)}`}>
                                            {event.badge}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                                        <span>📅 <strong className="text-ink font-medium">{event.date || 'Sem data'}</strong></span>
                                        <span>📍 {event.details || event.distrito || 'Portugal'}</span>
                                    </div>

                                    <p className="text-xs text-muted italic bg-soft/30 p-2 rounded border border-line/40">
                                        {event.reason}
                                    </p>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                            tone="default"
                                            disabled={actionBusy}
                                            onClick={() => onRestore(event)}
                                            className="text-xs py-1 px-2.5 flex-1 hover:border-green-500 hover:text-green-600"
                                        >
                                            <RotateCcw size={12} />
                                            Restaurar
                                        </Button>
                                        <Button
                                            tone="danger"
                                            disabled={actionBusy}
                                            onClick={() => onDelete(event)}
                                            className="text-xs py-1 px-2.5 flex-1"
                                        >
                                            <Trash2 size={12} />
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Bar */}
                        {filtered.length > pageSize && (
                            <div className="px-4 sm:px-6 py-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted bg-soft/20">
                                <div>
                                    A mostrar <strong>{(page - 1) * pageSize + 1}</strong> a <strong>{Math.min(page * pageSize, filtered.length)}</strong> de <strong>{number(filtered.length)}</strong> provas
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="py-1 px-2.5 text-xs"
                                    >
                                        <ChevronLeft size={14} />
                                        Anterior
                                    </Button>
                                    <span className="px-2 font-medium text-ink">
                                        Página {page} de {totalPages}
                                    </span>
                                    <Button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="py-1 px-2.5 text-xs"
                                    >
                                        Seguinte
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Panel>
        </div>
    );
}
