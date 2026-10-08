import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from './lib/seo';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeClerkProvider from "./components/ThemeClerkProvider";
import CalendarShell from "./components/CalendarShell";
import ColorPaletteManager from "./components/ColorPaletteManager";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import { paletteCSS, paletteBootstrap } from "./lib/colorPalettes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "192x192" }, { url: "/favicon.ico" }],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt"  suppressHydrationWarning>
      <head><style id="color-palettes">{paletteCSS()}</style><script dangerouslySetInnerHTML={{ __html: paletteBootstrap }} /></head>
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} min-h-screen bg-canvas text-ink antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <ThemeClerkProvider>
            <ColorPaletteManager />
            <ServiceWorkerRegistration />
            <CalendarShell>{children}</CalendarShell>
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
