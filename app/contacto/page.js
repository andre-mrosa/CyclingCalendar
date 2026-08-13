"use client";
import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function ContactoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

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

    return (
        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '2rem 1rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '2rem',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'rgba(59, 130, 246, 0.05)'
                }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '1rem',
                        borderRadius: '50%',
                        color: 'var(--accent-primary)'
                    }}>
                        <Mail size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>Contactos</h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                            Envia-me as tuas sugestões ou reporta um erro.
                        </p>
                    </div>
                </div>

                <div style={{ padding: '2rem' }}>
                    <form onSubmit={handleContactSubmit} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        {submitStatus === 'success' ? (
                            <div style={{
                                padding: '1.5rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#16a34a',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                fontSize: '1.1rem'
                            }}>
                                <strong>Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>Nome (Opcional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="O teu nome..." 
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
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>E-mail (Opcional)</label>
                                        <input 
                                            type="email" 
                                            placeholder="O teu e-mail..." 
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
                                                fontSize: '1rem'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>Mensagem</label>
                                    <textarea 
                                        placeholder="Escreve aqui a tua mensagem..." 
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                                        disabled={isSubmitting}
                                        rows={5}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--card-border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontSize: '1rem',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                                
                                {submitStatus === 'error' && (
                                    <span style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
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
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 'bold',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        transition: 'var(--transition)',
                                        fontSize: '1.05rem',
                                        marginTop: '0.5rem',
                                        opacity: isSubmitting ? 0.7 : 1
                                    }}
                                >
                                    {isSubmitting ? 'A enviar...' : 'Enviar Mensagem'}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
