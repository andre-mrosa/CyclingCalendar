import { randomUUID, createHash } from 'node:crypto';
import { planFavoriteEditions, safeFavoriteIds } from '../utils/favoriteEditions.js';
import { verifiedEmail } from '../utils/favoriteAlerts.js';
import { lisbonWallClock } from '../utils/planning.js';
import { eventPath } from './eventDiscovery.js';

export function editionAlertEmail(notices, language = 'pt') {
    const labels = {
        pt: ['Novas edições das tuas provas favoritas', 'Encontrámos uma nova edição no calendário:', 'Data publicada', 'Gerir ou desativar estes avisos', 'Confirma os detalhes na fonte antes de te inscreveres.'],
        en: ['New editions of your favorite events', 'We found a new edition in the calendar:', 'Published date', 'Manage or disable these alerts', 'Confirm details at the source before registering.'],
        es: ['Nuevas ediciones de tus pruebas favoritas', 'Encontramos una nueva edición en el calendario:', 'Fecha publicada', 'Gestionar o desactivar estos avisos', 'Confirma los detalles en la fuente antes de inscribirte.'],
        fr: ['Nouvelles éditions de vos épreuves favorites', 'Une nouvelle édition figure au calendrier :', 'Date publiée', 'Gérer ou désactiver ces alertes', 'Confirmez les détails à la source avant de vous inscrire.'],
    }[language] || null;
    const text = labels || ['New editions of your favorite events', 'A new edition is listed:', 'Published date', 'Manage alerts', 'Confirm details at the source.'];
    return { subject: text[0], text: text[1] + '\n\n' + notices.map(({ event }) =>
        `${event.title}\n${text[2]}: ${event.date}\nhttps://www.cyclingcalendar.pt${eventPath(event)}`).join('\n\n') +
        `\n\n${text[4]}\n\n${text[3]}: https://www.cyclingcalendar.pt/favoritos` };
}
const signature = (user, email) => createHash('sha256').update(JSON.stringify([
    email, safeFavoriteIds(user.unsafeMetadata?.favorites).sort(), safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions).sort(),
])).digest('hex');

export async function processFavoriteEditions({ db, users, events, row, send, jsonNull, now = new Date(), emailAvailable = false }) {
    const userId = row.userId;
    const leaseUntil = new Date(now.getTime() + 10 * 60000);
    const claim = await db.favoriteEditionPreference.updateMany({ where: { userId: row.userId, follow: true,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil } });
    if (!claim.count) return 'busy';
    try {
        row = await db.favoriteEditionPreference.findUnique({ where: { userId: row.userId } });
        if (!row?.follow) return 'disabled';
        let user;
        try { user = await users.getUser(row.userId); }
        catch (error) {
            if (error.status === 404) {
                await db.favoriteEditionPreference.deleteMany({ where: { userId: row.userId } });
                return 'deleted';
            }
            throw error;
        }
        const manual = safeFavoriteIds(user.unsafeMetadata?.favorites);
        const excluded = safeFavoriteIds(user.unsafeMetadata?.favoriteEditionExclusions);
        const email = verifiedEmail(user);
        const currentSignature = signature(user, email);
        let pending = row.pending;
        if (pending && (pending.signature !== currentSignature || !row.email || !email)) {
            await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { pending: jsonNull } });
            pending = null;
        }
        if (pending && now.getTime() - new Date(pending.createdAt).getTime() >= 23 * 3600000) return 'needs-review';
        if (!pending) {
            const plan = planFavoriteEditions(events, manual, excluded, row.state);
            if (!row.email) {
                await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { state: plan.state } });
                return 'updated';
            }
            if (!email || !emailAvailable) {
                await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { state: plan.deferredState } });
                return email ? 'unavailable' : 'unverified';
            }
            if (!plan.notices.length) {
                await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { state: plan.state } });
                return 'unchanged';
            }
            if (row.lastSentAt && lisbonWallClock(now).slice(0,10) === lisbonWallClock(new Date(row.lastSentAt)).slice(0,10)) {
                await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { state: plan.deferredState } });
                return 'limited';
            }
            pending = { id: randomUUID(), createdAt: now.toISOString(), to: email, signature: currentSignature,
                ...editionAlertEmail(plan.notices, row.language), state: plan.state };
            await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: { pending, state: plan.deferredState } });
        }
        if (!emailAvailable || !email || !row.email) return 'unavailable';
        const result = await send({ to: pending.to, subject: pending.subject, text: pending.text }, pending.id);
        if (result.error || !result.data?.id) throw new Error('Edition email delivery failed');
        await db.favoriteEditionPreference.update({ where: { userId: row.userId }, data: {
            pending: jsonNull, state: pending.state, lastSentAt: now,
        } });
        return 'sent';
    } finally {
        await db.favoriteEditionPreference.updateMany({ where: { userId, leaseUntil },
            data: { leaseUntil: null, checkedAt: now } });
    }
}
