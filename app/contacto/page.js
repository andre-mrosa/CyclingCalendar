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
        <div className="max-w-[600px] mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-slate-900 backdrop-blur border-white/10 ring-1 text-slate-300 rounded-lg shadow-md overflow-hidden">
                <div className="p-8 border-b border-white/10 flex items-center gap-4 bg-blue-500/5">
                    <div className="bg-blue-500/10 p-4 rounded-full text-blue-500">
                        <Mail size={32} />
                    </div>
                    <div>
                        <h1 className="m-0 text-3xl text-slate-100">Contactos</h1>
                        <p className="mt-1 text-slate-400">
                            Envia-me as tuas sugestões ou reporta um erro.
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleContactSubmit} className="flex flex-col gap-5">
                        {submitStatus === 'success' ? (
                            <div className="p-6 bg-green-500/10 text-green-500 rounded-md text-center border border-green-500/20 text-lg">
                                <strong>Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Nome (Opcional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="O teu nome..." 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            disabled={isSubmitting}
                                            className="bg-slate-950/50 border border-slate-700/80 rounded-lg focus:ring-2 focus:ring-blue-500/50 p-3 outline-none text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">E-mail (Opcional)</label>
                                        <input 
                                            type="email" 
                                            placeholder="O teu e-mail..." 
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            disabled={isSubmitting}
                                            className="bg-slate-950/50 border border-slate-700/80 rounded-lg focus:ring-2 focus:ring-blue-500/50 p-3 outline-none text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Mensagem</label>
                                    <textarea 
                                        placeholder="Escreve aqui a tua mensagem..." 
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                                        disabled={isSubmitting}
                                        rows={5}
                                        className="bg-slate-950/50 border border-slate-700/80 rounded-lg focus:ring-2 focus:ring-blue-500/50 p-3 outline-none text-base resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                
                                {submitStatus === 'error' && (
                                    <span className="text-red-500 text-sm text-center">
                                        Ocorreu um erro ao enviar. Tenta novamente mais tarde.
                                    </span>
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md p-4 font-bold transition-colors text-lg mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
