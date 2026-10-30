import test from 'node:test';
import assert from 'node:assert/strict';
import {regionLookupUrl,lookupRegion} from '../app/lib/regionLookup.js';
import {fixtureModule} from './fixtureModule.mjs';

function leaseDatabase(){let row=null;return {systemLog:{
 create:async({data})=>{if(row)throw Object.assign(new Error('Duplicate'),{code:'P2002'});row={...data};return row;},
 updateMany:async({where,data})=>{if(!row||row.id!==where.id||(where.details&&row.details!==where.details)||(where.createdAt&&row.createdAt>where.createdAt.lte))return {count:0};Object.assign(row,data);return {count:1};},
}};}
const place={lat:'38.123456',lon:'-9.123456',display_name:'Private street, Lisboa',address:{house_number:'1',road:'Private street',postcode:'1234-567',county:'Lisboa',state_district:'Lisboa',country_code:'pt'}};

test('GPS precision is reduced before leaving the application and invalid queries are rejected',()=>{
 const url=regionLookupUrl({mode:'reverse',latitude:38.123456,longitude:-9.123456});
 assert.equal(url.searchParams.get('lat'),'38.12');assert.equal(url.searchParams.get('lon'),'-9.12');assert.equal(url.searchParams.get('zoom'),'8');
 for(const value of [{mode:'reverse',latitude:91,longitude:0},{mode:'reverse',latitude:'38',longitude:0},{mode:'search',query:'x'},{mode:'search',query:'x'.repeat(101)},{mode:'other'}])assert.throws(()=>regionLookupUrl(value),{status:400});
});

test('regional lookup forwards no account/IP headers, returns no street or coordinates and caches repeats',async()=>{
 const db=leaseDatabase(),cacheStore=new Map();let calls=0;
 const options={db,cacheStore,clock:()=>1000,fetchImpl:async(url,options)=>{
  calls++;assert.equal(new URL(url).hostname,'nominatim.openstreetmap.org');
  assert.deepEqual(Object.keys(options.headers).sort(),['Accept','Referer','User-Agent']);
  assert.match(options.headers['User-Agent'],/cyclingcalendar\.pt\/contacto/);assert.equal(options.redirect,'error');
  return Response.json([place]);
 }};
 const input={mode:'search',query:'Lisboa'};
 const first=await lookupRegion(input,options);
 assert.deepEqual(first,[{address:{county:'Lisboa',state_district:'Lisboa'},display_name:'Lisboa'}]);
 assert.doesNotMatch(JSON.stringify(first),/Private|1234|38\.123/);
 assert.deepEqual(await lookupRegion(input,options),first);assert.equal(calls,1);
});

test('a shared database lease limits independent server instances and imposes cooldown after delivery',async()=>{
 const db=leaseDatabase();let now=1000,calls=0,finish;
 const fetchImpl=()=>{calls++;return new Promise(resolve=>{finish=()=>resolve(Response.json([place]));});};
 const first=lookupRegion({mode:'search',query:'Lisboa'},{db,cacheStore:new Map(),clock:()=>now,fetchImpl});
 await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(lookupRegion({mode:'search',query:'Porto'},{db,cacheStore:new Map(),clock:()=>now,fetchImpl}),{status:429});
 finish();await first;
 await assert.rejects(lookupRegion({mode:'search',query:'Porto'},{db,cacheStore:new Map(),clock:()=>now,fetchImpl}),{status:429});
 assert.equal(calls,1);now+=1201;
 await lookupRegion({mode:'search',query:'Porto'},{db,cacheStore:new Map(),clock:()=>now,fetchImpl:async()=>{calls++;return Response.json([place]);}});
 assert.equal(calls,2);
});

test('provider failures release the reservation with cooldown and never become successful empty results',async()=>{
 const db=leaseDatabase();let now=1000;
 const options={db,cacheStore:new Map(),clock:()=>now,fetchImpl:async()=>new Response('',{status:503})};
 await assert.rejects(lookupRegion({mode:'search',query:'Lisboa'},options),{status:503});
 await assert.rejects(lookupRegion({mode:'search',query:'Porto'},options),{status:429});
 now+=1201;options.fetchImpl=async()=>Response.json([place]);
 assert.equal((await lookupRegion({mode:'search',query:'Porto'},options)).length,1);
});

test('the endpoint refuses cross-origin, oversized and malformed requests before any lookup',async()=>{
 let called=0;
 const {POST}=await fixtureModule('../app/api/region-lookup/route.js',{'@/app/lib/db':{prisma:{}},'@/app/lib/regionLookup':{lookupRegion:async input=>{called++;return input;}}});
 const request=(body,origin='https://www.cyclingcalendar.pt')=>new Request('https://www.cyclingcalendar.pt/api/region-lookup',{method:'POST',headers:{origin,'Content-Type':'application/json'},body});
 assert.equal((await POST(request('{}','https://other.example'))).status,403);
 assert.equal((await POST(request('x'.repeat(2049)))).status,400);
 assert.equal((await POST(request('invalid'))).status,400);assert.equal(called,0);
 const response=await POST(request('{"mode":"search","query":"Lisboa"}'));
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(called,1);
});
