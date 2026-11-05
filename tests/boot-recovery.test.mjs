import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {bootRecovery} from '../app/lib/bootRecovery.js';
import {isPublicBootAsset} from '../app/lib/publicBootAssets.js';
import {CALENDAR_SOURCES} from '../app/lib/calendarSources.js';
import {fixtureModule} from './fixtureModule.mjs';
import {personalNavigation} from '../app/utils/personalCollection.js';
import {DEFAULT_PALETTE,SETTINGS_STORAGE_KEY,normalizePalette} from '../app/lib/colorPalettes.js';
import {fetchJsonDeadline} from '../app/utils/fetchJsonDeadline.js';

test('the independent recovery UI appears without React and disappears if hydration recovers',()=>{
 let timer,ready,cleared=false;const children=[];
 const document={body:{append:node=>children.push(node)},createElement:tag=>({tag,style:{},setAttribute(){},append(...nodes){this.children=nodes;},remove(){children.splice(children.indexOf(this),1);}}),getElementById:id=>children.find(node=>node.id===id)};
 vm.runInNewContext(bootRecovery,{document,location:{href:'https://calendar.test/'},window:{addEventListener:(name,fn)=>{assert.equal(name,'cycling-app-ready');ready=fn;}},setTimeout:(fn,ms)=>{assert.equal(ms,12000);timer=fn;return 1;},clearTimeout:()=>{cleared=true;}});
 timer();assert.equal(children.length,1);assert.equal(children[0].children[2].href,'/offline.html');ready();assert.equal(cleared,true);assert.equal(children.length,0);
});

test('only boot files bypass authentication; APIs and private routes remain authenticated',()=>{
 for(const path of ['/sw.js','/offline.html','/offline-model.js','/offline.css','/offline.js','/_next/static/chunks/app.js','/manifest.json','/icon-192x192.png'])assert.equal(isPublicBootAsset(path),true,path);
 for(const path of ['/api/calendar/events','/admin','/minhas-provas','/definicoes','/offline-secret.js','/_next/data/private.json','/api/sw.js'])assert.equal(isPublicBootAsset(path),false,path);
});

test('calendar/account reads time out on stalled bodies and headers, even if abort is ignored',async()=>{
 for(const fetcher of [()=>new Promise(()=>{}),async()=>({ok:true,json:()=>new Promise(()=>{})})]){
  await assert.rejects(fetchJsonDeadline('/api/events',{}, {fetcher,milliseconds:5}),/REQUEST_TIMEOUT/);
 }
 const {response,data}=await fetchJsonDeadline('/api/events',{}, {fetcher:async()=>Response.json({events:[]})});
 assert.equal(response.ok,true);assert.deepEqual(data,{events:[]});
});

test('existing settings activate every source once, then preserve subsequent user selections',async()=>{
 let options,defaults;const create=fn=>{defaults=fn(update=>Object.assign(defaults,typeof update==='function'?update(defaults):update));return defaults;},persist=(fn,settings)=>{options=settings;return fn;};
 await fixtureModule('../app/store/useSettingsStore.js',{'zustand':{create},'zustand/middleware':{persist},'../lib/colorPalettes.js':{DEFAULT_PALETTE,SETTINGS_STORAGE_KEY,normalizePalette},'../lib/calendarSources.js':{CALENDAR_SOURCES},'../utils/personalCollection.js':{personalNavigation}});
 assert.equal(options.version,4);
 const migrated=options.migrate({selectedSources:['FPC'],language:'en',colorPalette:'forest'});
 assert.deepEqual(migrated.selectedSources,CALENDAR_SOURCES);assert.equal(migrated.language,'en');assert.equal(migrated.colorPalette,'forest');
 // Zustand applies migrate only on version mismatch, not on subsequent version-4 hydration.
 assert.deepEqual(defaults.selectedSources,CALENDAR_SOURCES);
 defaults.toggleSource('FPC');assert.equal(defaults.selectedSources.includes('FPC'),false);
 defaults.toggleSource('FPC');assert.equal(defaults.selectedSources.includes('FPC'),true);
});
