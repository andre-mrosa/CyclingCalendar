import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
let sequence=0;
async function route(deps){const key='submissionList'+sequence++;globalThis[key]=deps;try{const source=(await readFile(new URL('../app/api/admin/submissions/route.js',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');return await import('data:text/javascript;base64,'+Buffer.from(`const {${Object.keys(deps)}}=globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));}finally{delete globalThis[key];}}
const privateJson=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const request=query=>new Request('https://calendar.test/api/admin/submissions'+query);
test('submission filters authorize before storage and reject invalid pagination',async()=>{
 let reads=0;const deps={privateJson,requireAdmin:async()=>({authorized:false,status:403}),prisma:{$transaction:async()=>{reads++;}}};
 let api=await route(deps);assert.equal((await api.GET(request(''))).status,403);
 api=await route({...deps,requireAdmin:async()=>({authorized:true})});for(const query of ['?status=typo','?page=0','?page=2x'])assert.equal((await api.GET(request(query))).status,400);assert.equal(reads,0);
});
test('submission list counts all pending work and paginates the selected status',async()=>{
 let query;const api=await route({privateJson,requireAdmin:async()=>({authorized:true}),prisma:{$transaction:async callback=>callback({organizerSubmission:{count:async({where})=>where.status==='PENDING'?125:24,findMany:async args=>{query=args;return [{id:'review'}];}}})}});
 const response=await api.GET(request('?status=APPROVED&page=99')),data=await response.json();
 assert.equal(data.pendingCount,125);assert.equal(data.total,24);assert.equal(data.pages,2);assert.equal(data.page,2);assert.equal(query.where.status,'APPROVED');assert.equal(query.skip,20);assert.equal(query.take,20);assert.equal(response.headers.get('cache-control'),'no-store');
});
