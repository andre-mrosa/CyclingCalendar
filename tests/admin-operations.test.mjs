import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let sequence=0;
async function route(path,deps){const key=`operations${sequence++}`;globalThis[key]=deps;try{const code=(await readFile(new URL(path,import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'');return await import('data:text/javascript;base64,'+Buffer.from(`const {${Object.keys(deps)}}=globalThis[${JSON.stringify(key)}];\n${code}`).toString('base64'));}finally{delete globalThis[key];}}
const admin=async()=>({authorized:true,userId:'qa',userEmail:'qa@example.test'});
const request=(path,method='GET')=>new Request('https://calendar.test'+path,{method});
test('invalid deletion modes never default to permanent account deletion',async()=>{
 let accessed=0;
 const r=await route('../app/api/admin/users/[id]/route.js',{requireAdmin:admin,clerkClient:async()=>{accessed++;return {users:{getUser:async()=>({id:'temp'}),deleteUser:async()=>{}}};},isMasterAdmin:()=>false,prisma:{accountDeletionRequest:{updateMany:async()=>{}}},logWarn:async()=>{},logError:()=>{}});
 const response=await r.DELETE(request('/api/admin/users/temp?mode=typo','DELETE'),{params:Promise.resolve({id:'temp'})});
 assert.equal(response.status,400);assert.equal(accessed,0);
});
test('failure to look up a user cannot be reported as a successful deletion',async()=>{
 let writes=0;
 const r=await route('../app/api/admin/users/[id]/route.js',{requireAdmin:admin,clerkClient:async()=>({users:{getUser:async()=>{throw Error('Clerk unavailable');}}}),isMasterAdmin:()=>false,prisma:{accountDeletionRequest:{updateMany:async()=>{writes++;}}},logWarn:async()=>{},logError:()=>{}});
 const response=await r.DELETE(request('/api/admin/users/temp?mode=delete_account','DELETE'),{params:Promise.resolve({id:'temp'})});
 assert.ok(response.status>=500);assert.equal(writes,0);
});
test('invalid log retention never reaches the deletion operation',async()=>{
 let writes=0;
 const r=await route('../app/api/admin/logs/route.js',{requireAdmin:admin,cleanOldLogs:async()=>{writes++;return 0;},prisma:{systemLog:{deleteMany:async()=>{writes++;return {count:0};}}},logSystem:async()=>{}});
 for(const query of ['days=-1','days=0','days=abc','days=1.5','days=','days=30&all=true','all=typo'])assert.equal((await r.DELETE(request('/api/admin/logs?'+query,'DELETE'))).status,400,query);
 assert.equal(writes,0);
});
test('log pagination rejects malformed values and database failures remain errors',async()=>{
 let queries=0;
 const r=await route('../app/api/admin/logs/route.js',{requireAdmin:admin,prisma:{systemLog:{findMany:async()=>{queries++;throw Error('Database unavailable');},count:async()=>0}}});
 for(const query of ['limit=abc','limit=-1','page=abc','page=0','page=2x','limit=1.5'])assert.equal((await r.GET(request('/api/admin/logs?'+query))).status,400,query);
 assert.equal(queries,0);const failed=await r.GET(request('/api/admin/logs'));assert.equal(failed.status,503);assert.equal((await failed.json()).success,false);
});

const maintenance = ['reset','cleanup-duplicates','force-cabreira','force-scrape-all','sync-gpx','test-cabreira','admin/translate-all','admin/unify-events'];
for (const path of maintenance) test('maintenance authorization precedes all work: '+path, async()=>{
 for(const status of [401,403,503]) {
  let calls=0;
  const unavailable=new Proxy({}, {get(){calls++;throw Error('Protected operation was reached');}});
  const r=await route('../app/api/'+path+'/route.js',{requireAdmin:async()=>({authorized:false,status,error:'Denied'}),prisma:unavailable,NextResponse:Response,logError:()=>{},translateAllPendingEvents:()=>{calls++;throw Error('Protected operation was reached');},scrapeCabreira:()=>{calls++;throw Error('Protected operation was reached');}});
  for(const method of ['GET','POST'].filter(method=>typeof r[method]==='function')) {
   const response=await r[method](request('/api/'+path,method));assert.equal(response.status,status);assert.equal(calls,0);
  }
 }
});
test('cron fails closed when its secret is absent',async()=>{
 const previous=process.env.CRON_SECRET;delete process.env.CRON_SECRET;let calls=0;
 try {const r=await route('../app/api/cron/scrape/route.js',{startCalendarSync:async()=>{calls++;return {success:true};}});assert.equal((await r.GET(request('/api/cron/scrape'))).status,503);assert.equal(calls,0);}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});

for (const path of maintenance) test('maintenance accepts an admin with isolated dependencies: '+path,async()=>{
 let writes=0;
 const r=await route('../app/api/'+path+'/route.js',{requireAdmin:admin,prisma:{event:{findMany:async()=>[],count:async()=>0,updateMany:async()=>{writes++;return {count:0};}},eventTranslation:{count:async()=>0}},NextResponse:Response,scrapeCabreira:async()=>{},translateAllPendingEvents:async()=>({success:true,count:0,totalPending:0})});
 for(const method of ['GET','POST'].filter(method=>typeof r[method]==='function'))assert.equal((await r[method](request('/api/'+path,method))).status,200);
 if(path==='reset'||path==='cleanup-duplicates')assert.equal(writes,1);
});
test('cron rejects the wrong secret and accepts its configured secret',async()=>{
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='qa-isolated-secret';let calls=0;
 try {const r=await route('../app/api/cron/scrape/route.js',{startCalendarSync:async()=>{calls++;return {success:true};}});assert.equal((await r.GET(request('/api/cron/scrape'))).status,401);assert.equal(calls,0);assert.equal((await r.GET(new Request('https://calendar.test/api/cron/scrape',{headers:{authorization:'Bearer qa-isolated-secret'}}))).status,202);assert.equal(calls,1);}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
