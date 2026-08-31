import Link from 'next/link';
import { Activity, ArrowUpRight, CalendarDays, FileText, LayoutDashboard, Moon, Shield, Sun, Users } from 'lucide-react';
import { Button, Notice, Status } from './ui';
import styles from '../admin.module.css';

export const adminTabs = [
    { id: 'stats', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventário do calendário', icon: CalendarDays },
    { id: 'operations', label: 'Operações', icon: Activity },
    { id: 'users', label: 'Utilizadores', icon: Users },
    { id: 'logs', label: 'Logs', icon: FileText },
];

// Presentation only: no auth, fetches, storage, or side effects. The controller owns all actions.
export default function AdminDashboardView({ activeTab = 'stats', navigate, running, pendingDeletions = 0, dark = false, onToggleTheme, error, onRetry, children, dialog }) {
    const onTabKeyDown = (event, index) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % adminTabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + adminTabs.length) % adminTabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = adminTabs.length - 1;
        else return;
        event.preventDefault();
        navigate(adminTabs[next].id);
        document.getElementById(`admin-tab-${adminTabs[next].id}`)?.focus();
    };
    return <div className={styles.dashboard}>
        <header className={styles.header}>
            <div><div className={styles.brand}><Shield size={16} />Cycling Calendar / Administração</div><h1>Centro de administração</h1><p>Calendário, comunidade e operações num só lugar.</p></div>
            <div className={styles.headerActions}>{running && <Status value="running" />}<Button aria-label="Alternar tema claro e escuro" onClick={onToggleTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />}</Button><Link className={styles.button} href="/">Ver calendário <ArrowUpRight size={15} /></Link></div>
        </header>
        <nav className={styles.tabs} role="tablist" aria-label="Secções de administração">
            {adminTabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`admin-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`admin-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} className={styles.tab} onKeyDown={event => onTabKeyDown(event, index)} onClick={() => navigate(tab.id)}><tab.icon size={16} /><span>{tab.label}</span>{tab.id === 'users' && pendingDeletions > 0 && <span className={styles.tabCount} aria-label={`${pendingDeletions} pedidos de eliminação`}>{pendingDeletions}</span>}</button>)}
        </nav>
        {error && <Notice error><span>{error}</span><Button onClick={onRetry}>Tentar novamente</Button></Notice>}
        <section role="tabpanel" id={`admin-panel-${activeTab}`} aria-labelledby={`admin-tab-${activeTab}`} tabIndex={0}>{children}</section>
        {dialog}
    </div>;
}
