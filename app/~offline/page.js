import { WifiOff } from 'lucide-react';

export const metadata = {
    title: 'Modo Offline | Cycling Calendar',
};

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-amber-500 flex items-center justify-center mb-4 shadow-xl">
                <WifiOff size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">Estás offline</h1>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Parece que estás sem ligação à internet. Assim que recuperares a ligação, as provas serão sincronizadas automaticamente.
            </p>
        </div>
    );
}
