'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalErrorBoundary({ error, reset }) {
    useEffect(() => {
        try {
            const payload = {
                message: error?.message || 'Erro de renderização na página',
                stack: error?.stack || null,
                source: 'Next.js Error Boundary',
                pathname: typeof window !== 'undefined' ? window.location.pathname : '',
                url: typeof window !== 'undefined' ? window.location.href : '',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
            };

            fetch('/api/log-client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        } catch {}
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
                Ocorreu um problema ao carregar a página
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-6">
                O erro foi registado automaticamente no nosso sistema para ser analisado pela equipa.
            </p>
            <button
                onClick={() => reset()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
                <RotateCcw size={16} />
                <span>Tentar novamente</span>
            </button>
        </div>
    );
}
