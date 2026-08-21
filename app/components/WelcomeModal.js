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
            className="fixed inset-0 bg-black/75 backdrop-blur z-[99999] flex items-center justify-center p-6"
            onClick={handleClose}
        >
            <div 
                className="bg-slate-900 rounded-2xl w-full max-w-[550px] shadow-xl relative border border-white/10 ring-1 ring-slate-300/10 overflow-hidden animate-[fadeIn_0.3s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-8 px-10 pb-4 flex items-center gap-5">
                    <div className="bg-blue-500/10 p-3 rounded-full text-blue-500 flex items-center justify-center border border-blue-500/10">
                        <AlertCircle size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="m-0 text-[1.4rem] text-slate-100 font-semibold tracking-[-0.01em]">
                            Bem-vindo ao Calendário Ciclismo
                        </h2>
                        <div className="text-[0.85rem] text-blue-500 font-semibold mt-1 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Versão {appVersion} (Em Desenvolvimento)
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-10 pb-8 text-slate-300 leading-[1.65] text-[0.95rem]">
                    <div className="mb-6">
                        <p className="mt-2 mb-4">
                            Olá! Esta plataforma foi criada para facilitar a consulta de todas as provas do calendário de ciclismo.
                        </p>
                        <p className="my-4">
                            Ainda nos encontramos em <strong className="text-slate-100 font-semibold">fase de desenvolvimento ativo (v{appVersion})</strong>, por isso pedimos a tua paciência caso encontres pequenos bugs ou comportamentos inesperados. 
                        </p>
                        <p className="mb-0 mt-4">
                            Se tiveres alguma sugestão, ideia de melhoria ou reportar um erro, contacta-nos:
                        </p>
                    </div>
                    
                    <form onSubmit={handleContactSubmit} className="bg-slate-800/50 p-6 rounded-lg border border-white/5 flex flex-col gap-4">
                        {submitStatus === 'success' ? (
                            <div className="p-4 bg-green-500/10 text-green-500 rounded-md text-center border border-green-500/20">
                                <strong className="font-semibold">Obrigado!</strong> A tua mensagem foi enviada com sucesso.
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Teu nome (opcional)" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        className="flex-1 min-w-[150px] p-[0.85rem] rounded-md border border-white/10 bg-slate-800/80 text-slate-100 outline-none text-[0.95rem] transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <input 
                                        type="email" 
                                        placeholder="Teu e-mail (opcional)" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        className="flex-1 min-w-[150px] p-[0.85rem] rounded-md border border-white/10 bg-slate-800/80 text-slate-100 outline-none text-[0.95rem] transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                </div>
                                <textarea 
                                    placeholder="A tua mensagem..." 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={3}
                                    className="p-[0.85rem] rounded-md border border-white/10 bg-slate-800/80 text-slate-100 outline-none text-[0.95rem] resize-y transition-all duration-200 min-h-[100px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                                {submitStatus === 'error' && (
                                    <span className="text-red-500 text-[0.85rem]">
                                        Ocorreu um erro ao enviar. Tenta novamente mais tarde.
                                    </span>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full text-center py-3.5 px-4 rounded-lg border border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/30 transition-all text-blue-400 font-bold mt-2 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                    <div className="mt-8">
                        <label 
                            className="inline-flex items-center gap-3 cursor-pointer text-slate-400 transition-colors duration-200 hover:text-slate-200"
                            onClick={() => setNeverShow(!neverShow)}
                        >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${neverShow ? 'border-blue-600 bg-blue-600' : 'border-white/10 bg-slate-800'}`}>
                                {neverShow && <CheckCircle2 size={14} color="white" strokeWidth={3} />}
                            </div>
                            <span className="select-none font-medium">Não voltar a mostrar este aviso</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 flex justify-end">
                    <button 
                        onClick={handleClose}
                        className="px-6 py-3 rounded-lg border border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/30 transition-all text-blue-400 font-bold shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center"
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
