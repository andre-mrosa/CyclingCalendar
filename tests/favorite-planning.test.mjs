import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sortCalendarEvents } from '../app/utils/calendarList.js';
import { favoriteSnapshot, compareFavoriteSnapshots } from '../app/utils/favoriteChanges.js';
import { validSubscriptionToken, subscriptionIcs } from '../app/lib/calendarSubscription.js';

const event = (id, day = 13, extra = {}) => ({ id, title: 'Prova de ciclismo', date: `${day} SET 2026`, sortDate: `2026-09-${day}T00:00:00Z`, source: 'FPC', updatedAt: '2026-09-11T10:00:00Z', ...extra });

test('favorites lead their own date without moving ahead of earlier dates or mutating input', () => {
    const input = [event('first', 12), event('ordinary'), event('star'), event('last', 14)];
    assert.deepEqual(sortCalendarEvents(input, ['star','last']).map(e => e.id), ['first','star','ordinary','last']);
    assert.equal(input[1].id, 'ordinary');
    assert.deepEqual(sortCalendarEvents([event('a'), event('merged',13,{_allIds:['legacy']})], ['legacy']).map(e => e.id), ['merged','a']);
});

test('favorite notices compare material facts and never infer cancellation from missing data', () => {
    const before = favoriteSnapshot(event('a',13,{details:'Porto | Estrada'}));
    assert.deepEqual(compareFavoriteSnapshots(null, before), []);
    assert.deepEqual(compareFavoriteSnapshots(before, null), []);
    assert.deepEqual(compareFavoriteSnapshots(before, {...before, title:'Novo título'}), []);
    const after = favoriteSnapshot(event('a',14,{title:'Prova Cancelada', details:'Braga | Estrada'}));
    assert.deepEqual(compareFavoriteSnapshots(before, after).map(c=>c.field), ['date','location','cancelled']);
});

test('subscription tokens fail closed and support revocation', () => {
    const token='a'.repeat(64);
    assert.equal(validSubscriptionToken(token,token),true);
    for(const candidate of [null,'', 'a'.repeat(63),'b'.repeat(64)]) assert.equal(validSubscriptionToken(candidate,token),false);
    assert.equal(validSubscriptionToken(token,null),false);
});

test('subscription ICS keeps stable identity, updates dates, cancels alarms and emits an empty calendar', () => {
    const first=subscriptionIcs([event('a')],'https://calendar.test');
    const moved=subscriptionIcs([event('a',14)],'https://calendar.test');
    assert.equal(first.match(/UID:([^\r]+)/)[1],moved.match(/UID:([^\r]+)/)[1]);
    assert.match(moved,/DTSTART;VALUE=DATE:20260914/);
    assert.match(moved,/LAST-MODIFIED:20260911T100000Z/);
    const cancelled=subscriptionIcs([event('a',13,{title:'Cancelada'})],'https://calendar.test');
    assert.match(cancelled,/STATUS:CANCELLED/);
    assert.doesNotMatch(cancelled,/VALARM/);
    const empty=subscriptionIcs([],'https://calendar.test');
    assert.match(empty,/BEGIN:VCALENDAR/); assert.doesNotMatch(empty,/VEVENT/);
    assert.doesNotMatch(subscriptionIcs([event('unknown',13,{date:'A definir',sortDate:null})],'https://calendar.test'),/VEVENT/);
});

let seq=0;
async function isolated(path,deps){const key=`subscriptionTest${seq++}`;globalThis[key]=deps;try{const original=await readFile(new URL(path,import.meta.url),'utf8');return await import('data:text/javascript;base64,'+Buffer.from(`const {${Object.keys(deps).join(',')}}=globalThis[${JSON.stringify(key)}];\n`+original.replace(/^import .*;\r?$/gm,'')).toString('base64'));}finally{delete globalThis[key]}}

test('feed reads only the authenticated capability owner favorites and rejects invalid links',async()=>{
    let queries=0;
    const token='a'.repeat(64);
    const route=await isolated('../app/api/calendar/feed/[userId]/[token]/route.js',{
        clerkClient:async()=>({users:{getUser:async()=>({privateMetadata:{calendarSubscriptionToken:token},unsafeMetadata:{favorites:['saved']}})}}),
        prisma:{event:{findMany:async({where})=>{queries++;assert.deepEqual(where.id.in,['saved']);return [event('saved')];}}},
        validSubscriptionToken,subscriptionIcs
    });
    const denied=await route.GET(null,{params:Promise.resolve({userId:'user_123',token:'b'.repeat(64)})});
    assert.equal(denied.status,404); assert.equal(queries,0);
    const ok=await route.GET(null,{params:Promise.resolve({userId:'user_123',token})});
    assert.equal(ok.status,200);assert.equal(ok.headers.get('Cache-Control'),'private, no-store');assert.match(await ok.text(),/UID:event-saved/);
});

test('subscription management requires verified auth and same-origin writes',async()=>{
    let signed=false,writes=0;let privateToken=null;
    const route=await isolated('../app/api/calendar/subscription/route.js',{
        auth:async()=>({userId:signed?'user_123':null}),randomBytes:()=>({toString:()=> 'a'.repeat(64)}),
        clerkClient:async()=>({users:{getUser:async()=>({privateMetadata:{calendarSubscriptionToken:privateToken}}),updateUserMetadata:async(_id,{privateMetadata})=>{writes++;privateToken=privateMetadata.calendarSubscriptionToken;}}})
    });
    assert.equal((await route.GET(new Request('https://calendar.test/api/calendar/subscription'))).status,401);
    signed=true;
    assert.equal((await route.POST(new Request('https://calendar.test/api/calendar/subscription',{method:'POST',headers:{origin:'https://attacker.test'}}))).status,403);
    assert.equal(writes,0);
    const request=method=>new Request('https://calendar.test/api/calendar/subscription',{method,headers:{origin:'https://calendar.test'}});
    const created=await (await route.POST(request('POST'))).json();assert.equal(created.active,true);
    await route.POST(request('POST'));assert.equal(writes,1);
    await route.DELETE(request('DELETE'));assert.equal(privateToken,null);
});

// Failure must leave existing calendar entries intact rather than publishing an empty feed.
test('temporary feed failures return 503 instead of a successful empty calendar',async()=>{
    const route=await isolated('../app/api/calendar/feed/[userId]/[token]/route.js',{
        clerkClient:async()=>{throw new Error('service offline')},prisma:{},validSubscriptionToken,subscriptionIcs
    });
    const result=await route.GET(null,{params:Promise.resolve({userId:'user_123',token:'a'.repeat(64)})});
    assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/VCALENDAR/);
});
