"use client";

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { ptPT } from "@clerk/localizations";
import { dark } from "@clerk/themes";

export default function ThemeClerkProvider({ children }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider 
      localization={ptPT}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: {
          colorPrimary: '#3b82f6',
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
