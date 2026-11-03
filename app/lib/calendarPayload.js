import { PUBLIC_EVENT_SELECT } from './publicEvent.js';

const publicFields = Object.keys(PUBLIC_EVENT_SELECT);

// Send shared field names once instead of repeating them in every event's
// hydration data. Keep the whole public catalogue, including archive records.
export function packCalendarEvents(events) {
    const fields = publicFields.filter(field => events.every(event => Object.hasOwn(event, field)));
    const optionalFields = publicFields.filter(field => !fields.includes(field));
    return {
        fields,
        rows: events.map(event => [
            ...fields.map(field => event[field]),
            Object.fromEntries(optionalFields.filter(field => Object.hasOwn(event, field)).map(field => [field, event[field]])),
        ]),
    };
}

export function unpackCalendarEvents({ fields, rows }) {
    return rows.map(row => Object.fromEntries([
        ...fields.map((field, index) => [field, row[index]]),
        ...Object.entries(row[fields.length]),
    ]));
}
