import test from 'node:test';
import assert from 'node:assert/strict';
import { activatePushDevice, shouldOfferPush } from '../app/utils/pushOnboarding.js';

test('the initial offer is restricted to supported installed apps without a previous permission decision or choice', () => {
    const first = { installed:true, supported:true, permission:'default', choice:null };
    assert.equal(shouldOfferPush(first), true);
    for (const override of [{installed:false},{supported:false},{permission:'granted'},{permission:'denied'},
        {choice:'dismissed'},{choice:'enabled'},{choice:'denied'}]) assert.equal(shouldOfferPush({...first,...override}),false);
});
const subscription = { toJSON:()=>({ endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{} }), unsubscribe:async()=>true };
const options = { publicKey:'AQID', follow:false, email:false, enableFollowing:true, hour:10, timeZone:'Europe/Lisbon', language:'pt' };
test('the activation gesture invokes native subscription immediately, then follows favorites and saves push consent', async () => {
    const calls=[]; let granted;
    const permission = new Promise(resolve=>{granted=resolve;});
    const activation=activatePushDevice({...options,registration:{pushManager:{subscribe:arg=>{calls.push({type:'permission',arg});return permission;}}},
        fetcher:async(url,request)=>{calls.push({type:'request',url,body:JSON.parse(request.body)});return Response.json({enabled:true,hour:10});}});
    assert.equal(calls.length,1);assert.equal(calls[0].type,'permission');assert.equal(calls[0].arg.userVisibleOnly,true);
    granted(subscription);
    const result=await activation;
    assert.equal(calls[1].url,'/api/favorites/editions');assert.deepEqual(calls[1].body,{follow:true,email:false,language:'pt'});
    assert.equal(calls[2].url,'/api/notifications/push');assert.equal(calls[2].body.hour,10);
    assert.equal(result.follow,true);assert.equal(result.subscription,subscription);
});
test('onboarding preserves an existing email choice and settings never enable following implicitly', async () => {
    const requests=[];
    const registration={pushManager:{subscribe:async()=>subscription}};
    const fetcher=async(url,request)=>{requests.push({url,body:JSON.parse(request.body)});return Response.json({enabled:true});};
    await activatePushDevice({...options,email:true,registration,fetcher});
    assert.equal(requests[0].body.email,true);
    requests.length=0;
    await activatePushDevice({...options,follow:true,enableFollowing:false,subscription,registration,fetcher});
    assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/notifications/push');
    requests.length=0;
    await assert.rejects(activatePushDevice({...options,enableFollowing:false,registration,fetcher}),/Enable following/);
    assert.equal(requests.length,0);
});
test('denied permission never changes the account or creates a push registration', async () => {
    let requests=0;
    await assert.rejects(activatePushDevice({...options,registration:{pushManager:{subscribe:async()=>{throw new Error('denied');}}},
        fetcher:async()=>{requests++;}}),/denied/);
    assert.equal(requests,0);
});
test('a failed backend save rolls back only a newly created browser subscription', async () => {
    for (const existing of [false,true]) {
        let unsubscribed=0;
        const sub={...subscription,unsubscribe:async()=>{unsubscribed++;}};
        await assert.rejects(activatePushDevice({...options,follow:true,subscription:existing?sub:null,
            registration:{pushManager:{subscribe:async()=>sub}},fetcher:async()=>Response.json({}, {status:503})}),/save push/);
        assert.equal(unsubscribed,existing?0:1);
    }
});
test('following failures stop push registration and remove the new browser subscription', async () => {
    const requests=[];let unsubscribed=0;
    const sub={...subscription,unsubscribe:async()=>{unsubscribed++;}};
    await assert.rejects(activatePushDevice({...options,registration:{pushManager:{subscribe:async()=>sub}},fetcher:async url=>{
        requests.push(url);return Response.json({}, {status:409});}}),/enable following/);
    assert.deepEqual(requests,['/api/favorites/editions']);assert.equal(unsubscribed,1);
});
