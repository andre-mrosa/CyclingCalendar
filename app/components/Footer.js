"use client";

import Link from "next/link";
import { useTranslation } from "../i18n/useTranslation";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="text-center p-8 text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-white/5 mt-auto flex flex-col gap-4 items-center bg-slate-100/60 dark:bg-slate-900/50 transition-colors duration-200">
      <div className="flex gap-4 flex-wrap justify-center items-center">
        <Link href="/privacidade" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline">
          {t('footer_privacy')}
        </Link>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Link href="/termos" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline">
          {t('footer_terms')}
        </Link>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <Link href="/contacto" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline">
          {t('contact_title')}
        </Link>
      </div>
      <p className="m-0 text-slate-500">
        &copy; {new Date().getFullYear()} Cycling Calendar. {t('footer_rights')}
      </p>
    </footer>
  );
}
