"use client";
import { useState, useEffect } from 'react';
import { AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import packageJson from '../../package.json';

export default function WelcomeModal() {
    const appVersion = packageJson.version;
    const [isOpen, setIsOpen] = useState(false);
    const [neverShow, setNeverShow] = useState(false);
    
    // Contact form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    useEffect(() => {
        const hideWelcome = localStorage.getItem(`hideWelcomeModal_v${appVersion}`);
        if (!hideWelcome) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        if (neverShow) {
            localStorage.setItem(`hideWelcomeModal_v${appVersion}`, 'true');
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
                    padding: '2rem 2.5rem 1.5rem 2.5rem',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    background: 'var(--bg-secondary)',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
                        padding: '0.85rem',
                        borderRadius: '50%',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(59, 130, 246, 0.1)'
                    }}>
                        <AlertCircle size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '-0.01em' }}>
                            Bem-vindo ao Calendário Ciclismo
                        </h2>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '600', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                            Versão {appVersion} (Em Desenvolvimento)
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '0.5rem 2.5rem 2rem 2.5rem', color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '1rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                            Olá! Esta plataforma foi criada para facilitar a consulta de todas as provas do calendário de ciclismo.
                        </p>
                        <p style={{ margin: '1rem 0' }}>
                            Ainda nos encontramos em <strong style={{ color: 'var(--text-primary)' }}>fase de desenvolvimento ativo (v{appVersion})</strong>, por isso pedimos a tua paciência caso encontres pequenos bugs ou comportamentos inesperados. 
                        </p>
                        <p style={{ marginBottom: 0, marginTop: '1rem' }}>
                            Se tiveres alguma sugestão, ideia de melhoria ou reportar um erro, contacta-nos:
                        </p>
                    </div>
                    
                    <form onSubmit={handleContactSubmit} style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '1.5rem', 
                        borderRadius: 'var(--radius-lg)', 
                        border: '1px solid var(--card-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
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
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
                                        style={{
                                            padding: '0.85rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                    />
                                    <input 
                                        type="email" 
                                        placeholder="Teu e-mail (opcional)" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
                                        style={{
                                            padding: '0.85rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s ease'
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
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 1px var(--accent-primary)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
                                    style={{
                                        padding: '0.85rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--card-border)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        resize: 'vertical',
                                        transition: 'all 0.2s ease',
                                        minHeight: '100px'
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
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: isSubmitting ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s ease',
                                        marginTop: '0.5rem',
                                        boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
                                        padding: '0.75rem'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isSubmitting) e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                                            A enviar...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Enviar Mensagem
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>

                    {/* Checkbox */}
                    <div style={{ marginTop: '2rem' }}>
                        <label style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.75rem', 
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'color 0.2s ease'
                        }} 
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onClick={() => setNeverShow(!neverShow)}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: `2px solid ${neverShow ? 'var(--accent-primary)' : 'var(--card-border)'}`,
                                background: neverShow ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}>
                                {neverShow && <CheckCircle2 size={14} color="white" strokeWidth={3} />}
                            </div>
                            <span style={{ userSelect: 'none', fontWeight: '500' }}>Não voltar a mostrar este aviso</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem 2.5rem',
                    borderTop: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: 'var(--card-bg)'
                }}>
                    <button 
                        onClick={handleClose}
                        style={{
                            padding: '0.65rem 1.5rem',
                            background: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.35)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
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
