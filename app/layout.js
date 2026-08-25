import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeClerkProvider from "./components/ThemeClerkProvider";
import Footer from "./components/Footer";

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
  title: "Calendário de Ciclismo Portugal | FPC & Cabreira Solutions",
  description: "O calendário unificado de ciclismo em Portugal. Descobre todas as provas de Estrada, BTT, XCO, XCM, Enduro e Granfondos. Filtra por escalões, distritos e mais.",
  keywords: ["ciclismo", "portugal", "calendário ciclismo", "fpc", "federação portuguesa de ciclismo", "cabreira solutions", "btt", "granfondo", "xco", "xcm", "provas de ciclismo"],
  authors: [{ name: "CyclingCalendar" }],
  creator: "CyclingCalendar",
  openGraph: {
    title: "Calendário de Ciclismo Portugal",
    description: "O calendário unificado de ciclismo em Portugal. Descobre todas as provas de Estrada, BTT e Granfondos.",
    url: "https://cyclingcalendar.vercel.app",
    siteName: "Calendário de Ciclismo Portugal",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendário de Ciclismo Portugal",
    description: "O calendário unificado de ciclismo em Portugal. Descobre todas as provas de Estrada, BTT e Granfondos.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icon.jpg' },
      { url: '/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icon-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
    ],
    shortcut: '/icon.jpg',
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cycling Calendar",
  },
};

export const viewport = {
  themeColor: "#121212",
};

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import WelcomeModal from "./components/WelcomeModal";
import CookieBanner from "./components/CookieBanner";
import FaviconManager from "./components/FaviconManager";

export default function RootLayout({ children }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200 selection:bg-blue-500/30 selection:text-blue-200 transition-colors duration-200`} suppressHydrationWarning>
        <FaviconManager />
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ThemeClerkProvider>
            <Navigation />
            <main className="min-h-[calc(100vh-120px)] w-full overflow-x-hidden">
              {children}
            </main>
            <Footer />
            <WelcomeModal />
            <CookieBanner />
            <Analytics />
            <SpeedInsights />
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
