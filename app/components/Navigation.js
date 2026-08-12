"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Home, Trophy, MapPin, Bike, HelpCircle, Settings, Menu, X, Moon, Sun, Flag, Star } from 'lucide-react';
import SettingsPage from '../definicoes/page';
import HelpPage from '../ajuda/page';

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

    const links = [
        { href: "/", label: "Geral", icon: <Home size={18} />, exact: true },
        { href: "/nacionais", label: "Nacionais", icon: <Flag size={18} /> },
        { href: "/tacas", label: "Taças", icon: <Trophy size={18} /> },
        { href: "/regionais", label: "Regionais", icon: <MapPin size={18} /> },
        { href: "/lazer", label: "Lazer", icon: <Bike size={18} /> },
        { href: "/favoritos", label: "Favoritos", icon: <Star size={18} /> }
    ];
    
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
                style={{ 
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', 
                    textDecoration: 'none', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    borderTop: '2px solid transparent',
                    borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    paddingTop: '0.2rem',
                    paddingBottom: '0.2rem',
                    transition: 'var(--transition)'
                }}
            >
                {link.icon}
                {link.label}
            </Link>
        );
    };

    return (
        <>
            <nav className="no-scrollbar" style={{
                display: 'flex',
                padding: '1rem 2rem',
                background: 'var(--card-bg)',
                borderBottom: '1px solid var(--card-border)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                alignItems: 'center'
            }}>
                <button 
                    className="mobile-menu-btn" 
                    onClick={() => setIsMobileMenuOpen(true)}
                    title="Menu"
                >
                    <Menu size={24} />
                </button>

                <div className="desktop-links">
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {links.map(renderLink)}
                    </div>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <button 
                            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                            style={{
                                position: 'relative',
                                width: '36px',
                                height: '20px',
                                borderRadius: '20px',
                                background: 'var(--card-border)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isDarkMode ? 'flex-start' : 'flex-end',
                                transition: 'background-color 0.3s ease',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                            }}
                            title="Alternar Modo Noturno"
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: isDarkMode ? '#1e293b' : '#ffffff',
                                position: 'absolute',
                                left: isDarkMode ? '2px' : '18px',
                                transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {mounted && (isDarkMode ? <Moon size={10} color="#cbd5e1" /> : <Sun size={10} color="#eab308" />)}
                                </div>
                            </div>
                        </button>
                        <SignedOut>
                            {rightLinks.map(renderLink)}
                            <SignInButton mode="modal">
                                <button style={{
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.4rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    marginLeft: '1rem'
                                }}>
                                    Entrar
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
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
                                        labelIcon={<Settings size={16} style={{marginRight: '0.5rem'}} />}
                                        onClick={() => setIsSettingsModalOpen(true)}
                                    />
                                    <UserButton.Action 
                                        label="Ajuda"
                                        labelIcon={<HelpCircle size={16} style={{marginRight: '0.5rem'}} />}
                                        onClick={() => setIsHelpModalOpen(true)}
                                    />
                                </UserButton.MenuItems>
                            </UserButton>
                        </SignedIn>
                    </div>
                </div>
                
                {/* Mobile specific toggle that shows only when menu is closed */}
                <div style={{ marginLeft: 'auto' }} className="mobile-menu-btn">
                    <button 
                        onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                        style={{
                            position: 'relative',
                            width: '36px',
                            height: '20px',
                            borderRadius: '20px',
                            background: 'var(--card-border)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isDarkMode ? 'flex-start' : 'flex-end',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: isDarkMode ? '#1e293b' : '#ffffff',
                            position: 'absolute',
                            left: isDarkMode ? '2px' : '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {mounted && (isDarkMode ? <Moon size={10} color="#cbd5e1" /> : <Sun size={10} color="#eab308" />)}
                            </div>
                        </div>
                    </button>
                </div>
            </nav>

            <div 
                className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>Menu</h2>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {links.map(renderLink)}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                        <SignedOut>
                            {rightLinks.map(renderLink)}
                            <div style={{ marginTop: '1rem' }}>
                                <SignInButton mode="modal">
                                    <button style={{
                                        background: 'var(--accent-primary)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        width: '100%',
                                        transition: 'var(--transition)'
                                    }}>
                                        Entrar
                                    </button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                                <UserButton />
                                <span style={{ fontWeight: '500' }}>A minha conta</span>
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </div>

            {/* Custom Full Pages inside Modals */}
            {(isSettingsModalOpen || isHelpModalOpen) && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                    onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsHelpModalOpen(false);
                    }}
                >
                    <div 
                        style={{
                            background: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: 'var(--shadow-lg)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => {
                                setIsSettingsModalOpen(false);
                                setIsHelpModalOpen(false);
                            }}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '1.5rem',
                                width: '36px', height: '36px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                        
                        <div style={{ marginTop: '2rem' }}>
                            {isSettingsModalOpen && <SettingsPage />}
                            {isHelpModalOpen && <HelpPage />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
