'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { useStoredString, writeStored } from './useBrowserState';
export const editionPreferenceKey = id => 'cycling_edition_preferences_' + (id || 'guest');
export const inheritedFavoriteKey = id => 'cycling_inherited_favorites_' + (id || 'guest');
const initial = { follow: false, email: false, available: false, inheritedIds: [] };
function parse(value) { try { return { ...initial, ...JSON.parse(value) }; } catch { return initial; } }
export function useFavoriteEditionPreferences(userId, ready) {
    const key = editionPreferenceKey(userId);
    const cached = useStoredString(key, JSON.stringify(initial));
    const local = parse(cached);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const { data, error, mutate } = useSWR(ready && userId ? ['/api/favorites/editions', userId] : null,
        async ([url]) => {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error('Edition preferences unavailable');
            return response.json();
        }, { fallbackData: userId ? local : undefined, revalidateOnFocus: true,
            onSuccess: value => writeStored(key, JSON.stringify(value)) });
    const value = userId ? data || local : local;
    async function update(follow, email, language) {
        setBusy(true); setMessage('');
        try {
            let result;
            if (!userId) result = { ...local, follow, email: false, available: false };
            else {
                const response = await fetch('/api/favorites/editions', { method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ follow, email, language }) });
                result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Could not save preferences');
                await mutate(result, false);
            }
            writeStored(key, JSON.stringify(result));
            return true;
        } catch (error) { setMessage(error.message); return false; }
        finally { setBusy(false); }
    }
    return { ...value, follow: ready && !!value.follow, busy, error: message || (error ? 'unavailable' : ''), update };
}
