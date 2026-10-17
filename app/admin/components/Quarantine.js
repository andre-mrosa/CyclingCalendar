'use client';

import { useState, useMemo } from 'react';
import { 
    AlertTriangle, 
    Search, 
    ExternalLink, 
    RotateCcw, 
    Trash2, 
    Filter, 
    CheckCircle2, 
    Compass, 
    Footprints, 
    Flag, 
    Mountain, 
    Truck 
} from 'lucide-react';
import { Button, Empty, Panel, RefreshButton, number } from './ui';
import styles from '../admin.module.css';

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

    const filtered = useMemo(() => {
        return events.filter(event => {
            const matchesCategory = categoryFilter === 'ALL' || event.category === categoryFilter;
            const q = search.toLowerCase();
            const matchesSearch = !q || 
                event.title?.toLowerCase().includes(q) ||
                event.details?.toLowerCase().includes(q) ||
                event.reason?.toLowerCase().includes(q) ||
                event.badge?.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [events, categoryFilter, search]);

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={24} />
                        Provas em Quarentena
                    </h2>
                    <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
                        Estas provas foram identificadas pelos scrapers ou pelo filtro de triagem automática como modalidades não-ciclismo 
                        (como Trail Running, Atletismo a pé, Meias Maratonas ou Passeios TT motorizados) e foram retiradas do calendário público para não poluir as buscas dos ciclistas.
                    </p>
                </div>
                <div className="shrink-0">
                    <RefreshButton busy={busy} onClick={refresh} />
                </div>
            </div>

            {/* Explainer Banner */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/70 dark:border-red-900/40 rounded-xl p-4 sm:p-5 flex items-start gap-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-900 dark:text-red-200 space-y-1">
                    <p className="font-semibold">Porque estão estas provas aqui?</p>
                    <p className="text-xs text-red-800 dark:text-red-300/90 leading-relaxed">
                        Plataformas como a <em>Stop & Go</em> alojam inscrições de atletismo e caminhadas além de ciclismo. 
                        O filtro automático guarda-as aqui para que possas rever. Se alguma prova tiver sido excluída por engano (ex: um Granfondo ou Maratona de BTT), podes restaurá-la para o calendário com um só clique.
                    </p>
                </div>
            </div>

            {/* Category Quick Badges */}
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                    const count = cat.id === 'ALL' ? events.length : (categoriesCount[cat.id] || 0);
                    const isSelected = categoryFilter === cat.id;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                isSelected
                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 shadow-sm'
                                    : 'bg-surface text-muted border-line hover:text-ink hover:bg-soft'
                            }`}
                        >
                            <Icon size={14} />
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

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={16} />
                    <input
                        type="text"
                        placeholder="Pesquisar por título, localidade ou motivo da quarentena…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40 text-ink placeholder:text-muted"
                    />
                </div>
            </div>

            {/* Events Table Panel */}
            <Panel
                title={`Lista de Exclusões (${filtered.length})`}
                description={categoryFilter === 'ALL' ? 'Todos os registos em quarentena' : `A filtrar por: ${CATEGORIES.find(c => c.id === categoryFilter)?.label}`}
            >
                {filtered.length === 0 ? (
                    <Empty busy={busy}>
                        {events.length === 0 ? 'Não existem provas em quarentena. O calendário está limpo!' : 'Nenhuma prova encontrada com os filtros atuais.'}
                    </Empty>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-line bg-soft/40 text-xs font-semibold text-muted tracking-wider uppercase">
                                    <th className="px-6 py-3.5">Prova</th>
                                    <th className="px-6 py-3.5">Data Detetada</th>
                                    <th className="px-6 py-3.5">Localidade</th>
                                    <th className="px-6 py-3.5">Motivo da Quarentena</th>
                                    <th className="px-6 py-3.5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {filtered.map(event => (
                                    <tr key={event.id} className="hover:bg-soft/40 transition-colors">
                                        {/* Title + Link */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="font-semibold text-ink flex items-center gap-2">
                                                    {event.title}
                                                    {event.link && (
                                                        <a 
                                                            href={event.link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-muted hover:text-brand transition-colors inline-flex items-center"
                                                            title="Ver página original"
                                                        >
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted font-mono">{event.id}</span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-ink font-medium">
                                            {event.date || 'Sem data'}
                                        </td>

                                        {/* Location */}
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                                            {event.details || event.distrito || event.regiao || 'Portugal'}
                                        </td>

                                        {/* Reason & Badge */}
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeStyle(event.color)}`}>
                                                    {event.badge}
                                                </span>
                                                <span className="text-xs text-muted leading-tight">
                                                    {event.reason}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Action Buttons */}
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    tone="default"
                                                    disabled={actionBusy}
                                                    onClick={() => onRestore(event)}
                                                    className="text-xs py-1 px-2.5 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400"
                                                    title="Mover esta prova para o calendário público de ciclismo"
                                                >
                                                    <RotateCcw size={13} />
                                                    Restaurar
                                                </Button>
                                                <Button
                                                    tone="danger"
                                                    disabled={actionBusy}
                                                    onClick={() => onDelete(event)}
                                                    className="text-xs py-1 px-2.5"
                                                    title="Eliminar permanentemente da base de dados"
                                                >
                                                    <Trash2 size={13} />
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}
