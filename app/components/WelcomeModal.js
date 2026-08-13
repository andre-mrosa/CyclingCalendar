"use client";
import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [neverShow, setNeverShow] = useState(false);
    
    // Contact form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

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
        // Reset state after close
        setTimeout(() => {
            setSubmitStatus(null);
            setFormData({ name: '', email: '', message: '' });
        }, 300);
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
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
                        Se tiveres alguma sugestão, ideia de melhoria ou quiseres reportar um erro, envia-me uma mensagem através do formulário abaixo:
                    </p>
                    
                    <form onSubmit={handleContactSubmit} style={{ 
                        background: 'var(--card-bg)', 
                        padding: '1.25rem', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--card-border)',
                        marginTop: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        {submitStatus === 'success' ? (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#16a34a',
                                borderRadius: 'var(--radius-sm)',
                                textAlign: 'center',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}>
                                <strong>Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Teu nome (opcional)" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                    <input 
                                        type="email" 
                                        placeholder="Teu e-mail (opcional)" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <textarea 
                                    placeholder="A tua mensagem..." 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={3}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        fontSize: '0.9rem',
                                        resize: 'vertical'
                                    }}
                                />
                                {submitStatus === 'error' && (
                                    <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                                        Ocorreu um erro ao enviar. Tenta novamente mais tarde.
                                    </span>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    style={{
                                        background: 'var(--accent-primary)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 'bold',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        transition: 'var(--transition)',
                                        fontSize: '0.95rem',
                                        opacity: isSubmitting ? 0.7 : 1
                                    }}
                                >
                                    {isSubmitting ? 'A enviar...' : 'Enviar Mensagem'}
                                </button>
                            </>
                        )}
                    </form>
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
