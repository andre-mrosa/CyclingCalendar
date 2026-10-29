import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';

async function fixture({source='Cabreira, Quarentena',authorized=true,race=false}={}){
    const calls={deleted:0,updated:0,invalidated:0};
    let event={id:'test-id',title:'Registo de teste',source};
    const api=await fixtureModule('../app/api/admin/quarantine/route.js',{
        '@/app/lib/db':{prisma:{event:{findUnique:async()=>event,deleteMany:async({where})=>{assert.equal(where.source.contains,'Quarentena');calls.deleted++;return {count:race?0:1};},updateMany:async({where,data})=>{assert.equal(where.source.contains,'Quarentena');calls.updated++;event={...event,...data};return {count:race?0:1};}}}},
        '@/app/lib/auth-helpers':{requireAdmin:async()=>({authorized,userId:'qa',status:403,error:'Denied'})},
        '@/app/lib/logger':{logInfo:async()=>{},logError:async()=>{}},
        'next/cache':{revalidateTag:()=>{calls.invalidated++;}},
    });
    return {api,calls,getEvent:()=>event};
}
const req=(method,body,query='')=>new Request('https://calendar.test/api/admin/quarantine'+query,{method,...(body!==undefined?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})});

test('quarantine deletion accepts JSON and the previous URL-only client',async()=>{
    for(const request of [req('DELETE',{id:'test-id'}),req('DELETE',undefined,'?id=test-id')]){
        const f=await fixture();const response=await f.api.DELETE(request);
        assert.equal(response.status,200);assert.equal(f.calls.deleted,1);assert.equal(response.headers.get('cache-control'),'no-store');
    }
});
test('quarantine mutations reject missing, malformed and ambiguous identifiers before database writes',async()=>{
    const f=await fixture();
    for(const request of [req('DELETE'),req('DELETE',{id:{bad:true}}),req('DELETE',{id:'x'.repeat(1001)}),req('DELETE',{id:'different'},'?id=test-id'),new Request('https://calendar.test/api/admin/quarantine',{method:'DELETE',body:'{'})])assert.equal((await f.api.DELETE(request)).status,400);
    assert.equal(f.calls.deleted,0);
});
test('only an administrator can restore or delete quarantine records',async()=>{
    const f=await fixture({authorized:false});for(const method of ['PATCH','DELETE'])assert.equal((await f.api[method](req(method,{id:'test-id'}))).status,403);
    assert.equal(f.calls.deleted+f.calls.updated,0);
});
test('active events cannot be deleted or relabelled through the quarantine API',async()=>{
    const f=await fixture({source:'FPC'});for(const method of ['PATCH','DELETE'])assert.equal((await f.api[method](req(method,{id:'test-id'}))).status,409);
    assert.equal(f.calls.deleted+f.calls.updated,0);
});
test('restoration preserves its source, ignores arbitrary replacements and refreshes the public cache',async()=>{
    const f=await fixture();const response=await f.api.PATCH(req('PATCH',{id:'test-id',targetSource:'invented'}));
    assert.equal(response.status,200);assert.equal(f.getEvent().source,'Cabreira');assert.equal(f.calls.invalidated,1);
});
test('a concurrently restored event is protected by the atomic quarantine condition',async()=>{
    const f=await fixture({race:true});for(const method of ['PATCH','DELETE'])assert.equal((await f.api[method](req(method,{id:'test-id'}))).status,409);
});
