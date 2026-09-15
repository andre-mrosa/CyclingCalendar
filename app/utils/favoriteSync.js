export const favoriteCacheKey = id => `cycling_favorites_${id || 'guest'}`;
export const favoritePendingKey = id => `cycling_pending_favs_sync_${id}`;
export function parseFavorites(raw) {
    try { const value = JSON.parse(raw); return Array.isArray(value) ? value : []; }
    catch { return []; }
}
// Serialize writes per account; pending edits survive failures and reconnects.
export function createFavoriteSynchronizer({ read, write, online }) {
    const queues = new Map();
    return function sync(user) {
        const id = user.id;
        const previous = queues.get(id) || Promise.resolve();
        const task = previous.catch(() => {}).then(async () => {
            if (!online() || read(favoritePendingKey(id)) !== 'true') return;
            const raw = read(favoriteCacheKey(id), '[]');
            await user.update({ unsafeMetadata: { ...user.unsafeMetadata, favorites: parseFavorites(raw) } });
            if (read(favoriteCacheKey(id), '[]') === raw) write(favoritePendingKey(id), 'false');
        }).catch(() => { /* Retry the saved pending list on reconnect. */ });
        queues.set(id, task);
        task.finally(() => { if (queues.get(id) === task) queues.delete(id); });
        return task;
    };
}
