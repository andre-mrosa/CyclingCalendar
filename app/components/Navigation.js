"use client";
import Link from "next/link";
import { useClientReady } from "../hooks/useBrowserState";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { SignInButton, Show, UserButton, useUser, useAuth } from '@clerk/nextjs';
import { Home, Trophy, MapPin, Bike, HelpCircle, Settings, Menu, X, Moon, Sun, Flag, Star, Globe, LogIn, CalendarCheck, Shield, Trash2, RotateCcw, ChevronDown, Award, Check, UserRound, Search } from 'lucide-react';
import SettingsPage from '../definicoes/page';
import HelpPage from '../ajuda/page';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import DynamicLogo from './DynamicLogo';
import ClerkPrivacyProfilePage from './ClerkPrivacyProfilePage';
import FlagIcon from './FlagIcon';
import styles from './site.module.css';
import { useModalFocus } from '../hooks/useModalFocus';

export default function Navigation() {
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();
    const { t, language, setLanguage } = useTranslation();
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [mobileMenuPath, setMobileMenuPath] = useState(null);
    const isMobileMenuOpen = mobileMenuPath === pathname;
    const setIsMobileMenuOpen = useCallback(open => setMobileMenuPath(current => (typeof open === "function" ? open(current === pathname) : open) ? pathname : null), [pathname]);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [adminIdentity, setAdminIdentity] = useState(null);
    const isAdmin = isSignedIn && adminIdentity === user?.id;
    const [adminPendingCount, setAdminPendingCount] = useState(0);
    const [dismissedAdminBanner, setDismissedAdminBanner] = useState(false);
    const mounted = useClientReady();
    const drawerRef = useModalFocus(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
    const pageDialogRef = useModalFocus(isSettingsModalOpen || isHelpModalOpen, () => {
        setIsSettingsModalOpen(false);
        setIsHelpModalOpen(false);
    });

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1181px)');
        const closeOnDesktop = () => { if (desktop.matches) setIsMobileMenuOpen(false); };
        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, [setIsMobileMenuOpen]);


    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        let cancelled = false;
        let authorized = false;
        const fetchNotifications = async () => {
            if (!authorized || cancelled) return;
            try {
                const response = await fetch('/api/admin/notifications');
                const data = await response.json();
                if (!cancelled && response.ok && data.success) setAdminPendingCount(data.notifications?.deletionRequests?.count || 0);
            } catch {}
        };
        const verify = async () => {
            try {
                const token = await getToken();
                const response = await fetch('/api/admin/me', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
                const data = await response.json();
                if (cancelled) return;
                authorized = response.ok && data.success && data.isAdmin;
                setAdminIdentity(authorized ? user.id : null);
                setAdminPendingCount(0);
                if (authorized) await fetchNotifications();
            } catch { if (!cancelled) setAdminIdentity(null); }
        };
        verify();
        const timer = setInterval(fetchNotifications, 15000);
        window.addEventListener('admin-notif-update', fetchNotifications);
        return () => { cancelled = true; clearInterval(timer); window.removeEventListener('admin-notif-update', fetchNotifications); };
    }, [isLoaded, isSignedIn, user?.id, getToken, pathname]);

    const isDarkMode = mounted ? resolvedTheme === 'dark' : true;


    useEffect(() => {
        if (isSettingsModalOpen || isHelpModalOpen || isMobileMenuOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || '';
            };
        }
    }, [isSettingsModalOpen, isHelpModalOpen, isMobileMenuOpen]);

    const { hiddenTabs, tabsOrder } = useSettingsStore();

    const allLinks = [
        { href: "/", label: t('nav_general'), keyName: "Geral", icon: <Home size={18} />, exact: true },
        { href: "/agenda", label: t('nav_agenda'), keyName: "Minha Agenda", icon: <CalendarCheck size={18} /> },
        { href: "/nacionais", label: t('nav_nationals'), keyName: "Nacionais", icon: <Award size={18} /> },
        { href: "/internacionais", label: t('nav_internationals'), keyName: "Internacionais", icon: <Globe size={18} /> },
        { href: "/tacas", label: t('nav_cups'), keyName: "Taças", icon: <Trophy size={18} /> },
        { href: "/regionais", label: t('nav_regionals'), keyName: "Regionais", icon: <MapPin size={18} /> },
        { href: "/lazer", label: t('nav_leisure'), keyName: "Lazer", icon: <Bike size={18} /> },
        { href: "/favoritos", label: t('nav_favorites'), keyName: "Favoritos", icon: <Star size={18} /> }
    ];

    const sortedLinks = [...allLinks].sort((a, b) => {
        const order = tabsOrder || [];
        const indexA = order.indexOf(a.keyName);
        const indexB = order.indexOf(b.keyName);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const links = sortedLinks.filter(link => !hiddenTabs.includes(link.keyName));
    
    const rightLinks = [
        { href: "/ajuda", label: t('nav_help'), icon: <HelpCircle size={18} /> },
        { href: "/definicoes", label: t('nav_settings'), icon: <Settings size={18} /> }
    ];

    const renderLink = (link) => {
        const isActive = link.exact 
            ? pathname === link.href 
            : pathname.startsWith(link.href);

        return (
            <Link prefetch={false}
                key={link.href}
                href={link.href} 
                onClick={event => { setIsMobileMenuOpen(false); event.currentTarget.closest('details')?.removeAttribute('open'); }}
                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                aria-current={isActive ? 'page' : undefined}
            >
                {link.icon}
                {link.href === '/' ? t('ui_explore') : link.label}
            </Link>
        );
    };

    const renderThemeToggle = () => (
        <button 
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className={styles.iconButton}
            title={isDarkMode ? (t('settings_theme_light') || "Mudar para Modo Diurno") : (t('settings_theme_dark') || "Mudar para Modo Noturno")}
        >
            {mounted && (isDarkMode ? <Moon size={17} /> : <Sun size={17} />)}
        </button>
    );

    const languages = [
        { code: 'pt', label: 'Português' },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
    ];

    const currentLangObj = languages.find(l => l.code === language) || languages[0];

    const renderLanguageDropdown = () => (
        <div className="relative">
            <button 
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className={styles.languageButton}
                title="Escolher Idioma / Choose Language"
            >
                <FlagIcon code={currentLangObj.code} />
                <span className="text-[11px] font-bold tracking-wide">{currentLangObj.code.toUpperCase()}</span>
                <ChevronDown size={11} className={`text-slate-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangDropdownOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsLangDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-40 bg-surface rounded-xl shadow-xl border border-line py-1 z-50 animate-fade-in overflow-hidden">
                        {languages.map((item) => {
                            const isSelected = (language || 'pt') === item.code;
                            return (
                                <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => {
                                        setLanguage(item.code);
                                        setIsLangDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                                        isSelected 
                                            ? 'bg-brand-soft text-brand font-bold'
                                            : 'text-ink hover:bg-slate-100 dark:hover:bg-soft'
                                    }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <FlagIcon code={item.code} className="w-4 h-2.5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)] shrink-0 overflow-hidden" />
                                        <span>{item.label}</span>
                                    </span>
                                    {isSelected && <Check size={14} className="text-brand" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    const getPageInfo = (path) => {
        if (path === '/') return { label: t('nav_general'), icon: <Home size={17} className="text-brand" /> };
        if (path.startsWith('/agenda')) return { label: t('nav_agenda'), icon: <CalendarCheck size={17} className="text-brand" /> };
        if (path.startsWith('/nacionais')) return { label: t('nav_nationals'), icon: <Award size={17} className="text-brand" /> };
        if (path.startsWith('/internacionais')) return { label: t('nav_internationals'), icon: <Globe size={17} className="text-brand" /> };
        if (path.startsWith('/tacas')) return { label: t('nav_cups'), icon: <Trophy size={17} className="text-brand" /> };
        if (path.startsWith('/regionais')) return { label: t('nav_regionals'), icon: <MapPin size={17} className="text-brand" /> };
        if (path.startsWith('/lazer')) return { label: t('nav_leisure'), icon: <Bike size={17} className="text-brand" /> };
        if (path.startsWith('/favoritos')) return { label: t('nav_favorites'), icon: <Star size={17} className="text-brand" /> };
        if (path.startsWith('/definicoes')) return { label: t('nav_settings'), icon: <Settings size={17} className="text-brand" /> };
        if (path.startsWith('/ajuda')) return { label: t('nav_help'), icon: <HelpCircle size={17} className="text-brand" /> };
        if (path.startsWith('/admin')) return { label: t('nav_admin'), icon: <Shield size={17} className="text-brand" /> };
        if (path.startsWith('/contacto')) return { label: t('contact_title') };
        if (path.startsWith('/privacidade') || path.startsWith('/privacy-policy')) return { label: t('footer_privacy') };
        if (path.startsWith('/termos') || path.startsWith('/terms-of-service')) return { label: t('footer_terms') };
        return { label: t('nav_calendar'), icon: <DynamicLogo className="w-5 h-5 rounded" /> };
    };

    const currentPage = getPageInfo(pathname);

    return (
        <>
            {/* Top Admin Alert Banner for Pending Requests */}
            {isAdmin && adminPendingCount > 0 && !dismissedAdminBanner && pathname !== '/admin' && (
                <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md relative z-50 animate-fade-in">
                    <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black shrink-0">
                            {adminPendingCount}
                        </span>
                        <span>
                            {adminPendingCount === 1 
                                ? t('admin_alert_single') 
                                : t('admin_alert_plural', { count: adminPendingCount })}
                        </span>
                        <Link prefetch={false}
                            href="/admin" 
                            className="inline-flex items-center gap-1 underline font-black text-slate-950 hover:text-white transition-colors ml-2"
                        >
                            {t('admin_alert_link')}
                        </Link>
                    </div>
                    <button 
                        onClick={() => setDismissedAdminBanner(true)} 
                        className="p-1 hover:bg-black/10 rounded cursor-pointer text-slate-950 hover:text-slate-800 transition-colors"
                        title="Fechar aviso"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <nav className={styles.nav} aria-label={t('nav_calendar')}>
              <div className={styles.navInner}>
                <div className={styles.mobileNav}>
                    <button 
                        className={styles.iconButton}
                        onClick={() => setIsMobileMenuOpen(true)}
                        title="Menu"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="site-mobile-menu"
                    >
                        <Menu size={24} />
                    </button>

                    <Link prefetch={false} href="/" className={styles.brand}><DynamicLogo className="w-8 h-8" /><span><strong>Cycling Calendar</strong><small>{currentPage.label}</small></span></Link>
                </div>

                <Link prefetch={false} href="/" className={styles.brand} title="Cycling Calendar">
                    <DynamicLogo className="w-9 h-9 rounded-xl" />
                    <span><strong>Cycling Calendar</strong></span>
                </Link>

                <div className={styles.desktopNav}>
                    <div className={styles.navLinks}>
                        {links.filter(link => ['/', '/agenda', '/favoritos'].includes(link.href)).map(renderLink)}
                        <details className={styles.moreNav} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.removeAttribute('open'); }} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus(); } }}>
                            <summary>{t('ui_more_races')}<ChevronDown size={14} /></summary>
                            <div>{links.filter(link => !['/', '/agenda', '/favoritos'].includes(link.href)).map(renderLink)}</div>
                        </details>
                    </div>
                    
                    <div className={styles.navActions}>
                        {renderLanguageDropdown()}
                        {renderThemeToggle()}
                        
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <SignInButton mode="modal">
                                <button className={styles.primaryButton}>
                                    <LogIn size={16} />
                                    {t('nav_signin')}
                                </button>
                            </SignInButton>
                        </Show>
                        <Show when="signed-in">
                            {isAdmin && (
                                <Link prefetch={false}
                                    href="/admin"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-soft hover:brightness-95 text-brand border border-brand text-xs font-bold transition-all !no-underline"
                                    title={t('nav_admin')}
                                >
                                    <Shield size={14} />
                                    <span>{t('nav_admin')}</span>
                                    {adminPendingCount > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                                            {adminPendingCount}
                                        </span>
                                    )}
                                </Link>
                            )}
                            <UserButton 
                                appearance={{
                                    elements: {
                                        avatarBox: {
                                            width: '32px',
                                            height: '32px'
                                        },
                                        userPreviewAvatarContainer: {
                                            display: 'none'
                                        }
                                    }
                                }}
                            >
                                <UserButton.MenuItems>
                                    {isAdmin && (
                                        <UserButton.Link 
                                            label={t('nav_admin')}
                                            labelIcon={<Shield size={16} className="mr-2 text-brand" />}
                                            href="/admin"
                                        />
                                    )}
                                    <UserButton.Action 
                                        label={t('nav_settings')}
                                        labelIcon={<Settings size={16} className="mr-2" />}
                                        onClick={() => setIsSettingsModalOpen(true)}
                                    />
                                    <UserButton.Action 
                                        label={t('nav_help')}
                                        labelIcon={<HelpCircle size={16} className="mr-2" />}
                                        onClick={() => setIsHelpModalOpen(true)}
                                    />
                                </UserButton.MenuItems>

                                <UserButton.UserProfilePage
                                    label={t('gdpr_title')}
                                    url="delete-data"
                                    labelIcon={<RotateCcw size={15} className="text-amber-500" />}
                                >
                                    <ClerkPrivacyProfilePage />
                                </UserButton.UserProfilePage>
                            </UserButton>
                        </Show>
                    </div>
                </div>
                
                {/* Mobile specific actions that show only when menu is closed */}
                <div className={styles.mobileActions}>
                    {isAdmin && (
                        <Link prefetch={false}
                            href="/admin" 
                            className="relative p-1.5 rounded-lg bg-brand-soft text-brand border border-brand flex items-center justify-center transition-colors !no-underline"
                            title={t('nav_admin')}
                        >
                            <Shield size={16} />
                            {adminPendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-line shadow-sm animate-pulse">
                                    {adminPendingCount}
                                </span>
                            )}
                        </Link>
                    )}
                    {renderThemeToggle()}
                </div>
              </div>
            </nav>
            <nav className={styles.bottomNav} aria-label={t('ui_mobile_navigation')}>
                {links.filter(link => ['/', '/agenda', '/favoritos'].includes(link.href)).map(link => <Link key={link.href} prefetch={false} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
                    {link.href === '/' ? <Search size={21} /> : link.icon}<span>{link.href === '/' ? t('ui_explore') : link.href === '/agenda' ? t('ui_agenda') : link.label}</span>
                </Link>)}
                <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-expanded={isMobileMenuOpen} aria-controls="site-mobile-menu"><UserRound size={21} /><span>{t('ui_account')}</span></button>
            </nav>

            {/* Mobile Navigation Drawer */}
            <div 
                className={`${styles.drawerBackdrop} ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div id="site-mobile-menu" ref={drawerRef} tabIndex={-1} role="dialog" aria-modal={isMobileMenuOpen || undefined} aria-hidden={!isMobileMenuOpen} aria-label="Menu" inert={!isMobileMenuOpen} className={`${styles.drawer} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-line shrink-0">
                    <div className="flex items-center gap-2.5">
                        <DynamicLogo className="w-7 h-7 rounded-lg" />
                        <h2 className="text-base text-ink m-0 font-bold">Cycling Calendar</h2>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="bg-transparent border-none text-muted hover:text-brand cursor-pointer flex items-center justify-center transition-colors p-1"
                        title={t('action_close')}
                    >
                        <X size={22} />
                    </button>
                </div>
                
                <div className={styles.drawerLinks}>
                    {links.map(renderLink)}
                    <div className={styles.drawerUtilities}>
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <div className="mt-2">
                                <SignInButton mode="modal">
                                    <button className={`${styles.primaryButton} w-full`}>
                                        <LogIn size={18} />
                                        {t('nav_signin')}
                                    </button>
                                </SignInButton>
                            </div>
                        </Show>
                        <Show when="signed-in">
                            <div 
                                className="flex items-center gap-3 py-2 px-1 rounded-xl text-ink font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-soft transition-colors"
                                onClick={(e) => {
                                    const trigger = e.currentTarget.querySelector('button');
                                    if (trigger && !e.target.closest('button')) {
                                        trigger.click();
                                    }
                                }}
                            >
                                <UserButton 
                                    appearance={{
                                        elements: {
                                            avatarBox: {
                                                width: '32px',
                                                height: '32px'
                                            },
                                            userPreviewAvatarContainer: {
                                                display: 'none'
                                            }
                                        }
                                    }}
                                >
                                    <UserButton.MenuItems>
                                        {isAdmin && (
                                            <UserButton.Link 
                                                label={t('nav_admin')}
                                                labelIcon={<Shield size={16} className="mr-2 text-brand" />}
                                                href="/admin"
                                            />
                                        )}
                                        <UserButton.Action 
                                            label={t('nav_settings')}
                                            labelIcon={<Settings size={16} className="mr-2" />}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsSettingsModalOpen(true);
                                            }}
                                        />
                                        <UserButton.Action 
                                            label={t('nav_help')}
                                            labelIcon={<HelpCircle size={16} className="mr-2" />}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsHelpModalOpen(true);
                                            }}
                                        />
                                    </UserButton.MenuItems>

                                    <UserButton.UserProfilePage
                                        label={t('gdpr_title')}
                                        url="delete-data"
                                        labelIcon={<RotateCcw size={15} className="text-amber-500" />}
                                    >
                                        <ClerkPrivacyProfilePage />
                                    </UserButton.UserProfilePage>
                                </UserButton>
                                <span className="text-sm font-semibold select-none flex-1">{t('nav_account')}</span>
                            </div>

                            {isAdmin && (
                                <Link prefetch={false}
                                    href="/admin" 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-brand-soft hover:brightness-95 text-brand border border-brand text-sm font-bold transition-colors !no-underline"
                                >
                                    <Shield size={16} />
                                    <span>{t('nav_admin')}</span>
                                </Link>
                            )}
                        </Show>

                        {/* Mobile Drawer Language & Theme Settings */}
                        <div className="mt-2 pt-3 border-t border-line flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings_lang_title')}</span>
                                {renderThemeToggle()}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {languages.map(item => {
                                    const isSelected = (language || 'pt') === item.code;
                                    return (
                                        <button
                                            key={item.code}
                                            type="button"
                                            onClick={() => setLanguage(item.code)}
                                            className={`flex items-center gap-2 py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-brand-soft text-brand border-brand font-bold'
                                                    : 'bg-soft border-line text-ink'
                                            }`}
                                        >
                                            <FlagIcon code={item.code} className="w-4 h-2.5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)] shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Full Pages inside Modals */}
            {(isSettingsModalOpen || isHelpModalOpen) && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsHelpModalOpen(false);
                    }}
                >
                    <div 
                        className="bg-soft rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-line text-ink transition-colors duration-200"
                        ref={pageDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isSettingsModalOpen ? t('nav_settings') : t('nav_help')}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                setIsSettingsModalOpen(false);
                                setIsHelpModalOpen(false);
                            }}
                            className="absolute top-4 right-5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-soft border-none cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                        
                        <div>
                            {isSettingsModalOpen && <SettingsPage />}
                            {isHelpModalOpen && <HelpPage />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
