import { useEffect, useRef } from 'react';
import { RefreshCw, X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const number = value => value == null ? '—' : typeof value === 'number' ? value.toLocaleString('pt-PT') : String(value);
export const dateTime = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
};
export const entries = value => Array.isArray(value) ? value : Object.entries(value || {}).map(([id, item]) => ({ ...item, id: item.id || id }));

export function Button({ children, tone, className = '', ...props }) {
    let toneClasses = "bg-surface border-line text-ink hover:bg-soft";
    if (tone === 'primary') toneClasses = "bg-brand border-brand text-white hover:opacity-90";
    else if (tone === 'danger') toneClasses = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40";
    
    return (
        <button 
            type="button" 
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses} ${className}`} 
            {...props}
        >
            {children}
        </button>
    );
}

export function RefreshButton({ busy, onClick }) {
    return (
        <Button onClick={onClick} disabled={busy}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            Atualizar
        </Button>
    );
}

export function Panel({ title, description, action, children, className = '' }) {
    return (
        <section className={`bg-surface border border-line rounded-xl shadow-sm overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-ink tracking-tight">{title}</h3>
                        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className="w-full overflow-x-auto">
                {children}
            </div>
        </section>
    );
}

export function Metric({ label, value, note, accent }) {
    return (
        <div className={`p-6 rounded-xl border ${accent ? 'bg-brand-soft/30 border-brand/40' : 'bg-surface border-line shadow-sm'} flex flex-col`}>
            <span className="text-sm font-medium text-muted">{label}</span>
            <strong className={`text-3xl font-bold tracking-tight mt-2 mb-1 ${accent ? 'text-brand' : 'text-ink'}`}>
                {number(value)}
            </strong>
            {note && <small className="text-xs text-muted leading-tight">{note}</small>}
        </div>
    );
}

const labels = { success: 'Concluído', done: 'Concluído', partial: 'Parcial', error: 'Erro', failed: 'Erro', interrupted: 'Interrompido', running: 'Em execução', loading: 'A iniciar', idle: 'A aguardar', pending: 'Pendente', skipped: 'Ignorado', unknown: 'Não confirmado', INFO: 'Informação', WARN: 'Aviso', ERROR: 'Erro' };
export function Status({ value = 'unknown', children }) {
    const isGood = ['success', 'done'].includes(value);
    const isBad = ['error', 'failed', 'ERROR'].includes(value);
    const isWarn = ['partial', 'interrupted', 'WARN'].includes(value);
    
    let toneClasses = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    if (isGood) toneClasses = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    else if (isBad) toneClasses = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    else if (isWarn) toneClasses = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${toneClasses}`}>
            {children || labels[value] || value}
        </span>
    );
}

export function Empty({ children = 'Sem dados disponíveis.', busy = false }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted" role="status">
            {busy ? <RefreshCw size={24} className="animate-spin mb-4 text-brand" /> : <div className="mb-4 text-gray-300 dark:text-gray-700"><Info size={32} /></div>}
            <p className="text-sm font-medium">{busy ? 'A carregar…' : children}</p>
        </div>
    );
}

export function Notice({ children, error = false }) {
    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${error ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'}`} role={error ? 'alert' : 'status'}>
            <div className="shrink-0 mt-0.5">
                {error ? <AlertCircle size={18} /> : <Info size={18} />}
            </div>
            <div className="text-sm flex-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                {children}
            </div>
        </div>
    );
}

export function ConfirmDialog({ title, children, onClose, onConfirm, busy, message, confirmLabel = 'Confirmar', danger = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        dialog.showModal();
        return () => { dialog.close(); previousFocus?.focus(); };
    }, []);
    return (
        <dialog 
            ref={ref} 
            className="p-0 bg-surface text-ink border border-line rounded-xl shadow-2xl w-full max-w-lg m-auto backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95" 
            aria-labelledby="admin-confirm-title" 
            onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
        >
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <h2 id="admin-confirm-title" className="text-lg font-semibold tracking-tight">{title}</h2>
                <button onClick={onClose} disabled={busy} className="p-1.5 text-muted hover:text-ink rounded-md hover:bg-soft transition-colors disabled:opacity-50">
                    <X size={18} />
                </button>
            </div>
            <div className="px-6 py-5 text-sm space-y-4">
                {children}
                {message && <Notice error={message.type === 'error'}>{message.text}</Notice>}
            </div>
            <div className="px-6 py-4 bg-soft border-t border-line flex items-center justify-end gap-3">
                <Button autoFocus disabled={busy} onClick={onClose}>Cancelar</Button>
                <Button tone={danger ? 'danger' : 'primary'} disabled={busy || message?.type === 'success'} onClick={onConfirm}>
                    {busy ? 'A processar…' : confirmLabel}
                </Button>
            </div>
        </dialog>
    );
}
