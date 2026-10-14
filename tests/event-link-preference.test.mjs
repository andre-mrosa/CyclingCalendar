import test from 'node:test';
import assert from 'node:assert/strict';
import { getPreferredEventLink, isFpcUrl, originalEventUrl, toPublicEvent } from '../app/lib/publicEvent.js';
import { mergeEventRecords, saveOrMergeEvent } from '../app/lib/merging/eventMerger.js';
import { mergeEvents } from '../app/utils/mergeEvents.js';

test('isFpcUrl identifies FPC domain and subdomains correctly', () => {
    assert.equal(isFpcUrl('https://www.fpciclismo.pt/calendario'), true);
    assert.equal(isFpcUrl('https://fpciclismo.pt/pagina/race'), true);
    assert.equal(isFpcUrl('https://sub.fpciclismo.pt/'), true);
    assert.equal(isFpcUrl('https://stopandgo.net/events/race'), false);
    assert.equal(isFpcUrl('https://cabreirasolutions.com/evento/race'), false);
    assert.equal(isFpcUrl('https://aclisboa.pt/prova'), false);
    assert.equal(isFpcUrl(null), false);
});

test('getPreferredEventLink prioritizes non-FPC link when another link exists', () => {
    const fpcUrl = 'https://www.fpciclismo.pt/calendario';
    const stopAndGoUrl = 'https://stopandgo.net/events/ourem-fatima-granfondo-2026';
    const stopAndGoRules = 'https://stopandgo.net/events/ourem-fatima-granfondo-2026/rules';

    // FPC primary + non-FPC in extraLinks -> resolves to non-FPC
    assert.equal(
        getPreferredEventLink(fpcUrl, [{ label: 'Stop and Go', link: stopAndGoUrl }]),
        stopAndGoUrl
    );

    // Prefer main landing page over /rules subpath
    assert.equal(
        getPreferredEventLink(fpcUrl, [
            { label: 'Regulamento', link: stopAndGoRules },
            { label: 'Stop and Go', link: stopAndGoUrl }
        ]),
        stopAndGoUrl
    );

    // Non-FPC primary + FPC in extraLinks -> stays non-FPC
    assert.equal(
        getPreferredEventLink(stopAndGoUrl, [{ label: 'FPC', link: fpcUrl }]),
        stopAndGoUrl
    );

    // Only FPC available -> returns FPC
    assert.equal(getPreferredEventLink(fpcUrl, null), fpcUrl);

    // Specific FPC page is preferred over generic /calendario if only FPC exists
    const specificFpc = 'https://www.fpciclismo.pt/pagina/race-prova';
    assert.equal(
        getPreferredEventLink(fpcUrl, [{ label: 'Página FPC', link: specificFpc }]),
        specificFpc
    );
});

test('mergeEventRecords ensures original link points to non-FPC source', () => {
    const fpcEvent = {
        id: 'fpc-race',
        title: 'Granfondo da Serra',
        date: '20 JUN 2026',
        sortDate: new Date('2026-06-20'),
        source: 'FPC',
        link: 'https://www.fpciclismo.pt/calendario'
    };
    const sgEvent = {
        id: 'sg-race',
        title: 'Granfondo da Serra',
        date: '20 JUN 2026',
        sortDate: new Date('2026-06-20'),
        source: 'Stop and Go',
        link: 'https://stopandgo.net/events/granfondo-da-serra-2026'
    };

    // Case 1: Existing is FPC, incoming is Stop and Go
    const merged1 = mergeEventRecords(fpcEvent, sgEvent);
    assert.equal(merged1.link, 'https://stopandgo.net/events/granfondo-da-serra-2026');
    assert.match(merged1.extraLinks, /fpciclismo\.pt/);
    assert.match(merged1.extraLinks, /Ficha Homologação FPC/);

    // Case 2: Existing is Stop and Go, incoming is FPC
    const merged2 = mergeEventRecords(sgEvent, fpcEvent);
    assert.equal(merged2.link, 'https://stopandgo.net/events/granfondo-da-serra-2026');
    assert.match(merged2.extraLinks, /fpciclismo\.pt/);
    assert.match(merged2.extraLinks, /Ficha Homologação FPC/);
});

test('mergeEvents runtime unification selects non-FPC link for duplicates', () => {
    const fpcEvent = {
        id: 'fpc-1',
        title: 'Douro Granfondo',
        date: '03 MAI 2026',
        sortDate: new Date('2026-05-03'),
        source: 'FPC',
        link: 'https://www.fpciclismo.pt/calendario'
    };
    const cabreiraEvent = {
        id: 'cab-1',
        title: 'Douro Granfondo',
        date: '03 MAI 2026',
        sortDate: new Date('2026-05-03'),
        source: 'Cabreira',
        link: 'https://cabreirasolutions.com/evento/douro-granfondo/'
    };

    const merged = mergeEvents([fpcEvent, cabreiraEvent]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].link, 'https://cabreirasolutions.com/evento/douro-granfondo/');
});

test('saveOrMergeEvent does not overwrite existing non-FPC link with FPC link', async () => {
    const existing = {
        id: 'sg-gf',
        title: 'Ourém Fátima Granfondo',
        date: '10 MAI 2026',
        sortDate: new Date('2026-05-10'),
        source: 'Stop and Go',
        link: 'https://stopandgo.net/events/ourem-fatima-granfondo-2026',
        details: 'Ourém',
        regiao: 'Santarém',
        distrito: 'Santarém'
    };

    const incomingFpc = {
        id: 'fpc-gf',
        title: 'Ourém Fátima Granfondo',
        date: '10 MAI 2026',
        sortDate: new Date('2026-05-10'),
        source: 'FPC',
        link: 'https://www.fpciclismo.pt/calendario',
        details: 'Ourém',
        regiao: 'Santarém',
        distrito: 'Santarém'
    };

    let updatedData = null;
    const mockPrisma = {
        event: {
            findUnique: async () => null,
            findMany: async () => [existing],
            update: async ({ data }) => {
                updatedData = data;
                return { ...existing, ...data };
            }
        }
    };

    await saveOrMergeEvent(mockPrisma, incomingFpc);
    assert.ok(updatedData, 'Expected candidate to be updated');
    assert.equal(updatedData.link, 'https://stopandgo.net/events/ourem-fatima-granfondo-2026');
    assert.match(updatedData.source, /Stop and Go/);
    assert.match(updatedData.source, /FPC/);
    assert.match(updatedData.extraLinks, /Ficha Homologação FPC/);
});

test('toPublicEvent uses non-FPC link when extraLinks has one even if link is FPC', () => {
    const event = {
        id: 'race-123',
        title: 'Prova de BTT',
        date: '15 JUN 2026',
        sortDate: new Date('2026-06-15'),
        source: 'FPC, Stop and Go',
        link: 'https://www.fpciclismo.pt/calendario',
        extraLinks: JSON.stringify([
            { label: 'Stop and Go', link: 'https://stopandgo.net/events/prova-de-btt-2026' }
        ])
    };

    const pub = toPublicEvent(event);
    assert.equal(pub.link, 'https://stopandgo.net/events/prova-de-btt-2026');
});
