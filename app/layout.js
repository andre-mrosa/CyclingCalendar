import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./SettingsContext";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Calendário FPC",
  description: "Eventos da Federação Portuguesa de Ciclismo e Cabreira Solutions",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Calendário FPC",
  },
};

export const viewport = {
  themeColor: "#121212",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SettingsProvider>
          <nav style={{
            display: 'flex',
            gap: '1.5rem',
            padding: '1rem 2rem',
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--card-border)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch' // Smooth scroll for iOS
          }}>
            <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
              🏠 Geral
            </Link>
            <Link href="/nacionais" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="https://flagcdn.com/w20/pt.png" width="18" height="13" alt="Portugal" style={{ borderRadius: '2px' }} /> Nacionais
            </Link>
            <Link href="/tacas" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
              🏆 Taças
            </Link>
            <Link href="/regionais" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
              📍 Regionais
            </Link>
            <Link href="/lazer" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
              🚴 Lazer
            </Link>
            <Link href="/conta" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 'bold', marginLeft: 'auto' }}>
              ⚙️ Conta
            </Link>
          </nav>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
