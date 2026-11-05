import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {privateJson,sameOriginJson} from '../app/lib/requestBody.js';
test('organizer routes require admin and a same-origin JSON request before starting a monthly workflow',async()=>{
 let allowed=false,reads=0,starts=0;
 const route=await fixtureModule('../app/api/admin/organizers/route.js',{'@/app/lib/auth-helpers':{requireAdmin:async()=>({authorized:allowed,error:'Denied',status:403})},'@/app/lib/requestBody':{privateJson,sameOriginJson},'@/app/lib/scrapers/organizers':{organizerStatus:async()=>{reads++;return [];}},'@/app/lib/scrapers/startSync':{startCalendarSync:async options=>{assert.equal(options.scope,'organizers');starts++;return {accepted:true};}}});
 const req=origin=>new Request('https://calendar.test/api/admin/organizers',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal((await route.GET()).status,403);assert.equal((await route.POST(req('https://calendar.test'))).status,403);assert.equal(reads+starts,0);
 allowed=true;assert.equal((await route.POST(req('https://evil.test'))).status,403);assert.equal(starts,0);
 assert.equal((await route.GET()).status,200);assert.equal((await route.POST(req('https://calendar.test'))).status,202);assert.equal(starts,1);
});
