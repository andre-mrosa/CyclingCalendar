export const PUSH_ONBOARDING_KEY = 'cycling_push_onboarding_v1';
export function shouldOfferPush({ installed, supported, permission, choice }) {
    return installed && supported && permission === 'default' && !choice;
}
const keyBytes = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));

export async function activatePushDevice({ registration, subscription, publicKey, follow, email,
    enableFollowing = false, hour, timeZone, language, fetcher = fetch }) {
    if (!follow && !enableFollowing) throw new Error('Enable following first');
    let created = false;
    try {
        // No request or other asynchronous work before this call: Safari needs
        // subscription to be requested directly from the user's button tap.
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:keyBytes(publicKey) });
            created = true;
        }
        if (!follow) {
            const response = await fetcher('/api/favorites/editions', { method:'PUT', headers:{ 'Content-Type':'application/json' },
                body:JSON.stringify({ follow:true, email:!!email, language }) });
            if (!response.ok) throw new Error('Could not enable following');
        }
        const response = await fetcher('/api/notifications/push', { method:'PUT', headers:{ 'Content-Type':'application/json' },
            body:JSON.stringify({ subscription:subscription.toJSON(), hour, timeZone, language }) });
        if (!response.ok) throw new Error('Could not save push preferences');
        return { ...await response.json(), subscription, follow:true };
    } catch (error) {
        if (created) await subscription.unsubscribe().catch(() => {});
        throw error;
    }
}
