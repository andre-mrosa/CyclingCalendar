import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { saveOfflineCatalogue, saveOfflinePersonal } from '../app/utils/offlineSnapshot.js';
import { readOfflineCatalogue, readOfflinePersonal, offlineFilter, offlinePersonalFor, offlineNavigationUrl, OFFLINE_CATALOGUE_KEY } from '../public/offline-model.js';

const race = { id:'race/ç#', title:'Desafio BTT por etapas', date:'13 a 15 NOV 2026', sortDate:'2026-11-13T00:00:00Z', tag:'BTT', ambito:'Prova Aberta', distrito:'Covilhã', source:'FPC', link:'https://www.fpciclismo.pt/prova/example', description:'PRIVATE_DESCRIPTION', programa:'PRIVATE_PROGRAMME', image:'PRIVATE_IMAGE', lat:39, lng:-8 };
function storage() { const data = new Map(); return { getItem:key=>data.get(key)??null, setItem:(key,value)=>data.set(key,value), data }; }
test('offline copies contain only public facts, persist unknown dates and respect a valid empty catalogue', () => {
    const store=storage(); assert.equal(saveOfflineCatalogue(store,[race],new Date('2026-11-03T10:00:00Z')),true);
    const snapshot=readOfflineCatalogue(store); assert.equal(snapshot.events[0].start,'2026-11-13'); assert.equal(snapshot.events[0].stage,true);
    assert.doesNotMatch(store.getItem(OFFLINE_CATALOGUE_KEY),/PRIVATE_|programme|"lat"|"lng"|image/);
    assert.equal(snapshot.updatedAt,'2026-11-03T10:00:00.000Z');
    saveOfflineCatalogue(store,[{...race,date:'Por confirmar',sortDate:''}]); assert.equal(readOfflineCatalogue(store).events[0].start,'');
    saveOfflineCatalogue(store,[]); assert.deepEqual(readOfflineCatalogue(store).events,[]);
    assert.equal(saveOfflineCatalogue({setItem:()=>{throw Error('quota');}},[race]),false);
    assert.deepEqual(readOfflineCatalogue({getItem:()=>{throw Error('blocked');}}).events,[]);
});
test('personal offline copies merge a detail view but are cleared on account change or sign-out', () => {
    const store=storage(), other={...race,id:'other'};
    saveOfflinePersonal(store,'account-A',[race],()=> 'registered',()=>true);
    saveOfflinePersonal(store,'account-A',[other],()=> 'going',()=>false);
    assert.equal(readOfflinePersonal(store).size,2);
    saveOfflinePersonal(store,'account-A',[race],()=>null,()=>false); assert.equal(readOfflinePersonal(store).has(race.id),false);
    saveOfflinePersonal(store,'account-B',[],()=>null,()=>false); assert.equal(readOfflinePersonal(store).size,0);
    saveOfflinePersonal(store,'account-B',[race],()=> 'interested',()=>false);
    saveOfflinePersonal(store,'guest',[],()=>null,()=>false); assert.equal(readOfflinePersonal(store).size,0);
});
test('offline search, saved/Google filtering and multi-day calendar selection work from the stored copy', () => {
    const store=storage();saveOfflineCatalogue(store,[race,{...race,id:'past',date:'18 OUT 2026',sortDate:'2026-10-18T00:00:00Z'}]);
    saveOfflinePersonal(store,'account',[race],()=> 'registered',()=>true);
    const events=readOfflineCatalogue(store).events, personal=readOfflinePersonal(store), filters={today:'2026-11-03'};
    assert.equal(offlineFilter(events,{...filters,query:'covilha',month:'2026-11'}).length,1);
    assert.equal(offlineFilter(events,{...filters,day:'2026-11-14',personalOnly:true,googleOnly:true},personal).length,1);
    assert.equal(offlineFilter(events,{...filters,period:'past'}).length,1);
    assert.equal(offlinePersonalFor({...events[0],id:'merged',aliases:[race.id]},personal).status,'registered');
    assert.equal(offlineNavigationUrl('/minhas-provas','https://calendar.test/'), 'https://calendar.test/minhas-provas');
    for(const href of ['https://evil.test/','/api/calendar/add','/admin','/sign-in','#anchor'])assert.equal(offlineNavigationUrl(href,'https://calendar.test/'),null);
});

function worker(version='new') {
    const listeners=new Map(),buckets=new Map(),calls=[];let online=true,failAsset=false,claimed=false,installed=false;
    const origin='https://calendar.test',key=input=>new URL(typeof input==='string'?input:input.url||input.href,origin).href;
    const caches={keys:async()=>[...buckets.keys()],delete:async name=>buckets.delete(name),open:async name=>{
        if(!buckets.has(name))buckets.set(name,new Map());const bucket=buckets.get(name);
        return{put:async(input,response)=>bucket.set(key(input),response.clone()),match:async input=>bucket.get(key(input))?.clone()};
    }};
    const self={location:new URL('/sw.js?app='+version,origin),addEventListener:(name,fn)=>listeners.set(name,fn),skipWaiting:async()=>{installed=true;},clients:{claim:async()=>{claimed=true;}}};
    vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self,caches,URL,Response,Headers,AbortSignal,fetch:async(input,options)=>{
        calls.push({url:key(input),options});if(!online)throw Error('offline');const path=new URL(key(input)).pathname;
        if(failAsset&&path==='/offline.js')return new Response('failed',{status:503});
        return new Response(path==='/offline.html'?'<html>OFFLINE READER</html>':path.startsWith('/offline.')?'ASSET':'PERSONAL_HTML',{headers:{'Content-Type':path.endsWith('.html')?'text/html':'text/javascript'}});
    }});
    const run=async name=>{let task;listeners.get(name)({waitUntil:value=>{task=value;}});return task;};
    const request=(path,extra={})=>{let response;listeners.get('fetch')({request:{url:new URL(path,origin).href,method:'GET',mode:'navigate',...extra},respondWith:value=>{response=value;}});return response;};
    return{run,request,caches,buckets,calls,setOnline:value=>{online=value;},failAsset:()=>{failAsset=true;},status:()=>({claimed,installed})};
}
test('the worker warms only its own reader and serves a cold navigation and assets with the server offline', async () => {
    const w=worker();await w.run('install');await w.run('activate');assert.deepEqual(w.status(),{claimed:true,installed:true});
    assert.equal(w.calls.length,6);assert.ok(w.calls.every(call=>call.options.credentials==='omit'));
    assert.ok(w.calls.every(call=>!new URL(call.url).pathname.startsWith('/api/')));
    w.setOnline(false);const response=await w.request('/minhas-provas');assert.equal(response.headers.get('X-Cycling-Offline'),'1');assert.match(await response.text(),/OFFLINE READER/);
    const calls=w.calls.length;assert.equal(await (await w.request('/offline.js',{mode:'cors'})).text(),'ASSET');assert.equal(w.calls.length,calls);
});
test('authenticated pages and APIs never enter the cache; POST, HEAD and third-party requests are untouched',async()=>{
    const w=worker();await w.run('install');const response=await w.request('/admin');assert.equal(await response.text(),'PERSONAL_HTML');
    for(const bucket of w.buckets.values())assert.ok([...bucket.keys()].every(url=>/^\/(?:offline(?:-model)?\.(?:html|css|js)|icon-(?:192x192|512x512)\.png)$/.test(new URL(url).pathname)));
    assert.equal(w.request('/api/planning/states',{mode:'cors'}),undefined);
    assert.equal(w.request('/api/calendar/add',{method:'POST',mode:'cors'}),undefined);
    assert.equal(w.request('/',{method:'HEAD'}),undefined);
    assert.equal(w.request('https://accounts.google.com/'),undefined);
});
test('a failed install leaves the previous offline reader intact and activation deletes only project caches',async()=>{
    const failed=worker();await failed.caches.open('cycling-offline-shell-v1-old');failed.failAsset();await assert.rejects(failed.run('install'),/Offline reader unavailable/);assert.equal(failed.status().installed,false);assert.ok(failed.buckets.has('cycling-offline-shell-v1-old'));
    const w=worker();await w.caches.open('cycling-offline-shell-v1-old');await w.caches.open('other-app-cache');await w.run('install');await w.run('activate');assert.ok(!w.buckets.has('cycling-offline-shell-v1-old'));assert.ok(w.buckets.has('other-app-cache'));
});
