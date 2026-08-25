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

    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || '';
            };
        }
    }, [isOpen]);

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
            className="fixed inset-0 bg-black/75 backdrop-blur z-[99999] flex items-center justify-center p-6"
            onClick={handleClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[550px] shadow-xl relative border border-slate-200 dark:border-white/10 overflow-hidden animate-[fadeIn_0.3s_ease-out] text-slate-900 dark:text-slate-100 transition-colors duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-8 px-8 pb-4 flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h2 className="m-0 text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Bem-vindo ao Calendário Ciclismo
                        </h2>
                        <div className="text-xs text-blue-500 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                            Versão {appVersion} (Em Desenvolvimento)
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 pb-6 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                    <div className="mb-5 space-y-3">
                        <p className="m-0">
                            Olá! Esta plataforma foi criada para facilitar a consulta de todas as provas do calendário de ciclismo em Portugal.
                        </p>
                        <p className="m-0">
                            Ainda nos encontramos em <strong className="text-slate-900 dark:text-slate-100 font-semibold">desenvolvimento ativo (v{appVersion})</strong>. Se encontrares algum erro ou tiveres ideias de melhoria, diz-nos:
                        </p>
                    </div>
                    
                    <form onSubmit={handleContactSubmit} className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3.5">
                        {submitStatus === 'success' ? (
                            <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-center border border-emerald-500/20 text-sm font-medium">
                                <strong className="font-semibold block mb-0.5">Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Teu nome (opcional)" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm transition-colors focus:border-blue-500 disabled:opacity-50"
                                    />
                                    <input 
                                        type="email" 
                                        placeholder="Teu e-mail (opcional)" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm transition-colors focus:border-blue-500 disabled:opacity-50"
                                    />
                                </div>
                                <textarea 
                                    placeholder="A tua mensagem ou sugestão..." 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={3}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm resize-y transition-colors min-h-[80px] focus:border-blue-500 disabled:opacity-50"
                                />
                                {submitStatus === 'error' && (
                                    <span className="text-red-500 dark:text-red-400 text-xs text-center">
                                        Ocorreu um erro ao enviar. Tenta novamente mais tarde.
                                    </span>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            A enviar...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                             Enviar Mensagem
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>

                    {/* Checkbox */}
                    <div className="mt-5">
                        <label 
                            className="inline-flex items-center gap-2.5 cursor-pointer text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-slate-200 text-xs sm:text-sm"
                            onClick={() => setNeverShow(!neverShow)}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${neverShow ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'}`}>
                                {neverShow && <CheckCircle2 size={12} color="white" strokeWidth={3} />}
                            </div>
                            <span className="select-none">Não voltar a mostrar este aviso</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 flex justify-end">
                    <button 
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                        Entendido, continuar
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
