// Confirmation and preservation happen before the external deletion request.
export async function removeCalendarEvent(event, { confirm, preserve, refresh, request = fetch,target='event' }) {
    if (!await confirm()) return false;
    if (preserve) await preserve();
    try {
        const response = await request('/api/calendar/remove', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: { id: event.id, _allIds: event._allIds || [] }, target }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Calendar removal failed');
        await refresh();
        return true;
    } catch (error) {
        // Reflect partial provider failures too; never optimistically hide an event.
        await refresh().catch(() => {});
        throw error;
    }
}
