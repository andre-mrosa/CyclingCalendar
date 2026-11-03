import test from 'node:test';
import assert from 'node:assert/strict';
import { personalStatus, personalNavigation, changePersonalStatus } from '../app/utils/personalCollection.js';

const event = { id: 'current', _allIds: ['old-source-id'] };
test('saving a participation state also saves membership without toggling an existing favorite off', async () => {
    const persisted = [], toggles = [];
    await changePersonalStatus(event, 'going', { persist: async value => persisted.push(value), favorites: [], toggleFavorite: id => toggles.push(id) });
    assert.equal(persisted[0].status, 'going');
    assert.deepEqual(toggles, ['current']);
    toggles.length = 0;
    await changePersonalStatus(event, 'registered', { persist: async value => persisted.push(value), favorites: ['old-source-id'], toggleFavorite: id => toggles.push(id) });
    assert.deepEqual(toggles, []);
    await changePersonalStatus(event, '', { persist: async value => persisted.push(value), favorites: ['old-source-id'], toggleFavorite: id => toggles.push(id) });
    assert.equal(persisted.at(-1).status, 'dismissed');
    assert.deepEqual(toggles, ['current']);
});

test('a failed state write cannot remove the saved event; guest saves use local favorites only', async () => {
    const toggles = [];
    await assert.rejects(changePersonalStatus(event, '', { persist: async () => { throw Error('offline'); }, favorites: ['current'], toggleFavorite: id => toggles.push(id) }), /offline/);
    assert.deepEqual(toggles, []);
    await changePersonalStatus(event, 'interested', { favorites: [], toggleFavorite: id => toggles.push(id) });
    assert.deepEqual(toggles, ['current']);
});
test('one collection preserves saved, Google-calendar and status-only events including aliases', () => {
    assert.equal(personalStatus(event, ['old-source-id']), 'interested');
    assert.equal(personalStatus(event, [], new Set(['old-source-id'])), 'interested');
    assert.equal(personalStatus(event, [], new Set(), [{ eventId: 'old-source-id', status: 'registered' }]), 'registered');
    assert.equal(personalStatus(event, ['current'], new Set(['current']), [{ eventId: 'current', status: 'going' }]), 'going');
    assert.equal(personalStatus(event), null);
    assert.equal(personalStatus(event, [], new Set(['current_reg_open'])), null);
});

test('explicit removal overrides legacy sources without modifying favorites or Google entries', () => {
    const saved = ['current'];
    const google = new Set(['current']);
    assert.equal(personalStatus(event, saved, google, [{ eventId: 'old-source-id', status: 'dismissed' }]), null);
    assert.deepEqual(saved, ['current']);
    assert.deepEqual([...google], ['current']);
    assert.equal(personalStatus(event, saved, google, [{ eventId: 'current', status: 'interested' }]), 'interested');
});

test('navigation merges old entries and home preferences while preserving deliberate visibility', () => {
    const state = personalNavigation({ tabsOrder: ['Geral', 'Minha Agenda', 'Nacionais', 'Favoritos'], hiddenTabs: ['Favoritos', 'Nacionais'], defaultPage: '/agenda', language: 'en' });
    assert.deepEqual(state.tabsOrder, ['Geral', 'Favoritos', 'Nacionais']);
    assert.deepEqual(state.hiddenTabs, ['Nacionais']);
    assert.equal(state.defaultPage, '/minhas-provas');
    assert.equal(state.language, 'en');
    assert.deepEqual(personalNavigation({ hiddenTabs: ['Minha Agenda', 'Favoritos'] }).hiddenTabs, ['Favoritos']);
    assert.equal(personalNavigation({ defaultPage: '/internacionais' }).defaultPage, '/internacionais');
});
