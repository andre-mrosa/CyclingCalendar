import Link from 'next/link';
import { Activity, ArrowUpRight, CalendarDays, FileText, LayoutDashboard, Moon, Shield, Sun, Users } from 'lucide-react';
import { Button, Notice, Status } from './ui';

import styles from '../admin.module.css';

export const adminTabs = [
    { id: 'stats', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'inventory', label: 'Gestão do Calendário', icon: CalendarDays },
    { id: 'users', label: 'Comunidade', icon: Users },
    { id: 'operations', label: 'Automação (Scraper)', icon: Activity },
    { id: 'logs', label: 'Registos do Sistema', icon: FileText },
];

export default function AdminDashboardView({ activeTab = 'stats', navigate, running, pendingDeletions = 0, dark = false, onToggleTheme, error, onRetry, children, dialog }) {
    const onTabKeyDown = (event, index) => {
        let next;
        if (event.key === 'ArrowDown') next = (index + 1) % adminTabs.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + adminTabs.length) % adminTabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = adminTabs.length - 1;
        else return;
        event.preventDefault();
        navigate(adminTabs[next].id);
        document.getElementById(`admin-tab-${adminTabs[next].id}`)?.focus();
    };

    return (
        <div className="flex h-screen bg-canvas text-ink overflow-hidden flex-col md:flex-row">
            <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-line bg-surface flex flex-col z-20">
                <div className="p-6 border-b border-line flex items-center justify-between md:block">
                    <div>
                        <div className="flex items-center gap-2 text-brand font-bold text-[11px] tracking-widest uppercase mb-1">
                            <Shield size={16} /> CC Admin
                        </div>
                        <h2 className="text-sm text-muted font-medium hidden md:block">Painel de Controlo</h2>
                    </div>
                    <div className="flex md:hidden items-center gap-2">
                        {running && <Status value="running" />}
                        <button onClick={onToggleTheme} className="p-2 text-muted hover:text-ink">
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </div>
                <nav className="flex-1 overflow-x-auto md:overflow-y-auto p-2 md:p-4 flex flex-row md:flex-col gap-1" role="tablist" aria-label="Secções de administração">
                    {adminTabs.map((tab, index) => (
                        <button 
                            key={tab.id}
                            id={`admin-tab-${tab.id}`}
                            type="button" 
                            role="tab" 
                            aria-selected={activeTab === tab.id}
                            aria-controls={`admin-panel-${tab.id}`}
                            tabIndex={activeTab === tab.id ? 0 : -1}
                            onKeyDown={event => onTabKeyDown(event, index)}
                            onClick={() => navigate(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-brand-soft text-brand shadow-sm' 
                                    : 'text-muted hover:bg-soft hover:text-ink'
                            }`}
                        >
                            <tab.icon size={18} className="flex-shrink-0" />
                            <span>{tab.label}</span>
                            {tab.id === 'users' && pendingDeletions > 0 && (
                                <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 py-0.5 px-2 rounded-full text-xs font-bold border border-red-200 dark:border-red-800" aria-label={`${pendingDeletions} pedidos de eliminação`}>
                                    {pendingDeletions}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-line hidden md:flex flex-col gap-3">
                    <button onClick={onToggleTheme} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface hover:bg-soft transition-colors">
                        {dark ? <Sun size={16} /> : <Moon size={16} />} 
                        Tema {dark ? 'Claro' : 'Escuro'}
                    </button>
                    <Link href="/" className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-muted hover:text-brand transition-colors">
                        Ver calendário <ArrowUpRight size={15} />
                    </Link>
                </div>
            </aside>
            
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
                <header className="px-6 md:px-10 py-8 border-b border-line bg-surface sticky top-0 z-30 hidden md:flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{adminTabs.find(t => t.id === activeTab)?.label}</h1>
                    </div>
                    {running && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-brand-soft text-brand rounded-full text-sm font-medium border border-brand/20 shadow-sm">
                            <Status value="running" /> Sincronização em curso
                        </div>
                    )}
                </header>
                
                <div className={`flex-1 p-6 md:p-10 w-full max-w-7xl mx-auto ${styles.dashboard}`}>
                    {error && (
                        <div className="mb-6">
                            <Notice error>
                                <span className="mr-4">{error}</span>
                                <Button onClick={onRetry}>Tentar novamente</Button>
                            </Notice>
                        </div>
                    )}
                    <section role="tabpanel" id={`admin-panel-${activeTab}`} aria-labelledby={`admin-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
                        {children}
                    </section>
                </div>
                {dialog}
            </main>
        </div>
    );
}
