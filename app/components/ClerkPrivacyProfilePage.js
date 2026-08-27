'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Trash2, RotateCcw, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function ClerkPrivacyProfilePage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [deletionRequest, setDeletionRequest] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeAction, setActiveAction] = useState(null); // 'DELETE_DATA' | 'DELETE_ACCOUNT' | null
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const primaryEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '').toLowerCase();
    const isMaster = ['andre.rosa1603@gmail.com', 'andremrosa@gmail.com', 'andre_rosa', 'andrerosa', 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'].some(m => primaryEmail.includes(m) || user?.id === m);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const checkStatus = async () => {
            setIsLoading(true);
            try {
                const token = await getToken().catch(() => null);
                const res = await fetch('/api/user/delete-request', {
                    headers: {
                        'Accept': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success && data.request) {
                        setDeletionRequest(data.request);
                    }
                }
            } catch (e) {
                console.error('Error checking deletion status:', e);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
    }, [isLoaded, isSignedIn, getToken]);

    const handleSubmitRequest = async () => {
        if (!activeAction) return;
        setIsSubmitting(true);
        setFeedback(null);
        try {
            const token = await getToken().catch(() => null);
            const res = await fetch('/api/user/delete-request', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    type: activeAction,
                    reason: reason.trim()
                })
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error('Failed to parse JSON response:', text);
                data = { success: false, error: text || `Erro no servidor (Status ${res.status})` };
            }

            if (data.success) {
                setDeletionRequest(data.request);
                setFeedback({ type: 'success', text: data.message });
                setActiveAction(null);
                setReason('');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('admin-notif-update'));
                }
            } else {
                setFeedback({ type: 'error', text: data.error || 'Erro ao submeter pedido.' });
            }
        } catch (e) {
            setFeedback({ type: 'error', text: e.message || 'Erro de rede.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!window.confirm('Deseja cancelar o pedido pendente?')) return;
        setIsSubmitting(true);
        try {
            const token = await getToken().catch(() => null);
            const res = await fetch('/api/user/delete-request', { 
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { success: false };
            }
            if (data.success) {
                setDeletionRequest(null);
                setFeedback({ type: 'success', text: 'Pedido cancelado com sucesso.' });
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('admin-notif-update'));
                }
            }
        } catch (e) {
            console.error('Error cancelling request:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isMaster) {
        return (
            <div className="p-6 text-sm text-slate-400">
                <p>O perfil de Master Admin possui proteção permanente contra eliminação de conta.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-xl">
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Privacidade e Gestão de Dados (RGPD)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Controla os teus dados pessoais, favoritos e o encerramento da tua conta na plataforma.
                </p>
            </div>

            {feedback && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                    feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                }`}>
                    {feedback.text}
                </div>
            )}

            {deletionRequest?.status === 'PENDING' ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-start gap-2.5">
                        <Clock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-xs text-amber-800 dark:text-amber-300 block">
                                {deletionRequest.type === 'DELETE_DATA' ? '🧹 Pedido de Eliminação de Dados Pendente' : '🗑️ Pedido de Eliminação de Conta Pendente'}
                            </span>
                            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
                                Submetido em {new Date(deletionRequest.createdAt).toLocaleDateString('pt-PT')}. A administração foi notificada e processará o teu pedido.
                            </span>
                            {deletionRequest.reason && (
                                <span className="text-[11px] text-amber-700/90 dark:text-amber-300/90 block mt-1 italic">
                                    Motivo indicado: "{deletionRequest.reason}"
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCancelRequest}
                        disabled={isSubmitting}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        {isSubmitting ? 'A cancelar...' : 'Cancelar Pedido'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Opção: Eliminar Dados */}
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <RotateCcw size={16} className="text-amber-500" />
                                    <span>Eliminar Dados e Favoritos</span>
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 leading-relaxed">
                                    Limpa todos os teus eventos favoritos, preferências de filtro e histórico, mantendo a tua conta ativa para poderes continuar a aceder ao calendário.
                                </span>
                            </div>
                            <button
                                onClick={() => setActiveAction(activeAction === 'DELETE_DATA' ? null : 'DELETE_DATA')}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-500/40 transition-colors cursor-pointer shrink-0"
                            >
                                {activeAction === 'DELETE_DATA' ? 'Fechar' : 'Pedir Limpeza de Dados'}
                            </button>
                        </div>

                        {/* Formulário de Confirmação com Motivo */}
                        {activeAction === 'DELETE_DATA' && (
                            <div className="pt-3 border-t border-amber-500/20 space-y-3 animate-fade-in">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Motivo ou Justificação (opcional):
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Ex: Quero recomeçar a minha agenda do zero..."
                                        rows={2}
                                        className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => { setActiveAction(null); setReason(''); }}
                                        disabled={isSubmitting}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSubmitRequest}
                                        disabled={isSubmitting}
                                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        {isSubmitting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        <span>Submeter Pedido ao Admin</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nota explicativa sobre Eliminar Conta */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        💡 <strong className="text-slate-700 dark:text-slate-300">Pretendes encerrar a conta por completo?</strong> Podes fazê-lo diretamente na secção <strong className="text-slate-700 dark:text-slate-300">Segurança ➔ Eliminar conta</strong> à esquerda.
                    </div>
                </div>
            )}
        </div>
    );
}
