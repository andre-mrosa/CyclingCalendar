"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('cookies-accepted');
        if (!accepted) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem('cookies-accepted', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slide-up">
            <div className="max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/40 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Cookie size={20} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0 hidden sm:block" />
                <p className="text-sm text-slate-300 leading-relaxed flex-1">
                    <span className="sm:hidden">🍪 </span>
                    Este site utiliza apenas <strong className="text-slate-200">cookies essenciais</strong> para autenticação e funcionamento. 
                    Não usamos cookies de rastreamento nem publicidade.{' '}
                    <Link href="/privacidade" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Saber mais</Link>
                </p>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <button 
                        onClick={accept}
                        className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Aceitar
                    </button>
                    <button 
                        onClick={accept}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors sm:hidden"
                        title="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
