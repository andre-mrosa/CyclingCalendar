// Called only after an authenticated deletion request is being processed,
// or a verified Clerk user.deleted event. No bulk maintenance runs here.
export async function eraseAccountActivity(db, userId) {
    if (typeof userId !== 'string' || !/^user_[A-Za-z0-9]+$/.test(userId)) throw new Error('Invalid user ID');
    await db.$transaction(async tx => {
        await tx.favoriteAlert.deleteMany({ where: { userId } });
        // Deleting sessions also deletes their events through the database FK.
        await tx.analyticsSession.deleteMany({ where: { userId } });
        await tx.systemLog.deleteMany({ where: { userId } });
        // Keep the request status/date, without its free-text reason or contact details.
        await tx.accountDeletionRequest.updateMany({
            where: { userId },
            data: { status: 'PROCESSED', userEmail: 'removido', userName: null, reason: null },
        });
    });
}
