"use client";
import { useState, useEffect } from 'react';
import { AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import packageJson from '../../package.json';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';
import { useModalFocus } from '../hooks/useModalFocus';

export default function WelcomeModal() {
    const { t } = useTranslation();
    const appVersion = packageJson.version;
    const [isOpen, setIsOpen] = useState(false);
    const [neverShow, setNeverShow] = useState(false);
    
    // Contact form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    useEffect(() => {
        const hideWelcome = localStorage.getItem(`hideWelcomeModal_v${appVersion}`);
        if (!hideWelcome) {
            setIsOpen(true);
        }
    }, [appVersion]);

    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || '';
            };
        }
    }, [isOpen]);

    const handleClose = () => {
        if (neverShow) {
            localStorage.setItem(`hideWelcomeModal_v${appVersion}`, 'true');
        }
        setIsOpen(false);
        // Reset state after close
        setTimeout(() => {
            setSubmitStatus(null);
            setFormData({ name: '', email: '', message: '' });
        }, 300);
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const dialogRef = useModalFocus(isOpen, handleClose);
    if (!isOpen) return null;

    return (
        <div 
            className={`${styles.overlay} fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain`}
            onClick={handleClose}
        >
            <div 
                className={`${styles.welcome} w-full max-w-[550px] max-h-[88dvh] sm:max-h-[90vh] shadow-2xl relative border overflow-hidden flex flex-col my-auto text-ink transition-colors duration-200`}
                role="dialog" aria-modal="true" aria-label={t('welcome_title')}
                ref={dialogRef} tabIndex={-1}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-6 px-6 sm:pt-8 sm:px-8 pb-3.5 flex items-center gap-3.5 shrink-0 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="bg-blue-500/10 p-2.5 sm:p-3 rounded-2xl text-brand flex items-center justify-center border border-blue-500/20 shrink-0">
                        <AlertCircle size={24} className="sm:w-7 sm:h-7" />
                    </div>
                    <div>
                        <h2 className="m-0 text-lg sm:text-xl font-bold text-ink tracking-tight">
                            {t('welcome_title')}
                        </h2>
                        <div className="text-xs text-brand font-semibold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                            {t('welcome_version_badge', { version: appVersion })}
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="px-6 sm:px-8 py-4 overflow-y-auto overscroll-contain flex-1 text-slate-600 dark:text-slate-300 leading-relaxed text-sm scrollbar-thin">
                    <div className="mb-4 space-y-2.5">
                        <p className="m-0">
                            {t('welcome_p1')}
                        </p>
                        <p className="m-0">
                            {t('welcome_p2_part1')} <strong className="text-ink font-semibold">{t('welcome_p2_active_dev', { version: appVersion })}</strong>{t('welcome_p2_part2')}
                        </p>
                    </div>
                    
                    <form onSubmit={handleContactSubmit} className="bg-soft p-4 sm:p-5 rounded-xl border border-line flex flex-col gap-3">
                        {submitStatus === 'success' ? (
                            <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-center border border-emerald-500/20 text-sm font-medium">
                                <strong className="font-semibold block mb-0.5">{t('welcome_success_title')}</strong> {t('welcome_success_desc')}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <input 
                                        type="text" 
                                        placeholder={t('welcome_input_name')} 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        className="p-2.5 sm:p-3 rounded-xl border border-line bg-surface text-ink placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm transition-colors focus:border-blue-500 disabled:opacity-50"
                                    />
                                    <input 
                                        type="email" 
                                        placeholder={t('welcome_input_email')} 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        className="p-2.5 sm:p-3 rounded-xl border border-line bg-surface text-ink placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm transition-colors focus:border-blue-500 disabled:opacity-50"
                                    />
                                </div>
                                <textarea 
                                    placeholder={t('welcome_input_message')} 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={3}
                                    className="p-2.5 sm:p-3 rounded-xl border border-line bg-surface text-ink placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm resize-y transition-colors min-h-[70px] focus:border-blue-500 disabled:opacity-50"
                                />
                                {submitStatus === 'error' && (
                                    <span className="text-red-500 dark:text-red-400 text-xs text-center">
                                        {t('welcome_error')}
                                    </span>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-brand hover:brightness-110 text-surface font-semibold transition-colors shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            {t('welcome_btn_sending')}
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            {t('welcome_btn_send')}
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>

                    {/* Checkbox */}
                    <div className="mt-4">
                        <label 
                            className="inline-flex items-center gap-2.5 cursor-pointer text-muted transition-colors hover:text-slate-800 dark:hover:text-slate-200 text-xs sm:text-sm"
                            onClick={() => setNeverShow(!neverShow)}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${neverShow ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-700 bg-soft'}`}>
                                {neverShow && <CheckCircle2 size={12} color="white" strokeWidth={3} />}
                            </div>
                            <span className="select-none">{t('welcome_checkbox_dont_show')}</span>
                        </label>
                    </div>
                </div>

                {/* Footer (Sticky at bottom) */}
                <div className="px-6 sm:px-8 py-3 sm:py-3.5 bg-soft border-t border-line flex justify-end shrink-0">
                    <button 
                        onClick={handleClose}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-ink font-semibold text-sm transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer text-center"
                    >
                        {t('welcome_btn_understand')}
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
