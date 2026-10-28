import { safeFavoriteIds, effectiveEditionIds } from '../utils/favoriteEditions.js';
export const editionEmailAvailable = () => !!(process.env.RESEND_API_KEY && process.env.CRON_SECRET &&
    process.env.EDITION_ALERTS_FROM_EMAIL && !/onboarding@resend\.dev|[\r\n]/i.test(process.env.EDITION_ALERTS_FROM_EMAIL));
export function favoriteEditionSettings(row, events, user, available = editionEmailAvailable()) {
    const manual = safeFavoriteIds(user?.unsafeMetadata?.favorites);
    const exclusions = safeFavoriteIds(user?.unsafeMetadata?.favoriteEditionExclusions);
    return { follow: row?.follow || false, email: row?.email || false, available,
        inheritedIds: effectiveEditionIds(events, manual, exclusions, row?.state, row?.follow || false) };
}
