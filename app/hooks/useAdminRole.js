'use client';
import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';

export function useAdminRole() {
    const { user, isSignedIn } = useUser();
    const { data } = useSWR(isSignedIn && user ? ['/api/admin/me', user.id] : null,
        async ([url]) => {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error('Role unavailable');
            return response.json();
        });
    return { isAdmin: data?.isAdmin === true, isMaster: data?.isMaster === true };
}
