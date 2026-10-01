import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsAggregateKey, analyticsBucket, analyticsSince, normalizeAnalyticsPath } from '../app/lib/analyticsAggregate.js';

test('aggregate dates use one UTC day bucket and keys separate metric dimensions', () => {
    const day = analyticsBucket(new Date('2026-10-01T23:59:59Z'));
    assert.equal(day.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(analyticsAggregateKey(day, 'PAGE_VIEW', '/'), '2026-10-01|PAGE_VIEW|/|');
    assert.notEqual(analyticsAggregateKey(day, 'PAGE_VIEW', '/'), analyticsAggregateKey(day, 'PAGE_VIEW', '/nacionais'));
});

test('date filters include today, seven, thirty or thirteen months of UTC buckets', () => {
    const now = new Date('2026-10-01T15:30:00Z');
    assert.equal(analyticsSince('today', now).toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(analyticsSince('7d', now).toISOString(), '2026-09-25T00:00:00.000Z');
    assert.equal(analyticsSince('30d', now).toISOString(), '2026-09-02T00:00:00.000Z');
    assert.equal(analyticsSince('13m', now).toISOString(), '2025-10-01T00:00:00.000Z');
    assert.equal(analyticsSince('all', now).toISOString(), '2025-10-01T00:00:00.000Z');
    assert.equal(analyticsSince('bogus', now), null);
});

test('only known public paths can enter aggregate analytics', () => {
    assert.equal(normalizeAnalyticsPath('/'), '/');
    assert.equal(normalizeAnalyticsPath('/regionais'), '/regionais');
    for (const path of ['/admin', '/agenda', '/definicoes', '/api/analytics/track', '/events/race', '/?email=x', '/nacionais#top']) {
        assert.equal(normalizeAnalyticsPath(path), null, path);
    }
});
