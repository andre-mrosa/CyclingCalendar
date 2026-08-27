"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle, Settings, ChevronUp, ChevronDown, RotateCcw, Shield, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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
    
    // Deletion Request State
    const [deletionRequest, setDeletionRequest] = useState(null);
    const [deleteModalType, setDeleteModalType] = useState('DELETE_ACCOUNT'); // 'DELETE_DATA' | 'DELETE_ACCOUNT'
    const [isLoadingDeletion, setIsLoadingDeletion] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteFeedback, setDeleteFeedback] = useState(null);

    const primaryEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '').toLowerCase();
    const masterDefaults = ['andre.rosa1603@gmail.com', 'andremrosa@gmail.com', 'andre_rosa', 'andrerosa', 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'];
    const isMaster = masterDefaults.some(m => primaryEmail.includes(m) || user?.id === m);
    const isAdmin = isMaster || user?.publicMetadata?.role === 'admin';

    // Verificar se utilizador tem pedido pendente
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const checkDeletionStatus = async () => {
            try {
                const res = await fetch('/api/user/delete-request');
                const data = await res.json();
                if (data.success && data.request) {
                    setDeletionRequest(data.request);
                }
            } catch (e) {}
        };

        checkDeletionStatus();
    }, [isLoaded, isSignedIn]);

    const handleConfirmDeletionRequest = async () => {
        setIsDeletingAccount(true);
        setDeleteFeedback(null);
        try {
            const res = await fetch('/api/user/delete-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    type: deleteModalType,
                    reason: deleteReason 
                })
            });
            const data = await res.json();
            if (data.success) {
                setDeletionRequest(data.request);
                setDeleteFeedback({ type: 'success', text: data.message });
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('admin-notif-update'));
                }
                setTimeout(() => {
                    setActiveModal(null);
                    setDeleteFeedback(null);
                    setDeleteReason('');
                }, 1500);
            } else {
                setDeleteFeedback({ type: 'error', text: data.error || 'Erro ao submeter pedido.' });
            }
        } catch (e) {
            setDeleteFeedback({ type: 'error', text: e.message || 'Erro de ligação.' });
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleCancelDeletionRequest = async () => {
        const confirmMsg = deletionRequest?.type === 'DELETE_DATA'
            ? 'Tem a certeza que deseja cancelar o pedido de eliminação dos seus dados?'
            : 'Tem a certeza que deseja cancelar o pedido de eliminação da sua conta?';
        if (!window.confirm(confirmMsg)) return;
        setIsLoadingDeletion(true);
        try {
            const res = await fetch('/api/user/delete-request', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setDeletionRequest(null);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('admin-notif-update'));
                }
            }
        } catch (e) {
            console.error('Error cancelling deletion request:', e);
        } finally {
            setIsLoadingDeletion(false);
        }
    };

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

                {/* Zona de Privacidade • Eliminação de Dados */}
                {isSignedIn && !isMaster && (
                    <section className="bg-amber-500/[0.04] border border-amber-500/20 dark:border-amber-500/20 rounded-2xl p-6 sm:p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <RotateCcw size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                        Eliminação de Dados e Favoritos (RGPD)
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Podes solicitar a eliminação dos teus favoritos, histórico e preferências da plataforma mantendo a tua conta ativa. (Para encerrares a conta definitivamente, usa a opção <em>Eliminar conta</em> no menu de Segurança do perfil).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Estado do Pedido */}
                        <div className="mt-5 pt-5 border-t border-amber-500/15">
                            {deletionRequest?.status === 'PENDING' ? (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                                    <div className="flex items-start gap-3">
                                        <Clock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold text-xs sm:text-sm text-amber-700 dark:text-amber-300 block">
                                                🧹 Pedido de Eliminação de Dados Pendente
                                            </span>
                                            <span className="text-[11px] sm:text-xs text-amber-600/90 dark:text-amber-400/80 block mt-0.5">
                                                Submetido a {new Date(deletionRequest.createdAt).toLocaleDateString('pt-PT')}. A administração irá processar a limpeza dos teus dados em breve.
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCancelDeletionRequest}
                                        disabled={isLoadingDeletion}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0 shadow-sm"
                                    >
                                        {isLoadingDeletion ? 'A cancelar...' : 'Cancelar Pedido'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <span className="text-xs text-slate-500">
                                        Envia um pedido à equipa de administração para limpar os teus dados:
                                    </span>
                                    <button
                                        onClick={() => {
                                            setDeleteModalType('DELETE_DATA');
                                            setActiveModal('delete_request');
                                        }}
                                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Pedir Eliminação de Dados</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>

            {/* Modals */}
            {activeModal && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeletingAccount) setActiveModal(null);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl relative max-w-[480px] w-full shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
                        <button 
                            onClick={() => !isDeletingAccount && setActiveModal(null)}
                            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-2xl leading-none z-10 cursor-pointer"
                        >×</button>
                        
                        <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
                            {activeModal === 'regiao' && <RegionAssistant onApply={(val) => { setDefaultRegiao(val); setActiveModal(null); }} />}
                            {activeModal === 'escalao' && <EscalaoAssistant onApply={(val) => { setDefaultEscalao(val); setActiveModal(null); }} />}
                            
                            {activeModal === 'delete_request' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            deleteModalType === 'DELETE_DATA' 
                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {deleteModalType === 'DELETE_DATA' ? <RotateCcw size={20} /> : <Trash2 size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                                {deleteModalType === 'DELETE_DATA' ? 'Requisitar Eliminação de Dados' : 'Requisitar Eliminação de Conta'}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {deleteModalType === 'DELETE_DATA' ? 'Limpeza de favoritos e preferências' : 'Encerramento definitivo de conta'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                                        deleteModalType === 'DELETE_DATA'
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                                    }`}>
                                        <p className="font-bold m-0">
                                            {deleteModalType === 'DELETE_DATA'
                                                ? 'O que acontece ao eliminar os dados?'
                                                : 'Atenção: A eliminação de conta é irreversível.'}
                                        </p>
                                        <p className="m-0">
                                            {deleteModalType === 'DELETE_DATA'
                                                ? 'Todos os teus favoritos, histórico de eventos e configurações salvas serão eliminados. A tua conta permanecerá ativa para poderes continuar a utilizar a plataforma.'
                                                : 'Após o processamento pela administração, o teu perfil, favoritos e permissões serão apagados permanentemente do sistema de autenticação.'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Justificação / Motivo (opcional):
                                        </label>
                                        <textarea
                                            value={deleteReason}
                                            onChange={(e) => setDeleteReason(e.target.value)}
                                            placeholder={deleteModalType === 'DELETE_DATA' ? "Ex: Pretendo reiniciar a minha lista de favoritos do zero..." : "Ex: Não pretendo continuar a utilizar o calendário..."}
                                            rows={3}
                                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    {deleteFeedback && (
                                        <div className={`p-3 rounded-xl text-xs font-semibold ${
                                            deleteFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                                        }`}>
                                            {deleteFeedback.text}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2.5 pt-2">
                                        <button
                                            onClick={() => setActiveModal(null)}
                                            disabled={isDeletingAccount}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleConfirmDeletionRequest}
                                            disabled={isDeletingAccount}
                                            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                                                deleteModalType === 'DELETE_DATA'
                                                    ? 'bg-amber-600 hover:bg-amber-500'
                                                    : 'bg-rose-600 hover:bg-rose-500'
                                            }`}
                                        >
                                            {isDeletingAccount && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                            <span>Submeter Pedido</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
