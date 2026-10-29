import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validPushSubscription, validPushSchedule, pushClock, pushDue, pushId, processFavoritePush } from '../app/lib/favoritePush.js';
import { planFavoriteEditions, safeFavoriteIds } from '../app/utils/favoriteEditions.js';

const subscription = { endpoint:'https://fcm.googleapis.com/fcm/send/fixture',
    keys:{ p256dh:Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'), auth:Buffer.alloc(16,1).toString('base64url') } };
const race = year => ({ id:'race-'+year, title:'Granfondo Serra da Estrela '+year, date:'23 MAI '+year,
    sortDate:year+'-05-23', source:'FPC', tag:'Granfondo', link:'https://www.fpciclismo.pt/prova/'+year });
const first = race(2026), second = race(2027);
const user = { unsafeMetadata:{ favorites:[first.id] } };
function fixture() {
    let row = { id:pushId(subscription.endpoint), userId:'user_fixture', endpoint:subscription.endpoint,
        ...subscription.keys, enabled:true, hour:10, timeZone:'Europe/Lisbon', language:'pt',
        state:planFavoriteEditions([first],[first.id],[],{}, { baseline:true }).state,
        lastDeliveryDay:null, leaseUntil:null };
    const sent = []; let follow = true; let busy = false;
    const db = { favoritePushSubscription:{
        updateMany:async ({data}) => { if (busy || (data.leaseUntil && row?.leaseUntil)) return {count:0}; if (row) Object.assign(row,data); return {count:row?1:0}; },
        findUnique:async () => row && {...row}, update:async ({data}) => { Object.assign(row,data); }, deleteMany:async () => { row=null; },
    }, favoriteEditionPreference:{ findUnique:async () => ({ follow }) } };
    return { row:()=>row, sent, follow:value=>{follow=value;}, busy:()=>{busy=true;},
        options:{ db, users:{getUser:async()=>user}, events:[first,second], row, now:new Date('2026-10-29T10:00:00Z'),
            send:async (sub,message)=>sent.push({sub,message}) } };
}
test('push subscriptions accept browser services and reject arbitrary hosts, credentials and malformed keys', () => {
    assert.equal(validPushSubscription(subscription),true);
    for (const endpoint of ['https://web.push.apple.com/Qabc','https://updates.push.services.mozilla.com/wpush/v2/id','https://wns2.notify.windows.com/id'])
        assert.equal(validPushSubscription({...subscription,endpoint}),true);
    for (const endpoint of ['http://fcm.googleapis.com/id','https://fcm.googleapis.com.evil.test/id','https://127.0.0.1/','https://example.test/',
        'https://user:pass@fcm.googleapis.com/id','https://fcm.googleapis.com:444/id','https://push.apple.com.evil.test/id'])
        assert.equal(validPushSubscription({...subscription,endpoint}),false);
    for (const value of [null,{}, {...subscription,keys:{p256dh:'bad',auth:'bad'}}]) assert.equal(validPushSubscription(value),false);
});
test('delivery follows the chosen local hour through daylight saving and repeats only on a new local day', () => {
    assert.equal(validPushSchedule(10,'Europe/Lisbon'),true);
    for (const pair of [[24,'Europe/Lisbon'],[-1,'UTC'],['10','UTC'],[10,'bad-zone']]) assert.equal(validPushSchedule(...pair),false);
    const row={enabled:true,hour:10,timeZone:'Europe/Lisbon'};
    assert.equal(pushDue(row,new Date('2026-07-01T08:59:59Z')),false);
    assert.equal(pushDue(row,new Date('2026-07-01T09:00:00Z')),true);
    assert.equal(pushDue(row,new Date('2026-10-29T09:59:59Z')),false);
    assert.equal(pushDue(row,new Date('2026-10-29T10:00:00Z')),true);
    assert.equal(pushDue({...row,lastDeliveryDay:'2026-10-29'},new Date('2026-10-29T23:00:00Z')),false);
    assert.deepEqual(pushClock(new Date('2026-10-29T00:30:00Z'),'Atlantic/Azores'),{day:'2026-10-28',hour:23});
});
test('new editions send once per device, with a real event link; the email cursor does not consume them', async () => {
    const f=fixture();
    assert.equal(await processFavoritePush(f.options),'sent');
    assert.equal(f.sent.length,1); assert.match(f.sent[0].message.body,/2027/); assert.match(f.sent[0].message.url,/^\/provas\//);
    assert.equal(f.row().lastDeliveryDay,'2026-10-29'); assert.equal(f.row().leaseUntil,null);
    assert.equal(await processFavoritePush({...f.options,row:f.row()}),'waiting');
    assert.equal(await processFavoritePush({...f.options,row:f.row(),now:new Date('2026-10-30T10:00:00Z')}),'unchanged');
    assert.equal(f.sent.length,1);
    const other=fixture(); assert.equal(await processFavoritePush(other.options),'sent');
});
test('existing editions, unfollowed events, exclusions and a disabled global toggle generate no pushes', async () => {
    for (const mode of ['existing','removed','excluded','off','busy','before-hour']) {
        const f=fixture();
        if (mode==='existing') f.row().state=planFavoriteEditions([first,second],[first.id],[],{},{baseline:true}).state;
        if (mode==='removed') f.options.users={getUser:async()=>({unsafeMetadata:{favorites:[]}})};
        if (mode==='excluded') f.options.users={getUser:async()=>({unsafeMetadata:{favorites:[first.id],favoriteEditionExclusions:['granfondo:granfondo serra da estrela:2027']}})};
        if (mode==='off') f.follow(false);
        if (mode==='busy') f.busy();
        if (mode==='before-hour') f.options.now=new Date('2026-10-29T09:00:00Z');
        await processFavoritePush(f.options); assert.equal(f.sent.length,0,mode);
    }
});
test('transient delivery failures retain discoveries for retry; expired devices and deleted accounts are removed', async () => {
    const f=fixture(); const before=structuredClone(f.row().state);
    f.options.send=async()=>{throw new Error('transport');};
    await assert.rejects(processFavoritePush(f.options),/transport/);
    assert.deepEqual(f.row().state,before); assert.equal(f.row().lastDeliveryDay,null); assert.equal(f.row().leaseUntil,null);
    f.options.send=async()=>{throw {statusCode:410};};
    assert.equal(await processFavoritePush(f.options),'expired'); assert.equal(f.row(),null);
    const deleted=fixture(); deleted.options.users={getUser:async()=>{throw {status:404};}};
    assert.equal(await processFavoritePush(deleted.options),'deleted'); assert.equal(deleted.row(),null);
});
test('overlapping daily workflows cannot send the same device digest concurrently', async () => {
    const f=fixture();
    const results=await Promise.all([processFavoritePush(f.options),processFavoritePush(f.options)]);
    assert.equal(f.sent.length,1);assert.ok(results.includes('busy'));assert.ok(results.includes('sent'));
});
async function loadRoute(deps) {
    const key='pushRouteFixture';globalThis[key]=deps;
    const source=(await readFile(new URL('../app/api/notifications/push/route.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');
    try{return await import('data:text/javascript;base64,'+Buffer.from(`const {${Object.keys(deps)}}=globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));}
    finally{delete globalThis[key];}
}
test('push routes scope reads and deletion to the owner and require authentication, origin and explicit following', async () => {
    let userId=null;let follow=false;let saved;let deleted;
    const deps={auth:async()=>({userId}),clerkClient:async()=>({users:{getUser:async()=>user}}),getPublicCalendarEvents:async()=>[first,second],
        pushAvailable:()=>true,pushId,validPushSubscription,validPushSchedule,planFavoriteEditions,safeFavoriteIds,
        prisma:{favoriteEditionPreference:{findUnique:async()=>({follow})},favoritePushSubscription:{
            findFirst:async({where})=>{assert.equal(where.userId,'user_owner');return null;},findUnique:async()=>null,count:async()=>0,
            create:async({data})=>(saved=data),deleteMany:async({where})=>{deleted=where;},
        }}};
    const route=await loadRoute(deps);
    const request=(method,body={},origin='https://calendar.test')=>new Request('https://calendar.test/api/notifications/push',{method,headers:{origin},...(method==='GET'?{}:{body:JSON.stringify(body)})});
    assert.equal((await route.GET(request('GET'))).status,401);
    assert.equal((await route.PUT(request('PUT'))).status,401);
    assert.equal((await route.DELETE(request('DELETE'))).status,401);
    userId='user_owner';
    assert.equal((await route.PUT(request('PUT',{},'https://evil.test'))).status,403);
    assert.equal((await route.PUT(request('PUT'))).status,400);
    const body={subscription,hour:10,timeZone:'Europe/Lisbon',language:'pt'};
    assert.equal((await route.PUT(request('PUT',body))).status,409);
    follow=true;assert.equal((await route.PUT(request('PUT',body))).status,200);
    assert.equal(saved.userId,userId);assert.equal(saved.hour,10);
    assert.deepEqual(saved.state.seenKeys,['granfondo:granfondo serra da estrela:2027']);
    const id=pushId(subscription.endpoint);
    assert.equal((await route.GET(new Request('https://calendar.test/api/notifications/push?id='+id))).status,200);
    assert.equal((await route.DELETE(request('DELETE',{id},'https://evil.test'))).status,403);
    assert.equal((await route.DELETE(request('DELETE',{id}))).status,200);assert.equal(deleted.id,id);assert.equal(deleted.userId,userId);assert.ok(deleted.OR);
});
test('service worker displays pushes and opens only same-origin event or favorites pages', async () => {
    const handlers={},shown=[],opened=[];let closed=0;
    const context={self:{addEventListener:(name,fn)=>{handlers[name]=fn;},location:{origin:'https://calendar.test'},
        registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}},URL};
    vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),context);
    let done;
    handlers.push({data:{json:()=>({title:'New edition',body:'Real race',url:'/provas/race',tag:'daily'})},waitUntil:value=>{done=value;}});await done;
    assert.equal(shown[0][0],'New edition');assert.equal(shown[0][1].tag,'daily');assert.equal(shown[0][1].renotify,false);
    for (const url of ['/provas/race','https://evil.test/','/admin']) {
        handlers.notificationclick({notification:{data:{url},close:()=>closed++},waitUntil:value=>{done=value;}});await done;
    }
    assert.deepEqual(opened,['https://calendar.test/provas/race','https://calendar.test/favoritos','https://calendar.test/favoritos']);assert.equal(closed,3);
});

test('test notifications require an enabled owned device and are rate limited independently of digests', async () => {
    let owner=null;let allowed=true;let sends=0;let found=false;
    const deps={auth:async()=>({userId:owner}),pushAvailable:()=>true,sendPush:async()=>{sends++;},
        prisma:{favoritePushSubscription:{findFirst:async({where})=>{assert.equal(where.userId,'user_owner');assert.equal(where.enabled,true);
            return found?{...subscription, ...subscription.keys,language:'pt'}:null;},
            updateMany:async({where,data})=>{assert.equal(where.userId,'user_owner');assert.ok(data.lastTestAt);return {count:allowed?1:0};}}}};
    const route=await loadRoute(deps);
    const req=(origin='https://calendar.test')=>new Request('https://calendar.test/api/notifications/push',{method:'POST',headers:{origin},body:JSON.stringify({id:pushId(subscription.endpoint)})});
    assert.equal((await route.POST(req())).status,401);owner='user_owner';
    assert.equal((await route.POST(req('https://evil.test'))).status,403);
    assert.equal((await route.POST(req())).status,404);assert.equal(sends,0);
    found=true;assert.equal((await route.POST(req())).status,200);assert.equal(sends,1);
    allowed=false;assert.equal((await route.POST(req())).status,429);assert.equal(sends,1);
});

test('the daily durable scheduler covers a full day and continues after an exhausted transport retry', async () => {
    const waits=[];let calls=0;
    globalThis.pushWorkflowFixture={sleep:async date=>waits.push(date),deliverFavoritePushBatch:async()=>{if(++calls===2)throw Error('temporary');}};
    const source=(await readFile(new URL('../app/workflows/favoritePush.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');
    try {
        const workflow=await import('data:text/javascript;base64,'+Buffer.from('const {sleep,deliverFavoritePushBatch}=globalThis.pushWorkflowFixture;\n'+source).toString('base64'));
        await workflow.favoritePushWorkflow('2026-10-29T00:47:00Z');
        assert.equal(calls,101);assert.equal(waits.length,100);
        assert.equal(waits[0].toISOString(),'2026-10-29T01:00:00.000Z');
        assert.equal(waits.at(-1).toISOString(),'2026-10-30T01:45:00.000Z');
    } finally {delete globalThis.pushWorkflowFixture;}
});
