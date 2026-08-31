"use client";

import Link from "next/link";
import { useTranslation } from "../i18n/useTranslation";
import { ArrowUpRight, Bike } from 'lucide-react';
import styles from './site.module.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><Bike size={21} />Cycling Calendar.</Link>
            <p>Estrada · BTT · Gravel · BMX · Pista</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/ajuda">{t('nav_help')}</Link>
            <Link href="/privacidade">{t('footer_privacy')}</Link>
            <Link href="/termos">{t('footer_terms')}</Link>
            <Link href="/contacto" className="inline-flex items-center gap-1">{t('contact_title')}<ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Cycling Calendar. {t('footer_rights')}</p>
          <span>Portugal · Ride your season</span>
        </div>
      </div>
    </footer>
  );
}
