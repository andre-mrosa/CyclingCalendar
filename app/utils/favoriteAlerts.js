import { favoriteSnapshot, compareFavoriteSnapshots } from './favoriteChanges.js';
import { isCancelled, registrationDaysUntil } from './planning.js';

export function planFavoriteAlerts(events, before = {}, preferences = {}, now = new Date()) {
    const snapshot = {};
    const notices = [];
    for (const event of events) {
        const current = favoriteSnapshot(event);
        const previous = before[event.id];
        const changes = compareFavoriteSnapshots(previous?.value, current);
        const days = event.registrationClosesAt ? registrationDaysUntil(event.registrationClosesAt, now) : -1;
        const deadlineKey = current.registrationClosesAt;
        const deadline = preferences.deadlines && !isCancelled(event) && days >= 0 && days <= 3 && previous?.deadlineSent !== deadlineKey;
        if ((preferences.changes && changes.length) || deadline) notices.push({ id: event.id, title: event.title, changes: preferences.changes ? changes : [], deadline: deadline ? deadlineKey : null });
        snapshot[event.id] = { value: current, deadlineSent: deadline ? deadlineKey : previous?.deadlineSent || null };
    }
    return { snapshot, notices };
}

export function verifiedEmail(user) {
    return user.emailAddresses?.find(email => email.id === user.primaryEmailAddressId && email.verification?.status === 'verified')?.emailAddress || null;
}

export function alertEmail(notices, language = 'pt') {
    const pt = language === 'pt';
    const labels = pt ? { date: 'Data', location: 'Local', cancelled: 'Cancelamento', registrationClosesAt: 'Fecho das inscrições' } : { date: 'Date', location: 'Location', cancelled: 'Cancellation', registrationClosesAt: 'Registration deadline' };
    const value = (field, raw) => {
        if (field === 'cancelled') return raw ? (pt ? 'Cancelada' : 'Cancelled') : (pt ? 'Agendada' : 'Scheduled');
        if (!raw) return pt ? 'Desconhecido' : 'Unknown';
        if (field === 'date') {
            const [start, end] = raw.split('/');
            const format = v => `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
            const inclusive = new Date(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T00:00:00Z`);
            inclusive.setUTCDate(inclusive.getUTCDate() - 1);
            const last = inclusive.toISOString().slice(0, 10).replaceAll('-', '');
            return start === last ? format(start) : `${format(start)} – ${format(last)}`;
        }
        return String(raw).replace(/T00:00:00\.000Z$/, '');
    };
    const text = notices.map(item => [item.title,
        ...item.changes.map(change => `${labels[change.field]}: ${value(change.field, change.before)} → ${value(change.field, change.after)}`),
        ...(item.deadline ? [`${labels.registrationClosesAt}: ${item.deadline.slice(0, 16).replace('T', ' ')} (Europe/Lisbon)`] : []),
        `https://www.cyclingcalendar.pt/events/${encodeURIComponent(item.id)}`,
    ].join('\n')).join('\n\n');
    return { subject: pt ? 'Novidades nas tuas provas favoritas' : 'Updates to your favourite races',
        text: `${text}\n\n${pt ? 'Gerir ou desativar os alertas' : 'Manage or disable alerts'}: https://www.cyclingcalendar.pt/favoritos\n${pt ? 'Confirma os detalhes junto da organização.' : 'Confirm details with the organiser.'}` };
}
