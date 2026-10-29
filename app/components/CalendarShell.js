"use client";

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import Footer from './Footer';
import AnalyticsTracker from './AnalyticsTracker';
import { AnalyticsConsentBanner } from './AnalyticsConsent';
import PushOnboarding from './PushOnboarding';
import { useTranslation } from '../i18n/useTranslation';

export default function CalendarShell({ children }) {
    const pathname = usePathname();
    const { language } = useTranslation();
    if (pathname.startsWith('/admin') || pathname.startsWith('/events/')) return children;
    return <>
        <a href="#conteudo" className="skip-link">{{pt:'Saltar para o conteúdo',en:'Skip to content',es:'Saltar al contenido',fr:'Aller au contenu'}[language] || 'Saltar para o conteúdo'}</a>
        <AnalyticsTracker />
        <AnalyticsConsentBanner />
        <PushOnboarding />
        <Navigation />
        <main id="conteudo" tabIndex={-1} className="min-h-[calc(100vh-240px)] w-full">{children}</main>
        <Footer />
    </>;
}
