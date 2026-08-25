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
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                    <Mail size={28} className="text-blue-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Contactos</h1>
                <p className="text-slate-400 text-base sm:text-lg">
                    Tens sugestões de melhoria ou queres reportar um erro? Fala connosco.
                </p>
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl">
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-5">
                    {submitStatus === 'success' ? (
                        <div className="p-6 bg-emerald-500/10 text-emerald-400 rounded-xl text-center border border-emerald-500/20 text-base font-medium">
                            <strong className="font-semibold block mb-1">Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs uppercase tracking-wider font-bold text-slate-400">Nome (Opcional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="O teu nome..." 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        className="bg-slate-950/60 border border-slate-700/80 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-slate-200 placeholder-slate-500 text-sm transition-colors disabled:opacity-50"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs uppercase tracking-wider font-bold text-slate-400">E-mail (Opcional)</label>
                                    <input 
                                        type="email" 
                                        placeholder="O teu e-mail..." 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        className="bg-slate-950/60 border border-slate-700/80 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-slate-200 placeholder-slate-500 text-sm transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs uppercase tracking-wider font-bold text-slate-400">Mensagem</label>
                                <textarea 
                                    placeholder="Escreve aqui a tua mensagem ou sugestão..." 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={5}
                                    className="bg-slate-950/60 border border-slate-700/80 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-slate-200 placeholder-slate-500 text-sm resize-y transition-colors disabled:opacity-50"
                                />
                            </div>
                            
                            {submitStatus === 'error' && (
                                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-center border border-red-500/20 text-sm">
                                    Ocorreu um erro ao enviar. Tenta novamente mais tarde.
                                </div>
                            )}
                            
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 p-4 font-semibold transition-colors text-base mt-2 disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>A enviar...</span>
                                    </>
                                ) : (
                                    'Enviar Mensagem'
                                )}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
