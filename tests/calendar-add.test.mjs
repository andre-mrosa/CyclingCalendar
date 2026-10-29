import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detectRaceDate } from '../app/utils/detectRaceDate.js';

async function calendarRoute(userId, token = 'mock-token') {
    let oauthCalls = 0;
    const deps = {
        auth: async () => ({ userId }), detectRaceDate,
        NextResponse: { json: (data, options) => Response.json(data, options) },
        clerkClient: async () => ({ users: { getUserOauthAccessToken: async () => {
            oauthCalls++;
            return { data: token ? [{ token }] : [] };
        } } }),
    };
    const key = 'calendarAddFixture' + Math.random().toString(36).slice(2);
    globalThis[key] = deps;
    const source = (await readFile(new URL('../app/api/calendar/add/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try {
        const route = await import('data:text/javascript;base64,' + Buffer.from(`const { auth, clerkClient, NextResponse, detectRaceDate } = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));
        return { route, oauthCalls: () => oauthCalls };
    } finally { delete globalThis[key]; }
}
const request = body => new Request('https://calendar.test/api/calendar/add', { method: 'POST', body: JSON.stringify(body) });

test('calendar integration requires authentication before OAuth or external calls', async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected external request'));
    const { route, oauthCalls } = await calendarRoute(null);
    assert.equal((await route.POST(request({}))).status, 401);
    assert.equal(oauthCalls(), 0);
});
test('unconfirmed, malformed and unsupported dates are rejected before requesting Google access', async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected external request'));
    const { route, oauthCalls } = await calendarRoute('test-user');
    for (const event of [
        { id: 'unknown', date: 'Data a definir', sortDate: '2027-07-17' },
        { id: 'suspect', date: '17 JUL 2027 a 18 JUL 2028', sortDate: '2027-07-17' },
        { id: 'invalid', date: '31 FEV 2027', sortDate: '2027-02-28' },
    ]) assert.equal((await route.POST(request({ event }))).status, 400);
    assert.equal((await route.POST(request({ event: { id: 'x' }, type: 'unknown' }))).status, 400);
    assert.equal((await route.POST(request({ event: { id: 'x', registrationOpensAt: 'invalid' }, type: 'reg_open' }))).status, 400);
    assert.equal(oauthCalls(), 0);
});
test('authenticated additions use validated multi-day dates and an exclusive calendar end date', async t => {
    const writes = [];
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        if (url.endsWith('/users/me/calendarList')) return Response.json({ items: [{ summary: 'Cycling Calendar', id: 'test-calendar' }] });
        if (options.method === 'POST') { writes.push(JSON.parse(options.body)); return Response.json({ id: 'fake-created-event' }); }
        return Response.json({ items: [] });
    });
    const { route } = await calendarRoute('test-user');
    const response = await route.POST(request({ event: { id: 'race', title: 'Prova', date: '30 DEZ 2026 a 02 JAN 2027', link: 'https://www.fpciclismo.pt/prova/test' } }));
    assert.equal(response.status, 200);
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].start, { date: '2026-12-30' });
    assert.deepEqual(writes[0].end, { date: '2027-01-03' });
});
test('missing Google authorisation returns a permission error without writing a calendar', async t => {
    t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected external request'));
    const { route } = await calendarRoute('test-user', null);
    assert.equal((await route.POST(request({ event: { id: 'x', date: '31 OUT 2026' } }))).status, 403);
});

test('failure to find the dedicated calendar never writes into the personal primary calendar',async t=>{
    let writes=0;t.mock.method(globalThis,'fetch',async(_url,options={})=>{if(options.method==='POST')writes++;return Response.json({error:'Unavailable'},{status:503});});
    const {route}=await calendarRoute('test-user');assert.equal((await route.POST(request({event:{id:'fixture',date:'23 MAI 2027'}}))).status,503);assert.equal(writes,0);
});
test('failed duplicate checks never create a second Google event',async t=>{
    let writes=0;t.mock.method(globalThis,'fetch',async(url,options={})=>{if(url.endsWith('/users/me/calendarList'))return Response.json({items:[{summary:'Cycling Calendar',id:'calendar'}]});if(options.method==='POST')writes++;return Response.json({error:'Unavailable'},{status:503});});
    const {route}=await calendarRoute('test-user');assert.equal((await route.POST(request({event:{id:'fixture',date:'23 MAI 2027'}}))).status,503);assert.equal(writes,0);
});
test('registration exports preserve Lisbon wall-clock deadlines and encode event identifiers',async t=>{
    let written;
    t.mock.method(globalThis,'fetch',async(url,options={})=>{
        if(url.endsWith('/users/me/calendarList'))return Response.json({items:[{summary:'Cycling Calendar',id:'calendar'}]});
        if(options.method==='POST'){written=JSON.parse(options.body);return Response.json({id:'created'});}
        assert.equal(new URL(url).searchParams.get('privateExtendedProperty'),'cyclingCalendarEventId=fixture&a-reg_close');return Response.json({items:[]});
    });
    const {route}=await calendarRoute('test-user');const result=await route.POST(request({event:{id:'fixture&a',registrationClosesAt:'2027-05-18T23:59:00.000Z'},type:'reg_close'}));
    assert.equal(result.status,200);assert.deepEqual(written.start,{dateTime:'2027-05-18T23:59:00',timeZone:'Europe/Lisbon'});
});
