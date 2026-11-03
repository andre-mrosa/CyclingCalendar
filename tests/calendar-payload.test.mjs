import test from 'node:test';
import assert from 'node:assert/strict';
import { packCalendarEvents, unpackCalendarEvents } from '../app/lib/calendarPayload.js';
import { toPublicEvent } from '../app/lib/publicEvent.js';

test('compact catalogue preserves every public field and archive record after transport', () => {
    const events = [
        toPublicEvent({ id: 'antiga-ç/#', title: 'Prova antiga', date: '01 JAN 2024', sortDate: '2024-01-01', source: 'FPC', link: 'https://www.fpciclismo.pt/prova/antiga' }),
        toPublicEvent({ id: 'nova', title: 'Taça Açores', date: '01 JAN 2027', sortDate: '2027-01-01', source: 'FPC', link: 'https://www.fpciclismo.pt/prova/nova', escaloes: ['Juniores'], registrationOpensAt: '2026-11-01', registrationClosesAt: '2026-12-31', lastVerifiedAt: '2026-11-03T09:00:00Z' }),
    ];
    const restored = unpackCalendarEvents(JSON.parse(JSON.stringify(packCalendarEvents(events))));
    assert.deepEqual(restored, events);
    assert.equal(Object.hasOwn(restored[0], 'registrationOpensAt'), false);
    assert.deepEqual(unpackCalendarEvents(packCalendarEvents([])), []);
});

test('compact catalogue keeps the public projection and reduces repeated field names', () => {
    const event = toPublicEvent({ id: 'a', title: 'Prova', date: '01 JAN 2027', source: 'FPC', link: 'https://www.fpciclismo.pt/prova/a' });
    const events = Array.from({ length: 100 }, (_, index) => ({ ...event, id: String(index), description: 'PRIVATE_DESCRIPTION' }));
    const packed = JSON.stringify(packCalendarEvents(events));
    assert.doesNotMatch(packed, /PRIVATE_DESCRIPTION|description/);
    const publicEvents = events.map(({ description, ...value }) => value);
    assert.deepEqual(unpackCalendarEvents(JSON.parse(packed)), publicEvents);
    assert.ok(Buffer.byteLength(packed) < Buffer.byteLength(JSON.stringify(publicEvents)) * 0.8);
});
