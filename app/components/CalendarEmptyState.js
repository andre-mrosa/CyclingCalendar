"use client";
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { ArrowRight, CalendarCheck, Star } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import PageHeading from './PageHeading';
import styles from './site.module.css';

export default function CalendarEmptyState({ agenda = false, signedOut = false }) {
    const { t } = useTranslation();
    const prefix = agenda ? 'page_agenda' : 'page_favorites';
    const Icon = agenda ? CalendarCheck : Star;
    return (
        <div className={styles.page}>
            <section className={styles.empty}>
                <div className={styles.emptyIcon}><Icon size={32} aria-hidden="true" /></div>
                <PageHeading title={t(`${prefix}_${signedOut ? 'title' : 'empty_title'}`)} subtitle={t(`${prefix}_${signedOut ? 'signin_desc' : 'empty_desc'}`)} icon={Icon} />
                {signedOut ? <SignInButton mode="modal"><button className={styles.primaryButton}>{t('nav_signin')}<ArrowRight size={16} /></button></SignInButton> :
                    <Link href="/" className={styles.primaryButton}>{t('page_favorites_explore_btn')}<ArrowRight size={16} /></Link>}
            </section>
        </div>
    );
}
