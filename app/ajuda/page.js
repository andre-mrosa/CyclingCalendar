"use client";

import { useSettingsStore } from '../store/useSettingsStore';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Ajuda() {
    const { setDefaultRegiao, setDefaultEscalao } = useSettingsStore();

    const handleApply = (type, val) => {
        if (type === 'regiao') {
            setDefaultRegiao(val);
        } else {
            setDefaultEscalao(val);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-slate-900 backdrop-blur border border-white/10 text-slate-300">
            <header className="mb-8 text-center">
                <h1 className="text-4xl mb-2 font-bold text-white">Central de Ajuda</h1>
                <p className="text-lg text-slate-400">
                    Usa os nossos assistentes para descobrir a tua associação ou calcular o teu escalão oficial.
                </p>
            </header>

            <main className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-8 max-w-[1000px] mx-auto">
                <RegionAssistant onApply={(val) => handleApply('regiao', val)} />
                <EscalaoAssistant onApply={(val) => handleApply('escalao', val)} />
            </main>
        </div>
    );
}
