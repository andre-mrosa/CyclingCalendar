"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { SignInButton, Show, UserButton, useUser, useAuth } from '@clerk/nextjs';
import { Home, Trophy, MapPin, Bike, HelpCircle, Settings, Menu, X, Moon, Sun, Flag, Star, Globe, LogIn, CalendarCheck, Shield, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import SettingsPage from '../definicoes/page';
import HelpPage from '../ajuda/page';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import DynamicLogo from './DynamicLogo';
import ClerkPrivacyProfilePage from './ClerkPrivacyProfilePage';

export default function Navigation() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { t, language, setLanguage } = useTranslation();
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminPendingCount, setAdminPendingCount] = useState(0);
    const [dismissedAdminBanner, setDismissedAdminBanner] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) {
            setIsAdmin(false);
            setAdminPendingCount(0);
            return;
        }

        // 1. Verificação instantânea e abrangente no lado do cliente
        const userEmails = [
            user?.primaryEmailAddress?.emailAddress,
            user?.email,
            ...(user?.emailAddresses || []).map(e => typeof e === 'string' ? e : e?.emailAddress),
            ...(user?.externalAccounts || []).map(a => a?.emailAddress)
        ].filter(Boolean).map(e => String(e).toLowerCase().trim());

        const masterList = ['andre.rosa1603@gmail.com', 'andremrosa@gmail.com', 'andre_rosa', 'andrerosa', 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'];
        const isMaster = !!user && (
            masterList.includes(user.id) ||
            userEmails.some(e => masterList.some(m => e === m || e.includes(m) || m.includes(e))) ||
            (user.username && masterList.some(m => user.username.toLowerCase().includes(m)))
        );
        const hasAdminRole = user?.publicMetadata?.role === 'admin';
        const isLocalAdmin = isMaster || hasAdminRole;

        if (isLocalAdmin) {
            setIsAdmin(true);
        }

        const fetchNotifications = async () => {
            try {
                const token = await getToken().catch(() => null);
                const r = await fetch('/api/admin/notifications', {
                    headers: {
                        'Accept': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });
                const notifData = await r.json();
                if (notifData.success && notifData.notifications) {
                    setAdminPendingCount(notifData.notifications.deletionRequests?.count || 0);
                }
            } catch (e) {}
        };

        // 2. Carrega as notificações imediatamente no arranque se for admin
        if (isLocalAdmin) {
            fetchNotifications();
        }

        // 3. Confirmação com o backend
        getToken().then(token => {
            fetch('/api/admin/me', {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.isAdmin) {
                        setIsAdmin(true);
                        fetchNotifications();
                    } else if (!isLocalAdmin) {
                        setIsAdmin(false);
                        setAdminPendingCount(0);
                    }
                })
                .catch(() => {});
        });

        // 4. Polling periódico em segundo plano a cada 15 segundos
        const pollInterval = setInterval(() => {
            if (isLocalAdmin) {
                fetchNotifications();
            }
        }, 15000);

        const handleNotifUpdate = () => fetchNotifications();
        window.addEventListener('admin-notif-update', handleNotifUpdate);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('admin-notif-update', handleNotifUpdate);
        };
    }, [isLoaded, isSignedIn, user, pathname]);

    const isDarkMode = mounted ? theme === 'dark' : true; // Default to dark for SSR to match defaultTheme

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

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
        { href: "/nacionais", label: t('nav_nationals'), keyName: "Nacionais", icon: <Flag size={18} /> },
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
            <Link 
                key={link.href}
                href={link.href} 
                className={`flex items-center gap-1.5 font-bold py-1 border-y-2 border-t-transparent transition-all duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 border-b-blue-600 dark:border-b-blue-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50 border-b-transparent'}`}
            >
                {link.icon}
                {link.label}
            </Link>
        );
    };

    const ThemeToggle = () => (
        <button 
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="relative w-9 h-5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center transition-colors shadow-inner cursor-pointer p-0"
            title={isDarkMode ? "Mudar para Modo Diurno" : "Mudar para Modo Noturno"}
        >
            <div className={`absolute w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${isDarkMode ? 'bg-slate-900 left-[2px]' : 'bg-white left-[18px]'}`}>
                {mounted && (isDarkMode ? <Moon size={10} className="text-slate-300" /> : <Sun size={10} className="text-amber-500" />)}
            </div>
        </button>
    );

    const languages = [
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
    ];

    const currentLangObj = languages.find(l => l.code === language) || languages[0];

    const LanguageDropdown = () => (
        <div className="relative">
            <button 
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
                title="Escolher Idioma / Choose Language"
            >
                <span className="text-sm leading-none">{currentLangObj.flag}</span>
                <span>{currentLangObj.code.toUpperCase()}</span>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangDropdownOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsLangDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fade-in overflow-hidden">
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
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' 
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-sm">{item.flag}</span>
                                        <span>{item.label}</span>
                                    </span>
                                    {isSelected && <span className="text-blue-500 font-bold text-xs">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    const getPageInfo = (path) => {
        if (path === '/') return { label: t('nav_general'), icon: <Home size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/agenda')) return { label: t('nav_agenda'), icon: <CalendarCheck size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/nacionais')) return { label: t('nav_nationals'), icon: <Flag size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/internacionais')) return { label: t('nav_internationals'), icon: <Globe size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/tacas')) return { label: t('nav_cups'), icon: <Trophy size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/regionais')) return { label: t('nav_regionals'), icon: <MapPin size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/lazer')) return { label: t('nav_leisure'), icon: <Bike size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/favoritos')) return { label: t('nav_favorites'), icon: <Star size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/definicoes')) return { label: t('nav_settings'), icon: <Settings size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/ajuda')) return { label: t('nav_help'), icon: <HelpCircle size={17} className="text-blue-500 dark:text-blue-400" /> };
        if (path.startsWith('/admin')) return { label: t('nav_admin'), icon: <Shield size={17} className="text-blue-500 dark:text-blue-400" /> };
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
                        <Link 
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

            <nav className="no-scrollbar flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 text-slate-800 dark:text-slate-50 transition-colors duration-200">
                <div className="flex items-center gap-2.5 md:hidden">
                    <button 
                        className="text-slate-700 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 -ml-1 rounded-lg focus:outline-none" 
                        onClick={() => setIsMobileMenuOpen(true)}
                        title="Menu"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-2">
                        {currentPage.icon}
                        <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                            {currentPage.label}
                        </span>
                    </div>
                </div>

                <Link href="/" className="hidden md:flex items-center mr-6 no-underline group shrink-0" title="Cycling Calendar">
                    <DynamicLogo className="w-8 h-8 rounded-lg shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-transform group-hover:scale-105" />
                </Link>

                <div className="hidden md:flex flex-1 items-center">
                    <div className="flex gap-6 items-center">
                        {links.map(renderLink)}
                    </div>
                    
                    <div className="ml-auto flex gap-3 items-center">
                        <LanguageDropdown />
                        <ThemeToggle />
                        
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <SignInButton mode="modal">
                                <button className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-lg transition-colors font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer">
                                    <LogIn size={16} />
                                    {t('nav_signin')}
                                </button>
                            </SignInButton>
                        </Show>
                        <Show when="signed-in">
                            {isAdmin && (
                                <Link 
                                    href="/admin"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-all shadow-sm !no-underline"
                                    title="Painel de Gestão e Logs"
                                >
                                    <Shield size={14} />
                                    <span>Gestão</span>
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
                                            label="Painel de Gestão"
                                            labelIcon={<Shield size={16} className="mr-2 text-blue-500" />}
                                            href="/admin"
                                        />
                                    )}
                                    <UserButton.Action 
                                        label="Definições"
                                        labelIcon={<Settings size={16} className="mr-2" />}
                                        onClick={() => setIsSettingsModalOpen(true)}
                                    />
                                    <UserButton.Action 
                                        label="Ajuda"
                                        labelIcon={<HelpCircle size={16} className="mr-2" />}
                                        onClick={() => setIsHelpModalOpen(true)}
                                    />
                                </UserButton.MenuItems>

                                <UserButton.UserProfilePage
                                    label="Eliminar Dados"
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
                <div className="ml-auto md:hidden flex items-center gap-2">
                    {isAdmin && (
                        <Link 
                            href="/admin" 
                            className="relative p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center transition-colors !no-underline"
                            title="Painel de Gestão"
                        >
                            <Shield size={16} />
                            {adminPendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                                    {adminPendingCount}
                                </span>
                            )}
                        </Link>
                    )}
                    <ThemeToggle />
                </div>
            </nav>

            {/* Mobile Navigation Drawer */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden text-slate-900 dark:text-slate-50 flex flex-col shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <DynamicLogo className="w-7 h-7 rounded-lg" />
                        <h2 className="text-base text-slate-900 dark:text-slate-50 m-0 font-bold">Cycling Calendar</h2>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="bg-transparent border-none text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-center justify-center transition-colors p-1"
                        title="Fechar menu"
                    >
                        <X size={22} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3.5 pb-10 scrollbar-thin">
                    {links.map(renderLink)}
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3.5">
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <div className="mt-2">
                                <SignInButton mode="modal">
                                    <button className="flex items-center justify-center gap-2 w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)] cursor-pointer">
                                        <LogIn size={18} />
                                        {t('nav_signin')}
                                    </button>
                                </SignInButton>
                            </div>
                        </Show>
                        <Show when="signed-in">
                            <div 
                                className="flex items-center gap-3 py-2 px-1 rounded-xl text-slate-900 dark:text-slate-50 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
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
                                                label="Painel de Gestão"
                                                labelIcon={<Shield size={16} className="mr-2 text-blue-500" />}
                                                href="/admin"
                                            />
                                        )}
                                        <UserButton.Action 
                                            label="Definições"
                                            labelIcon={<Settings size={16} className="mr-2" />}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsSettingsModalOpen(true);
                                            }}
                                        />
                                        <UserButton.Action 
                                            label="Ajuda"
                                            labelIcon={<HelpCircle size={16} className="mr-2" />}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setIsHelpModalOpen(true);
                                            }}
                                        />
                                    </UserButton.MenuItems>

                                    <UserButton.UserProfilePage
                                        label="Eliminar Dados"
                                        url="delete-data"
                                        labelIcon={<RotateCcw size={15} className="text-amber-500" />}
                                    >
                                        <ClerkPrivacyProfilePage />
                                    </UserButton.UserProfilePage>
                                </UserButton>
                                <span className="text-sm font-semibold select-none flex-1">A minha conta</span>
                            </div>

                            {isAdmin && (
                                <Link 
                                    href="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-sm font-bold transition-colors !no-underline"
                                >
                                    <Shield size={16} />
                                    <span>Painel de Gestão</span>
                                </Link>
                            )}
                        </Show>

                        {/* Mobile Drawer Language & Theme Settings */}
                        <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings_lang_title')}</span>
                                <ThemeToggle />
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
                                                    ? 'bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold' 
                                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="text-sm">{item.flag}</span>
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
                        className="bg-slate-50 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                setIsSettingsModalOpen(false);
                                setIsHelpModalOpen(false);
                            }}
                            className="absolute top-4 right-5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 border-none cursor-pointer"
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
