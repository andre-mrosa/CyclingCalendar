"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

export default function CookieBanner() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('cookies-accepted');
        if (!accepted) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem('cookies-accepted', 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={`${styles.cookie} animate-slide-up`} role="region" aria-label="Cookies">
            <div>
                <h3 className="flex items-center gap-2"><Cookie size={18} />Cookies</h3>
                <p>
                    {t('cookie_text')}{' '}
                    <Link href="/privacidade" className="text-brand hover:underline underline-offset-2">{t('footer_privacy')}</Link>
                </p>
                <div className={styles.cookieActions}>
                    <button 
                        onClick={accept}
                        className={styles.primaryButton}
                    >
                        {t('cookie_accept')}
                    </button>
                </div>
            </div>
        </div>
    );
}
