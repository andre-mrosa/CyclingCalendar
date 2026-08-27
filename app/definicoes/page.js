"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle, Settings, ChevronUp, ChevronDown, RotateCcw, Shield } from 'lucide-react';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Conta() {
    const { 
        defaultPage, setDefaultPage,
        defaultEscalao, setDefaultEscalao,
        defaultRegiao, setDefaultRegiao,
        selectedSources, toggleSource,
        hiddenTabs, toggleHiddenTab,
        tabsOrder, moveTab, resetTabsOrder
    } = useSettingsStore();

    const { isLoaded, isSignedIn, user } = useUser();
    const [activeModal, setActiveModal] = useState(null);

    const primaryEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '').toLowerCase();
    const masterDefaults = ['andre.rosa1603@gmail.com', 'andremrosa@gmail.com', 'andre_rosa', 'andrerosa'];
    const isMaster = masterDefaults.some(m => primaryEmail.includes(m));
    const isAdmin = isMaster || user?.publicMetadata?.role === 'admin';

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
                {isAdmin && (
                    <section className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Shield size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Painel de Gestão & Backoffice</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Gere utilizadores, consulta os logs do sistema e executa scrapers.</p>
                            </div>
                        </div>
                        <Link
                            href="/admin"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all !no-underline shrink-0"
                        >
                            <Shield size={16} />
                            Abrir Gestão
                        </Link>
                    </section>
                )}
                <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center mb-1 text-base">
                                Página Principal Predefinida
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Escolhe a página que abre automaticamente ao entrar na aplicação.</p>
                        </div>
                        <select 
                            className="h-10 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors w-full md:w-auto" 
                            value={defaultPage || '/'} 
                            onChange={(e) => setDefaultPage(e.target.value)}
                        >
                            <option value="/">Geral (Todas as Provas)</option>
                            <option value="/agenda">A Minha Agenda</option>
                            <option value="/favoritos">Favoritos</option>
                            <option value="/nacionais">Campeonatos Nacionais</option>
                            <option value="/tacas">Taças de Portugal</option>
                            <option value="/regionais">Regionais</option>
                            <option value="/internacionais">Internacionais</option>
                            <option value="/lazer">Lazer / CPT</option>
                        </select>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between py-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 gap-2">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1 text-base">Menu de Navegação & Ordem dos Separadores</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Reordena os separadores ou desativa os que não utilizas.</p>
                        </div>
                        <button 
                            onClick={resetTabsOrder}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500/40 shrink-0 self-start sm:self-auto cursor-pointer"
                            title="Repor ordem original dos separadores"
                        >
                            <RotateCcw size={13} />
                            <span>Repor ordem padrão</span>
                        </button>
                    </div>
                    
                    <div className="pt-3 flex flex-col gap-2">
                        {(tabsOrder && tabsOrder.length > 0 ? tabsOrder : ['Geral', 'Minha Agenda', 'Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos']).map((tab, idx, arr) => {
                            const isVisible = !hiddenTabs.includes(tab);
                            const isFirst = idx === 0;
                            const isLast = idx === arr.length - 1;

                            return (
                                <div key={tab} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Reorder Arrows */}
                                        <div className="flex items-center gap-0.5 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                                            <button 
                                                onClick={() => moveTab(idx, -1)}
                                                disabled={isFirst}
                                                className={`p-1 rounded transition-colors ${isFirst ? 'opacity-25 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'}`}
                                                title="Mover para cima / esquerda"
                                            >
                                                <ChevronUp size={15} />
                                            </button>
                                            <button 
                                                onClick={() => moveTab(idx, 1)}
                                                disabled={isLast}
                                                className={`p-1 rounded transition-colors ${isLast ? 'opacity-25 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'}`}
                                                title="Mover para baixo / direita"
                                            >
                                                <ChevronDown size={15} />
                                            </button>
                                        </div>

                                        <span className={`text-sm font-semibold truncate ${isVisible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                            {tab}
                                        </span>
                                    </div>

                                    {/* Visibility Toggle */}
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="text-xs text-slate-400 hidden sm:inline">{isVisible ? 'Ativo' : 'Oculto'}</span>
                                        <div 
                                            className={`w-11 h-6 shrink-0 rounded-full transition-all flex items-center px-1 cursor-pointer border ${isVisible ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`} 
                                            onClick={() => toggleHiddenTab(tab)}
                                            title={isVisible ? "Ocultar separador" : "Mostrar separador"}
                                        >
                                            <div className={`w-4 h-4 rounded-full transition-all ${isVisible ? 'translate-x-5 bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'translate-x-0 bg-slate-400 dark:bg-slate-500'}`}/>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl">
                    <div className="pb-4">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1 text-base">Fontes de Dados (Scrapers)</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Escolhe as plataformas ativas no calendário. O sistema unifica e apresenta automaticamente as informações mais completas de cada prova.</p>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        {[
                            { id: 'FPC', name: 'Federação Portuguesa de Ciclismo (FPC)', desc: 'Provas nacionais, regionais, taças e campeonatos oficiais.' },
                            { id: 'Cabreira', name: 'Cabreira Solutions', desc: 'Granfondos, eventos de lazer e turismo desportivo.' }
                        ].map(source => {
                            const isSelected = selectedSources.includes(source.id);
                            return (
                                <div key={source.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-800/40 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 gap-3">
                                    <div>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-200 block">
                                            {source.name}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                            {source.desc}
                                        </span>
                                    </div>
                                    <div 
                                        className={`w-11 h-6 shrink-0 rounded-full transition-all flex items-center px-1 cursor-pointer border ${isSelected ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`} 
                                        onClick={() => toggleSource(source.id)}
                                    >
                                        <div className={`w-4 h-4 rounded-full transition-all ${isSelected ? 'translate-x-5 bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'translate-x-0 bg-slate-400 dark:bg-slate-500'}`}/>
                                    </div>
                                </div>
                            );
                        })}
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
