"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import { Home, Trophy, MapPin, Bike, HelpCircle, Settings, Menu, X, Moon, Sun, Flag, Star, Globe, LogIn } from 'lucide-react';
import SettingsPage from '../definicoes/page';
import HelpPage from '../ajuda/page';
import { useSettingsStore } from '../store/useSettingsStore';

export default function Navigation() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    const { hiddenTabs } = useSettingsStore();

    const allLinks = [
        { href: "/", label: "Geral", icon: <Home size={18} />, exact: true },
        { href: "/nacionais", label: "Nacionais", icon: <Flag size={18} /> },
        { href: "/internacionais", label: "Internacionais", icon: <Globe size={18} /> },
        { href: "/tacas", label: "Taças", icon: <Trophy size={18} /> },
        { href: "/regionais", label: "Regionais", icon: <MapPin size={18} /> },
        { href: "/lazer", label: "Lazer", icon: <Bike size={18} /> },
        { href: "/favoritos", label: "Favoritos", icon: <Star size={18} /> }
    ];

    const links = allLinks.filter(link => !hiddenTabs.includes(link.label));
    
    const rightLinks = [
        { href: "/ajuda", label: "Ajuda", icon: <HelpCircle size={18} /> },
        { href: "/definicoes", label: "Definições", icon: <Settings size={18} /> }
    ];

    const renderLink = (link) => {
        const isActive = link.exact 
            ? pathname === link.href 
            : pathname.startsWith(link.href);

        return (
            <Link 
                key={link.href}
                href={link.href} 
                className={`flex items-center gap-1.5 font-bold py-1 border-y-2 border-t-transparent transition-all duration-300 ${isActive ? 'text-blue-400 border-b-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-slate-300 hover:text-slate-50 border-b-transparent'}`}
            >
                {link.icon}
                {link.label}
            </Link>
        );
    };

    const ThemeToggle = () => (
        <button 
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="relative w-9 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center transition-colors shadow-inner cursor-pointer p-0"
            title="Alternar Modo Noturno"
        >
            <div className={`absolute w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${isDarkMode ? 'bg-slate-900 left-[2px]' : 'bg-white left-[18px]'}`}>
                {mounted && (isDarkMode ? <Moon size={10} className="text-slate-300" /> : <Sun size={10} className="text-yellow-500" />)}
            </div>
        </button>
    );

    return (
        <>
            <nav className="no-scrollbar flex items-center px-8 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 text-slate-50">
                <button 
                    className="md:hidden mr-4 text-slate-50 hover:text-blue-400 transition-colors" 
                    onClick={() => setIsMobileMenuOpen(true)}
                    title="Menu"
                >
                    <Menu size={24} />
                </button>

                <Link href="/" className="flex items-center mr-6 no-underline group shrink-0" title="Cycling Calendar">
                    <img src="/icon.jpg" alt="Cycling Calendar" className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30 group-hover:ring-blue-400 transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]" />
                </Link>

                <div className="hidden md:flex flex-1 items-center">
                    <div className="flex gap-6 items-center">
                        {links.map(renderLink)}
                    </div>
                    
                    <div className="ml-auto flex gap-6 items-center">
                        <ThemeToggle />
                        
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <SignInButton mode="modal">
                                <button className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-lg transition-colors font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer">
                                    <LogIn size={16} />
                                    Entrar
                                </button>
                            </SignInButton>
                        </Show>
                        <Show when="signed-in">
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
                            </UserButton>
                        </Show>
                    </div>
                </div>
                
                {/* Mobile specific toggle that shows only when menu is closed */}
                <div className="ml-auto md:hidden flex items-center">
                    <ThemeToggle />
                </div>
            </nav>

            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden text-slate-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center p-6 mb-4">
                    <h2 className="text-lg text-slate-50 m-0 font-bold">Menu</h2>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="bg-transparent border-none text-slate-400 hover:text-blue-400 cursor-pointer flex items-center justify-center transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex flex-col gap-4 px-6">
                    {links.map(renderLink)}
                    <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-4">
                        <Show when="signed-out">
                            {rightLinks.map(renderLink)}
                            <div className="mt-2">
                                <SignInButton mode="modal">
                                    <button className="flex items-center justify-center gap-2 w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)] cursor-pointer">
                                        <LogIn size={18} />
                                        Entrar
                                    </button>
                                </SignInButton>
                            </div>
                        </Show>
                        <Show when="signed-in">
                            <div className="flex items-center gap-2 py-2 text-slate-50 font-medium">
                                <UserButton />
                                <span>A minha conta</span>
                            </div>
                        </Show>
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
                        className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-800 text-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                setIsSettingsModalOpen(false);
                                setIsHelpModalOpen(false);
                            }}
                            className="absolute top-4 right-5 text-slate-400 hover:text-white transition-colors z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-800 border-none cursor-pointer"
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
