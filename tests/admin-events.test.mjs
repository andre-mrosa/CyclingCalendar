import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
let sequence=0;
async function route(deps){const key='adminEventFixture'+sequence++;globalThis[key]=deps;try{const source=(await readFile(new URL('../app/api/admin/events/route.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');return await import('data:text/javascript;base64,'+Buffer.from(`const {${Object.keys(deps)}}=globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));}finally{delete globalThis[key];}}
const request=query=>new Request('https://calendar.test/api/admin/events'+query);
const published={NOT:{source:{contains:'Quarentena'}}};
test('event management authorizes before any catalogue query',async()=>{
 const api=await route({requireAdmin:async()=>({authorized:false,status:403,error:'Denied'}),prisma:new Proxy({},{get(){throw Error('database accessed');}})});
 assert.equal((await api.GET(request(''))).status,403);
});
test('invalid filters and pagination never reach event storage',async()=>{
 let reads=0;const api=await route({requireAdmin:async()=>({authorized:true}),prisma:{$transaction:async()=>{reads++;}}});
 for(const query of ['?page=0','?page=1.5','?page=2x','?period=typo','?source=typo','?search='+('x'.repeat(201))])assert.equal((await api.GET(request(query))).status,400);
 assert.equal(reads,0);
});
test('filtered event management keeps published scope, clamps pages and returns only selected facts',async()=>{
 let captured;const api=await route({requireAdmin:async()=>({authorized:true}),PUBLISHED_EVENTS_WHERE:published,eventPath:event=>'/provas/'+event.id,prisma:{$transaction:async callback=>callback({event:{count:async({where})=>{assert.deepEqual(where.AND[0],published);return 21;},findMany:async args=>{captured=args;return [{id:'race',title:'Race'}];}}})}});
 const response=await api.GET(request('?search=Porto&source=FPC&period=past&page=99'));const data=await response.json();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(data.page,2);assert.equal(data.pages,2);assert.equal(captured.skip,20);assert.equal(captured.take,20);assert.ok(captured.where.AND[1].sortDate.lt);assert.equal(captured.where.AND[2].source.contains,'FPC');assert.equal(captured.where.AND[3].OR[0].title.contains,'Porto');assert.equal(captured.select.programa,undefined);assert.equal(captured.select.image,undefined);assert.equal(data.events[0].path,'/provas/race');
});
test('event management storage failures remain recoverable errors',async()=>{
 const api=await route({requireAdmin:async()=>({authorized:true}),PUBLISHED_EVENTS_WHERE:published,prisma:{$transaction:async()=>{throw Error('offline');}}});
 assert.equal((await api.GET(request(''))).status,503);
});
