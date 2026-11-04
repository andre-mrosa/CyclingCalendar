import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Activity, Archive, ArrowUpRight, CalendarDays, ClipboardCheck, FileText, LayoutDashboard, Moon, Shield, Sun, Users, ScanLine } from 'lucide-react';
import { Button, Notice, Status } from './ui';
import styles from '../admin.module.css';

export const adminTabs = [
    { id:'stats', label:'Visão geral', icon:LayoutDashboard, description:'O calendário e o trabalho que precisa da tua atenção.' },
    { id:'inventory', label:'Provas', icon:CalendarDays, description:'Pesquisa provas publicadas e consulta os seus dados.' },
    { id:'submissions', label:'Submissões', icon:ClipboardCheck, description:'Revê novas provas e correções enviadas pelos organizadores.' },
    { id:'quality', label:'Qualidade', icon:ScanLine, description:'Cobertura, avisos e qualidade de cada fonte.' },
    { id:'quarantine', label:'Exclusões', icon:Archive, description:'Registos retirados do calendário pelos filtros automáticos.' },
    { id:'operations', label:'Sincronização', icon:Activity, description:'Acompanha a recolha e o resultado de cada fonte.' },
    { id:'users', label:'Utilizadores', icon:Users, description:'Contas, permissões e pedidos de eliminação.' },
    { id:'logs', label:'Registos', icon:FileText, description:'Pesquisa o histórico técnico do sistema.' },
];
export default function AdminDashboardView({ activeTab='stats', navigate, running, pendingDeletions=0, pendingSubmissions=0, dark=false, onToggleTheme, error, onRetry, children, dialog }) {
    const current = adminTabs.find(tab=>tab.id===activeTab) || adminTabs[0];
    const previousTab = useRef(activeTab), heading = useRef(null);
    useEffect(() => {
        if (previousTab.current !== activeTab) {
            window.scrollTo({ top:0, behavior:'instant' });
            heading.current?.focus({ preventScroll:true });
            previousTab.current = activeTab;
        }
    }, [activeTab]);
    return <div className={`${styles.shell} ${styles.dashboard}`}>
        <aside className={styles.sidebar}>
            <Link href="/admin" className={styles.adminBrand}><span className={styles.brandIcon}><Shield size={20}/></span><span>Cycling Calendar<small>Área de gestão</small></span></Link>
            <p className={styles.navLabel}>ESPAÇO DE TRABALHO</p>
            <nav className={styles.desktopNav} aria-label="Secções de administração">{adminTabs.map(tab=>{
                const count=tab.id==='users'?pendingDeletions:tab.id==='submissions'?pendingSubmissions:0;
                return <a key={tab.id} href={`#${tab.id}`} aria-current={activeTab===tab.id?'page':undefined} onClick={event=>{event.preventDefault();navigate(tab.id);}}><tab.icon size={18}/><span>{tab.label}</span>{count>0&&<span className={styles.navBadge}>{count}</span>}</a>;
            })}</nav>
            <div className={styles.sidebarFooter}><Link href="/">Ver calendário <ArrowUpRight size={15}/></Link><button type="button" onClick={onToggleTheme}>{dark?<Sun size={16}/>:<Moon size={16}/>}Usar tema {dark?'claro':'escuro'}</button></div>
        </aside>
        <div className={styles.workspace}>
            <header className={styles.workspaceHeader}><div><span className={styles.eyebrow}>GESTÃO / {current.label}</span><h1 ref={heading} tabIndex={-1}>{current.label}</h1><p>{current.description}</p></div><div className={styles.headerActions}>{running&&<Status value="running"/>}<Link href="/" className={styles.mobileHome} aria-label="Ver calendário"><ArrowUpRight size={20}/></Link><button className={styles.mobileTheme} type="button" onClick={onToggleTheme} aria-label={`Usar tema ${dark?'claro':'escuro'}`}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></div></header>
            <label className={styles.mobileNav}>Secção<select value={activeTab} onChange={event=>navigate(event.target.value)}>{adminTabs.map(tab=><option key={tab.id} value={tab.id}>{tab.label}{tab.id==='submissions'&&pendingSubmissions?` (${pendingSubmissions})`:tab.id==='users'&&pendingDeletions?` (${pendingDeletions})`:''}</option>)}</select></label>
            <main className={styles.workspaceContent} id="admin-content">{error&&<Notice error><span>{error}</span><Button onClick={onRetry}>Tentar novamente</Button></Notice>}<section aria-label={current.label}>{children}</section></main>
        </div>{dialog}
    </div>;
}
