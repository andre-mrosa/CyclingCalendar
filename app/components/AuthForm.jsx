"use client";

import { SignIn, SignUp } from '@clerk/nextjs';
import { useClientReady } from '../hooks/useBrowserState';
import { useTranslation } from '../i18n/useTranslation';

export default function AuthForm({ signUp = false }) {
    const ready = useClientReady();
    const { t } = useTranslation();
    // Clerk's host can differ between SSR and its early browser initialization.
    // Keep the initial tree stable, then mount the interactive form after hydration.
    if (!ready) return <p role="status">{t('action_loading')}</p>;
    return signUp ? <SignUp /> : <SignIn />;
}
