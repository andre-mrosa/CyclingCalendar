import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {CALENDAR_SOURCES,normalizeCalendarSources} from '../app/lib/calendarSources.js';
import {parseListQuery} from '../app/lib/calendarListQuery.js';

test('a changed catalogue version bypasses stale server data as well as the CDN cache',async()=>{
    let catalogue=[{id:'old'}];
    const cache=new Map();
    const {GET}=await fixtureModule('../app/api/events/route.js',{
        'next/cache':{unstable_cache:fn=>async(...args)=>{const key=JSON.stringify(args);if(!cache.has(key))cache.set(key,await fn(...args));return cache.get(key);}},
        '@/app/lib/db':{prisma:{}},
        '@/app/lib/calendarSources':{CALENDAR_SOURCES,normalizeCalendarSources},
        '@/app/lib/calendarListQuery':{parseListQuery,queryCalendarList:async()=>catalogue},
    });
    const request=sync=>GET(new Request('https://calendar.test/api/events?years=all&sync='+sync));
    assert.deepEqual((await (await request('2026-10-29T10:00:00.000Z')).json()).events,[{id:'old'}]);
    catalogue=[{id:'new'}];
    assert.deepEqual((await (await request('2026-10-29T11:00:00.000Z')).json()).events,[{id:'new'}]);
    assert.equal((await request('arbitrary-key')).status,400);
});
