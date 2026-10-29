import test from 'node:test';
import assert from 'node:assert/strict';
import {canReloadApp,startAppUpdates} from '../app/utils/appUpdates.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({remote='new',edit=false,storageFails=false}={}){
    let clock=0,reloads=0,updates=0,changes=0,fetches=0;
    const listeners=new Map(),store=new Map(),notices=[];
    const target={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
    const document={...target,visibilityState:'visible',activeElement:edit?{tagName:'INPUT'}:null,querySelector:()=>null};
    const window={...target,location:{pathname:'/',reload:()=>{reloads++;}},setInterval:fn=>{listeners.set('timer',fn);return 1;},clearInterval:()=>listeners.delete('timer'),
        sessionStorage:{getItem:key=>store.get(key),setItem:(key,value)=>{if(storageFails)throw Error();store.set(key,value);}}};
    const navigator={onLine:true,serviceWorker:{...target,register:async()=>({update:async()=>{updates++;}})}};
    const updater=startAppUpdates({version:'old',window,document,navigator,now:()=>clock,onUpdate:value=>notices.push(value),onCalendarChange:()=>{changes++;},
        fetcher:async url=>{fetches++;return Response.json({version:url==='/api/app-version'?remote:'2026-10-29T10:00:00Z'});}});
    return{updater,window,document,navigator,store,listeners,notices,advance:()=>{clock+=30001;},stats:()=>({reloads,updates,changes,fetches})};
}
test('a new deployed app version reloads once and checks the worker without HTTP cache',async()=>{
    const f=fixture();await settle();assert.equal(f.stats().reloads,1);assert.equal(f.stats().changes,1);
    f.advance();await f.updater.check();assert.equal(f.stats().reloads,1);f.updater.stop();assert.equal(f.listeners.size,0);
});
test('editing and protected forms defer automatic reload, leaving an explicit update button',async()=>{
    const f=fixture({edit:true});await settle();assert.equal(f.stats().reloads,0);assert.deepEqual(f.notices,[true]);
    f.updater.applyUpdate();assert.equal(f.stats().reloads,1);f.updater.stop();
    for(const path of ['/contacto','/sign-in','/sign-up','/admin/users'])assert.equal(canReloadApp({querySelector:()=>null},path),false);
    assert.equal(canReloadApp({querySelector:()=>({})},'/'),false);
});
test('normal startup never reloads and unchanged sync versions do not repeatedly download the catalogue',async()=>{
    const f=fixture({remote:'old'});await settle();assert.equal(f.stats().reloads,0);assert.equal(f.stats().changes,1);
    f.advance();await f.updater.check();assert.equal(f.stats().changes,1);
    f.document.visibilityState='hidden';f.advance();const before=f.stats().fetches;await f.updater.check();assert.equal(f.stats().fetches,before);
    f.document.visibilityState='visible';f.navigator.onLine=false;await f.updater.check();assert.equal(f.stats().fetches,before);f.updater.stop();
});
test('reload-loop guards and unavailable browser storage keep updates manual',async()=>{
    const f=fixture({edit:true});f.store.set('cycling_app_reload','new');f.document.activeElement=null;await settle();assert.equal(f.stats().reloads,0);f.updater.stop();
    const restricted=fixture({storageFails:true});await settle();assert.equal(restricted.stats().reloads,0);assert.deepEqual(restricted.notices,[true]);
    restricted.updater.applyUpdate();assert.equal(restricted.stats().reloads,1);restricted.updater.stop();
});
