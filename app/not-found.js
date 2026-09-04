import Link from 'next/link';
import { ArrowLeft, RouteOff } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-500 flex items-center justify-center mb-4 shadow-xl">
                <RouteOff size={32} />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-3">
                404 · Cycling Calendar
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Fora do percurso.</h1>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Esta página não existe. O calendário está à tua espera para encontrares a próxima prova.
            </p>
            <Link 
                href="/" 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
                <ArrowLeft size={16} />
                <span>Voltar ao calendário</span>
            </Link>
        </div>
    );
}
