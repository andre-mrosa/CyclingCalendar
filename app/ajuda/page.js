"use client";

import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle } from 'lucide-react';
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
        <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-slate-700 dark:text-slate-300 transition-colors duration-200">
            <header className="mb-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                    <HelpCircle size={28} className="text-blue-500 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Central de Ajuda</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
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
