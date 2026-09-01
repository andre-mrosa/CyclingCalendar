import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeClerkProvider from "./components/ThemeClerkProvider";
import Footer from "./components/Footer";
import ColorPaletteManager from './components/ColorPaletteManager';
import { paletteCSS, paletteBootstrap } from './lib/colorPalettes';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://cyclingcalendar.pt"),
  title: "Cycling Calendar — Provas de ciclismo em Portugal",
  description: "O calendário unificado de ciclismo em Portugal. Descobre provas de estrada, BTT, XCO, XCM, enduro e granfondos, reunidas num só lugar.",
  keywords: ["ciclismo", "portugal", "calendário ciclismo", "fpc", "federação portuguesa de ciclismo", "cabreira solutions", "btt", "granfondo", "xco", "xcm", "provas de ciclismo"],
  authors: [{ name: "CyclingCalendar" }],
  creator: "CyclingCalendar",
  openGraph: {
    title: "Cycling Calendar — A tua próxima linha de partida",
    description: "Provas de estrada, BTT e granfondos em Portugal, reunidas num calendário simples e atualizado.",
    url: "https://cyclingcalendar.pt",
    siteName: "Cycling Calendar",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cycling Calendar — A tua próxima linha de partida",
    description: "Provas de estrada, BTT e granfondos em Portugal, reunidas num calendário simples e atualizado.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/brand.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icon-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-icon.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
    shortcut: '/brand.svg',
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cycling Calendar",
  },
};

export const viewport = {
  themeColor: "#0b1727",
};

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CookieBanner from "./components/CookieBanner";
import PWAUpdateHandler from "./components/PWAUpdateHandler";
import ClientErrorLogger from "./components/ClientErrorLogger";
import AnalyticsTracker from "./components/AnalyticsTracker";

export default function RootLayout({ children }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <style id="color-palettes">{paletteCSS()}</style>
        <script dangerouslySetInnerHTML={{ __html: paletteBootstrap }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-200`} suppressHydrationWarning>
        <a href="#conteudo" className="skip-link">Saltar para o conteúdo</a>
        <ClientErrorLogger />
        <PWAUpdateHandler />
        <ColorPaletteManager />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <ThemeClerkProvider>
            <AnalyticsTracker />
            <Navigation />
            <main id="conteudo" tabIndex={-1} className="min-h-[calc(100vh-240px)] w-full">
              {children}
            </main>
            <Footer />
            <CookieBanner />
            <Analytics />
            <SpeedInsights />
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
