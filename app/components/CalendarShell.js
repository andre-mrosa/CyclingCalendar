"use client";

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import Footer from './Footer';

export default function CalendarShell({ children }) {
    const pathname = usePathname();
    if (pathname.startsWith('/admin') || pathname.startsWith('/events/')) return children;
    return <>
        <a href="#conteudo" className="skip-link">Saltar para o conteúdo</a>
        <Navigation />
        <main id="conteudo" tabIndex={-1} className="min-h-[calc(100vh-240px)] w-full">{children}</main>
        <Footer />
    </>;
}
