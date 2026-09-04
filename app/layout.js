import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "Cycling Calendar — Provas de ciclismo em Portugal",
  description: "O calendário unificado de ciclismo em Portugal.",
  icons: {
    icon: "/brand-final.png",
    shortcut: "/brand-final.png",
    apple: "/brand-final.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt"  suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <ThemeClerkProvider>
            {children}
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
