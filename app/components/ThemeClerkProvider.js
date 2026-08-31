"use client";

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { ptPT, enUS, esES, frFR } from "@clerk/localizations";
import { dark } from "@clerk/themes";
import { useTranslation } from '../i18n/useTranslation';
import { useSettingsStore } from '../store/useSettingsStore';
import { getPalette } from '../lib/colorPalettes';

const clerkLocalizations = {
  pt: ptPT,
  en: enUS,
  es: esES,
  fr: frFR,
};

export default function ThemeClerkProvider({ children }) {
  const { resolvedTheme } = useTheme();
  const { language } = useTranslation();
  const palette = getPalette(useSettingsStore(state => state.colorPalette));

  const currentLocalization = clerkLocalizations[language] || ptPT;

  return (
    <ClerkProvider 
      localization={currentLocalization}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: {
          colorPrimary: resolvedTheme === 'dark' ? palette.nightAccent : palette.accent,
          colorBackground: resolvedTheme === 'dark' ? '#182623' : '#ffffff',
          colorText: resolvedTheme === 'dark' ? '#edf3ec' : '#182c2a',
          borderRadius: '0.85rem',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        },
        elements: {
          userPreviewAvatarContainer: { display: 'none' },
          userButtonPopoverFooter: { display: 'none' }
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}
