"use client";
import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [neverShow, setNeverShow] = useState(false);

    useEffect(() => {
        const hideWelcome = localStorage.getItem('hideWelcomeModal_v0.5');
        if (!hideWelcome) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        if (neverShow) {
            localStorage.setItem('hideWelcomeModal_v0.5', 'true');
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem'
            }}
            onClick={handleClose}
        >
            <div 
                style={{
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-lg)',
                    width: '100%',
                    maxWidth: '550px',
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative',
                    border: '1px solid var(--card-border)',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.3s ease-out'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--card-bg)'
                }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        padding: '0.75rem',
                        borderRadius: '50%',
                        color: 'var(--accent-primary)'
                    }}>
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                            Bem-vindo ao Calendário Ciclismo
                        </h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                            Versão 0.5 (Em Desenvolvimento)
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem' }}>
                    <p style={{ marginTop: 0 }}>
                        Olá! Esta plataforma foi criada para facilitar a consulta de todas as provas do calendário de ciclismo.
                    </p>
                    <p>
                        Ainda nos encontramos em <strong>fase de desenvolvimento ativo (v0.5)</strong>, por isso pedimos a tua paciência caso encontres pequenos bugs ou comportamentos inesperados. 
                    </p>
                    <p>
                        Se tiveres alguma sugestão, ideia de melhoria ou quiseres reportar um erro, envia-me um e-mail para:
                    </p>
                    <div style={{ 
                        background: 'var(--card-bg)', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--card-border)',
                        textAlign: 'center',
                        margin: '1.5rem 0'
                    }}>
                        <a 
                            href="mailto:andre.rosa1603@gmail.com" 
                            style={{ 
                                color: 'var(--accent-primary)', 
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                fontSize: '1.1rem'
                            }}
                        >
                            andre.rosa1603@gmail.com
                        </a>
                    </div>
                    
                    {/* Checkbox */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        marginTop: '2rem',
                        cursor: 'pointer',
                        padding: '0.5rem 0'
                    }} onClick={() => setNeverShow(!neverShow)}>
                        <input 
                            type="checkbox" 
                            checked={neverShow}
                            onChange={() => setNeverShow(!neverShow)}
                            style={{ 
                                width: '18px', 
                                height: '18px', 
                                cursor: 'pointer',
                                accentColor: 'var(--accent-primary)'
                            }}
                        />
                        <label style={{ cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none' }}>
                            Não voltar a mostrar este aviso
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderTop: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button 
                        onClick={handleClose}
                        style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 2rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            fontSize: '1rem'
                        }}
                    >
                        Entendido, continuar!
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
