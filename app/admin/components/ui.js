import { useEffect, useRef } from 'react';
import { RefreshCw, X, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import styles from '../admin.module.css';

export const number = value => value == null ? '—' : typeof value === 'number' ? value.toLocaleString('pt-PT') : String(value);
export const dateTime = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
};
export const entries = value => Array.isArray(value) ? value : Object.entries(value || {}).map(([id, item]) => ({ ...item, id: item.id || id }));

export function Button({ children, tone, className = '', ...props }) {
    const toneClasses=tone==='primary'?styles.primary:tone==='danger'?styles.danger:'';
    
    return (
        <button 
            type="button" 
            className={`${styles.button} ${toneClasses} ${className}`}
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
        <section className={`${styles.panel} ${className}`}>
            {title && (
                <div className={styles.panelHeading}>
                    <div>
                        <h3>{title}</h3>
                        {description && <p>{description}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className={styles.panelContent}>
                {children}
            </div>
        </section>
    );
}

export function Metric({ label, value, note, accent }) {
    return (
        <div className={`${styles.metric} ${accent?styles.metricAccent:''}`}>
            <span>{label}</span>
            <strong>
                {number(value)}
            </strong>
            {note && <small>{note}</small>}
        </div>
    );
}

const labels = { success: 'Concluído', done: 'Concluído', partial: 'Parcial', error: 'Erro', failed: 'Erro', interrupted: 'Interrompido', running: 'Em execução', loading: 'A iniciar', idle: 'A aguardar', pending: 'Pendente', skipped: 'Ignorado', unknown: 'Não confirmado', INFO: 'Informação', WARN: 'Aviso', ERROR: 'Erro' };
export function Status({ value = 'unknown', children }) {
    const isGood = ['success', 'done'].includes(value);
    const isBad = ['error', 'failed', 'ERROR'].includes(value);
    const isWarn = ['partial', 'interrupted', 'WARN'].includes(value);
    
    const toneClasses=isGood?styles.good:isBad?styles.bad:isWarn?styles.warning:'';
    
    return (
        <span className={`${styles.badge} ${toneClasses}`}>
            {children || labels[value] || value}
        </span>
    );
}

export function Empty({ children = 'Sem dados disponíveis.', busy = false }) {
    return (
        <div className={styles.empty} role="status">
            {busy ? <RefreshCw size={24} className="animate-spin mb-4 text-brand" /> : <div className="mb-4 text-gray-300 dark:text-gray-700"><Info size={32} /></div>}
            <p className="text-sm font-medium">{busy ? 'A carregar…' : children}</p>
        </div>
    );
}

export function Notice({ children, error = false }) {
    return (
        <div className={`${styles.notice} ${error?styles.noticeError:''}`} role={error ? 'alert' : 'status'}>
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
                <button type="button" aria-label="Fechar confirmação" onClick={onClose} disabled={busy} className="p-1.5 text-muted hover:text-ink rounded-md hover:bg-soft transition-colors disabled:opacity-50">
                    <X size={18} />
                </button>
            </div>
            <div className="px-6 py-5 text-sm space-y-4">
                {children}
                {message && <Notice error={message.type === 'error'}>{message.text}</Notice>}
            </div>
            <div className="px-6 py-4 bg-soft border-t border-line flex items-center justify-end gap-3">
                <Button autoFocus disabled={busy} onClick={onClose}>{message?.type === 'success' ? 'Fechar' : 'Cancelar'}</Button>
                <Button tone={danger ? 'danger' : 'primary'} disabled={busy || message?.type === 'success'} onClick={onConfirm}>
                    {busy ? 'A processar…' : confirmLabel}
                </Button>
            </div>
        </dialog>
    );
}
