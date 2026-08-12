import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeClerkProvider from "./components/ThemeClerkProvider";

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

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" value={{ light: 'light-mode', dark: 'dark' }}>
          <ThemeClerkProvider>
            <Navigation />
            {children}
            <Analytics />
            <SpeedInsights />
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
