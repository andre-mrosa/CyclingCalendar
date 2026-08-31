"use client";
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import PageHeading from '../components/PageHeading';
import styles from '../components/site.module.css';

export default function ContactoPage() {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

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

    return (
        <div className={`${styles.page} ${styles.secondaryWide} ${styles.contactGrid}`}>
            <PageHeading title={t('contact_title')} subtitle={t('contact_subtitle')} icon={Mail} />

            <div className={styles.panel}>
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-5">
                    {submitStatus === 'success' ? (
                        <div className="p-6 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-center border border-emerald-500/20 text-base font-medium">
                            <strong className="font-semibold block mb-1">{t('contact_form_thank_you')}</strong> {t('contact_form_success')}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="contact-name" className="text-xs uppercase tracking-wider font-bold text-muted">{t('contact_form_name')}</label>
                                    <input 
                                        id="contact-name" autoComplete="name"
                                        type="text" 
                                        placeholder={t('contact_placeholder_name')} 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        disabled={isSubmitting}
                                        className="bg-soft border border-line rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-ink placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-colors disabled:opacity-50"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="contact-email" className="text-xs uppercase tracking-wider font-bold text-muted">{t('contact_form_email')}</label>
                                    <input 
                                        id="contact-email" autoComplete="email"
                                        type="email" 
                                        placeholder={t('contact_placeholder_email')} 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={isSubmitting}
                                        className="bg-soft border border-line rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-ink placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="contact-message" className="text-xs uppercase tracking-wider font-bold text-muted">{t('contact_form_msg')}</label>
                                <textarea 
                                    id="contact-message"
                                    placeholder={t('contact_placeholder_msg')} 
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    disabled={isSubmitting}
                                    rows={5}
                                    className="bg-soft border border-line rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-3.5 outline-none text-ink placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-y transition-colors disabled:opacity-50"
                                />
                            </div>
                            
                            {submitStatus === 'error' && (
                                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-center border border-red-500/20 text-sm">
                                    {t('contact_form_error')}
                                </div>
                            )}
                            
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className={styles.primaryButton}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>{t('action_loading')}</span>
                                    </>
                                ) : (
                                    <span>{t('contact_form_submit')}</span>
                                )}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
