import { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import styles from '../admin.module.css';

export const number = value => value == null ? '—' : typeof value === 'number' ? value.toLocaleString('pt-PT') : String(value);
export const dateTime = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
};
export const entries = value => Array.isArray(value) ? value : Object.entries(value || {}).map(([id, item]) => ({ ...item, id: item.id || id }));

export function Button({ children, tone, className = '', ...props }) {
    return <button type="button" className={`${styles.button} ${tone === 'primary' ? styles.primary : tone === 'danger' ? styles.danger : ''} ${className}`} {...props}>{children}</button>;
}

export function RefreshButton({ busy, onClick }) {
    return <Button onClick={onClick} disabled={busy}><RefreshCw size={15} className={busy ? styles.spin : ''} />Atualizar</Button>;
}

export function Panel({ title, description, action, children, className = '' }) {
    return <section className={`${styles.panel} ${className}`}>
        {title && <div className={styles.panelHeading}><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action}</div>}
        {children}
    </section>;
}

export function Metric({ label, value, note, accent }) {
    return <div className={`${styles.metric} ${accent ? styles.metricAccent : ''}`}><span>{label}</span><strong>{number(value)}</strong><small>{note}</small></div>;
}

const labels = { success: 'Concluído', done: 'Concluído', partial: 'Parcial', error: 'Erro', failed: 'Erro', interrupted: 'Interrompido', running: 'Em execução', loading: 'A iniciar', idle: 'A aguardar', pending: 'Pendente', skipped: 'Ignorado', unknown: 'Não confirmado', INFO: 'Informação', WARN: 'Aviso', ERROR: 'Erro' };
export function Status({ value = 'unknown', children }) {
    const tone = ['success', 'done'].includes(value) ? styles.good : ['error', 'failed', 'ERROR'].includes(value) ? styles.bad : ['partial', 'interrupted', 'WARN'].includes(value) ? styles.warning : '';
    return <span className={`${styles.badge} ${tone}`}>{children || labels[value] || value}</span>;
}

export function Empty({ children = 'Sem dados disponíveis.', busy = false }) {
    return <div className={styles.empty} role="status">{busy && <RefreshCw size={18} className={styles.spin} />}{busy ? 'A carregar…' : children}</div>;
}

export function Notice({ children, error = false }) {
    return <div className={`${styles.notice} ${error ? styles.noticeError : ''}`} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function ConfirmDialog({ title, children, onClose, onConfirm, busy, message, confirmLabel = 'Confirmar', danger = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        dialog.showModal();
        return () => { dialog.close(); previousFocus?.focus(); };
    }, []);
    return <dialog ref={ref} className={styles.dialog} aria-labelledby="admin-confirm-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
        <div className={styles.panelHeading}><h2 id="admin-confirm-title">{title}</h2><Button onClick={onClose} disabled={busy} aria-label="Fechar confirmação"><X size={16} /></Button></div>
        <div className={styles.dialogBody}>{children}</div>
        {message && <Notice error={message.type === 'error'}>{message.text}</Notice>}
        <div className={styles.dialogActions}><Button autoFocus disabled={busy} onClick={onClose}>Cancelar</Button><Button tone={danger ? 'danger' : 'primary'} disabled={busy || message?.type === 'success'} onClick={onConfirm}>{busy ? 'A processar…' : confirmLabel}</Button></div>
    </dialog>;
}
