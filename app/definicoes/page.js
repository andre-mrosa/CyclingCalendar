"use client";

import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle, GripVertical, Settings } from 'lucide-react';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Conta() {
    const { 
        defaultEscalao, setDefaultEscalao,
        defaultRegiao, setDefaultRegiao,
        selectedSources, toggleSource, reorderSources,
        hiddenTabs, toggleHiddenTab
    } = useSettingsStore();

    const [activeModal, setActiveModal] = useState(null);

    return (
        <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <header className="mb-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                    <Settings size={28} className="text-blue-500 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Definições</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
                    Personaliza a tua experiência no Calendário Ciclismo.
                </p>
            </header>

            <main className="flex flex-col gap-6">
                <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center mb-1 text-base">
                                Região Predefinida
                                <button onClick={() => setActiveModal('regiao')} className="ml-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors" title="Assistente de Região"><HelpCircle size={16} /></button>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Filtra automaticamente o calendário pela tua associação regional.</p>
                        </div>
                        <select className="h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors w-full md:w-auto" value={defaultRegiao} onChange={(e) => setDefaultRegiao(e.target.value)}>
                            <option value="Todas">Nenhuma (Todas)</option>
                            <option value="AC Minho">AC Minho</option>
                            <option value="AC Porto">AC Porto</option>
                            <option value="AC Vila Real">AC Vila Real</option>
                            <option value="AC Beira Litoral">AC Beira Litoral</option>
                            <option value="AC Beira Alta">AC Beira Alta</option>
                            <option value="AC Beira Interior">AC Beira Interior</option>
                            <option value="AC Santarém">AC Santarém</option>
                            <option value="AC Setúbal">AC Setúbal</option>
                            <option value="AC Algarve">AC Algarve</option>
                            <option value="AC Madeira">AC Madeira</option>
                            <option value="AC Açores">AC Açores</option>
                        </select>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between pt-6 gap-4">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center mb-1 text-base">
                                Escalão Predefinido
                                <button onClick={() => setActiveModal('escalao')} className="ml-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors" title="Assistente de Escalão"><HelpCircle size={16} /></button>
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Mostra as provas mais adequadas à tua categoria ao abrir a página.</p>
                        </div>
                        <select className="h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors w-full md:w-auto" value={defaultEscalao} onChange={(e) => setDefaultEscalao(e.target.value)}>
                            <option value="Todos">Nenhum (Todos)</option>
                            <option value="Elite Amador / Individual">Elite Amador / Individual</option>
                            <option value="Elite / Sub-23">Elite / Sub-23</option>
                            <option value="Sub-23">Sub-23</option>
                            <option value="Sub-19 (Juniores)">Sub-19 (Juniores)</option>
                            <option value="Sub-17 (Cadetes)">Sub-17 (Cadetes)</option>
                            <option value="Sub-15 (Juvenis)">Sub-15 (Juvenis)</option>
                            <option value="Masters / Veteranos">Masters / Veteranos</option>
                            <option value="Femininas">Femininas</option>
                            <option value="Escolas">Escolas</option>
                        </select>
                    </div>

                </section>

                <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
                    <div className="pb-4">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1 text-base">Menu de Navegação</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personaliza os separadores visíveis no topo da página. Desativa o que não usas.</p>
                    </div>
                    
                    <div className="pt-2">
                        {['Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos'].map(tab => {
                            const isVisible = !hiddenTabs.includes(tab);
                            return (
                                <div key={tab} className="flex flex-col md:flex-row md:items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 gap-4">
                                    <span className={`text-sm ${isVisible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                        Separador <strong className="font-semibold">{tab}</strong>
                                    </span>
                                    <div 
                                        className={`w-11 h-6 shrink-0 rounded-full transition-all flex items-center px-1 cursor-pointer border ${isVisible ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`} 
                                        onClick={() => toggleHiddenTab(tab)}
                                    >
                                        <div className={`w-4 h-4 rounded-full transition-all ${isVisible ? 'translate-x-5 bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'translate-x-0 bg-slate-400 dark:bg-slate-500'}`}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
                    <div className="pb-4">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1 text-base">Fontes de Dados (Scrapers)</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gere a origem das provas. Em caso de duplicados, a que está em cima tem prioridade.</p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5">
                        {selectedSources.map((source, index) => (
                            <div key={source} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                <div className="flex items-center gap-4">
                                    <div className="text-slate-500 cursor-grab hover:text-slate-300 transition-colors" title="Ordem (Usa botões para mudar)">
                                        <GripVertical size={16} />
                                    </div>
                                    <span className="font-medium text-sm text-slate-200">
                                        {source === 'FPC' ? 'Federação Portuguesa (FPC)' : 'Cabreira Solutions'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col gap-1">
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === 0}
                                            className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >▲</button>
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === selectedSources.length - 1}
                                            className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >▼</button>
                                    </div>
                                    <div 
                                        className="w-11 h-6 shrink-0 rounded-full transition-all flex items-center px-1 cursor-pointer border bg-blue-500/20 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                                        onClick={() => toggleSource(source)}
                                    >
                                        <div className="w-4 h-4 rounded-full transition-all translate-x-5 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"/>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {['FPC', 'Cabreira'].filter(s => !selectedSources.includes(s)).map(source => (
                            <div key={source} className="flex items-center justify-between bg-transparent px-4 py-3 rounded-xl border border-dashed border-slate-700/60 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-4">
                                    <div className="opacity-0"><GripVertical size={16} /></div>
                                    <span className="text-sm text-slate-400">
                                        {source === 'FPC' ? 'Federação Portuguesa (FPC)' : 'Cabreira Solutions'}
                                    </span>
                                </div>
                                <div 
                                    className="w-11 h-6 shrink-0 rounded-full transition-all flex items-center px-1 cursor-pointer border bg-slate-800 border-slate-700" 
                                    onClick={() => toggleSource(source)}
                                >
                                    <div className="w-4 h-4 rounded-full transition-all translate-x-0 bg-slate-500"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modals */}
            {activeModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveModal(null);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative max-w-[500px] w-full shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
                        <button 
                            onClick={() => setActiveModal(null)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-2xl leading-none z-10"
                        >×</button>
                        
                        <div className="max-h-[90vh] overflow-y-auto p-1">
                            {activeModal === 'regiao' && <RegionAssistant onApply={(val) => { setDefaultRegiao(val); setActiveModal(null); }} />}
                            {activeModal === 'escalao' && <EscalaoAssistant onApply={(val) => { setDefaultEscalao(val); setActiveModal(null); }} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
