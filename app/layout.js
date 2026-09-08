import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeClerkProvider from "./components/ThemeClerkProvider";
import CalendarShell from "./components/CalendarShell";
import ColorPaletteManager from "./components/ColorPaletteManager";
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
  title: "Cycling Calendar — Provas de ciclismo em Portugal",
  description: "Planeia a tua época de ciclismo: descobre provas em Portugal, guarda a tua seleção e adiciona as datas ao teu calendário com lembretes.",
  icons: {
    icon: "/favicon.ico?v=1.0.0-3",
    shortcut: "/favicon.ico?v=1.0.0-3",
    apple: "/apple-icon.png?v=1.0.0-3",
  },
  manifest: "/manifest.json?v=1.0.0-3",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt"  suppressHydrationWarning>
      <head><style id="color-palettes">{paletteCSS()}</style><script dangerouslySetInnerHTML={{ __html: paletteBootstrap }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-canvas text-ink antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <ThemeClerkProvider>
            <ColorPaletteManager />
            <CalendarShell>{children}</CalendarShell>
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
