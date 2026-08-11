"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState, useEffect } from 'react';
import { SettingsContext } from '../SettingsContext';

export default function Navigation() {
    const pathname = usePathname();
    const { isDarkMode, toggleTheme } = useContext(SettingsContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const links = [
        { href: "/", label: "🏠 Geral", exact: true },
        { href: "/nacionais", label: "Nacionais", icon: <img src="https://flagcdn.com/w20/pt.png" width="18" height="13" alt="Portugal" style={{ borderRadius: '2px' }} /> },
        { href: "/tacas", label: "🏆 Taças" },
        { href: "/regionais", label: "📍 Regionais" },
        { href: "/lazer", label: "🚴 Lazer" }
    ];
    
    const rightLinks = [
        { href: "/ajuda", label: "🛟 Ajuda" },
        { href: "/definicoes", label: "⚙️ Definições" }
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
                    ☰
                </button>

                <div className="desktop-links">
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {links.map(renderLink)}
                    </div>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <button 
                            onClick={toggleTheme}
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
                                <span style={{ fontSize: '10px', lineHeight: 1 }}>{isDarkMode ? '🌙' : '☀️'}</span>
                            </div>
                        </button>
                        {rightLinks.map(renderLink)}
                    </div>
                </div>
                
                {/* Mobile specific toggle that shows only when menu is closed */}
                <div style={{ marginLeft: 'auto' }} className="mobile-menu-btn">
                    <button 
                        onClick={toggleTheme}
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
                            <span style={{ fontSize: '10px', lineHeight: 1 }}>{isDarkMode ? '🌙' : '☀️'}</span>
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
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {links.map(renderLink)}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '1rem 0' }} />
                    {rightLinks.map(renderLink)}
                </div>
            </div>
        </>
    );
}
