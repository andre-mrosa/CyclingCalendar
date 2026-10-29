export async function deliverFavoritePushBatch() {
    'use step';
    const [{ prisma }, { clerkClient }, { getPublicCalendarEvents }, helpers, { sendPush }] = await Promise.all([
        import('../lib/db.js'), import('@clerk/nextjs/server'), import('../lib/getPublicCalendarEvents.js'),
        import('../lib/favoritePush.js'), import('../lib/sendPush.js'),
    ]);
    if (!helpers.pushAvailable()) return { unavailable: true };
    const client = await clerkClient();
    const counts = {};
    let cursor;
    let events;
    do {
        const rows = await prisma.favoritePushSubscription.findMany({ where: { enabled: true }, orderBy: { id: 'asc' },
            take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
        for (const row of rows) {
            if (!helpers.pushDue(row, new Date())) continue;
            events ||= await getPublicCalendarEvents();
            try {
                const result = await helpers.processFavoritePush({ db: prisma, users: client.users, events, row, send: sendPush });
                counts[result] = (counts[result] || 0) + 1;
            } catch { counts.failed = (counts.failed || 0) + 1; }
        }
        cursor = rows.length === 100 ? rows.at(-1).id : null;
    } while (cursor);
    // Retry failed transports using the persisted device cursor and the same tag.
    if (counts.failed) throw new Error('Some favorite push deliveries failed');
    return counts;
}
deliverFavoritePushBatch.maxRetries = 2;
