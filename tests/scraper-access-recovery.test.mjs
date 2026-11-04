import test from 'node:test';
import assert from 'node:assert/strict';
import {createStopAndGoAccess,retryAt,STOPANDGO_ACCESS_ID} from '../app/lib/scrapers/stopandgoAccess.js';
import {fetchApedalarPage} from '../app/lib/scrapers/apedalarPage.js';
import {fixtureModule} from './fixtureModule.mjs';

test('Stop and Go serializes queued requests and spaces all discovery and detail requests',async()=>{
 let clock=0,active=0,maximum=0;const starts=[];
 const read=createStopAndGoAccess({now:()=>clock,wait:async ms=>{clock+=ms;},fetcher:async()=>{starts.push(clock);active++;maximum=Math.max(maximum,active);await Promise.resolve();active--;return new Response('ok');}});
 await Promise.all(['sitemap.xml','events','events/prova'].map(path=>read('https://stopandgo.net/'+path)));
 assert.deepEqual(starts,[0,2000,4000]);assert.equal(maximum,1);
});
test('the request interval survives the boundary between durable blocks',async()=>{
 let clock=0;const starts=[],options={now:()=>clock,wait:async ms=>{clock+=ms;},fetcher:async()=>{starts.push(clock);return new Response('ok');}};
 const first=createStopAndGoAccess(options);await first('https://stopandgo.net/events/one');
 const second=createStopAndGoAccess({...options,notBefore:first.nextAllowedAt()});await second('https://stopandgo.net/events/two');
 assert.deepEqual(starts,[0,2000]);
});
test('a completed collection resolves the old cooldown without clearing a newer refusal',async()=>{
 let details=JSON.stringify({status:429,retryAt:'2026-11-04T12:00:00Z'});
 const read=createStopAndGoAccess({now:()=>Date.parse('2026-11-04T13:00:00Z'),db:{systemLog:{findUnique:async()=>({details}),updateMany:async({where,data})=>{assert.equal(where.details,details);details=data.details;return {count:1};}}}});
 await read.markResolved();assert.equal(JSON.parse(details).status,200);assert.equal(JSON.parse(details).retryAt,null);
 details=JSON.stringify({status:429,retryAt:'2026-11-04T14:00:00Z'});await read.markResolved();assert.equal(JSON.parse(details).status,429);
});
test('a refusal stops queued work and persists Retry-After across cold invocations',async()=>{
 let clock=Date.parse('2026-11-04T12:00:00Z'),row=null,requests=0;
 const db={systemLog:{findUnique:async()=>row,upsert:async({where,create})=>{assert.equal(where.id,STOPANDGO_ACCESS_ID);row=create;}}};
 const fetcher=async()=>{requests++;return new Response('',{status:429,headers:{'retry-after':'120'}});};
 const options={db,now:()=>clock,wait:async ms=>{clock+=ms;},fetcher};
 const first=createStopAndGoAccess(options);
 const outcomes=await Promise.allSettled([first('https://stopandgo.net/events'),first('https://stopandgo.net/events/prova')]);
 assert.equal(requests,1);for(const result of outcomes){assert.equal(result.status,'rejected');assert.equal(result.reason.retryable,false);assert.equal(result.reason.retryAt,'2026-11-04T12:02:00.000Z');}
 await assert.rejects(createStopAndGoAccess(options)('https://stopandgo.net/sitemap.xml'),{code:'SOURCE_ACCESS_DENIED'});assert.equal(requests,1);
 clock+=120001;const resumed=createStopAndGoAccess({...options,fetcher:async()=>{requests++;return new Response('ok');}});
 assert.equal((await resumed('https://stopandgo.net/events')).status,200);assert.equal(requests,2);
});
test('Retry-After accepts dates and refusals without a valid header use a conservative cooldown',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z');
 assert.equal(retryAt(new Response('',{status:429,headers:{'retry-after':'Wed, 04 Nov 2026 14:00:00 GMT'}}),now),now+7200000);
 for(const value of ['', 'invalid','-5'])assert.equal(retryAt(new Response('',{status:429,headers:{'retry-after':value}}),now),now+3600000);
 assert.equal(retryAt(new Response('',{status:403}),now),now+86400000);
});
test('the first updated invocation respects a recent refusal from the previous deployment',async()=>{
 const now=Date.parse('2026-11-04T12:30:00Z');let requests=0,stored;
 const read=createStopAndGoAccess({now:()=>now,db:{systemLog:{findUnique:async()=>null,findFirst:async()=>({message:'Stop and Go: acesso recusado (HTTP 429)',createdAt:new Date('2026-11-04T12:00:00Z')}),upsert:async args=>{stored=args.create;}}},fetcher:async()=>{requests++;}});
 await assert.rejects(read('https://stopandgo.net/events'),error=>error.retryAt==='2026-11-04T13:00:00.000Z');assert.equal(requests,0);assert.equal(JSON.parse(stored.details).retryAt,'2026-11-04T13:00:00.000Z');
});
test('failed operational-state reads and foreign origins cannot issue source requests',async()=>{
 let requests=0;const read=createStopAndGoAccess({db:{systemLog:{findUnique:async()=>{throw Error('database unavailable');}}},fetcher:async()=>{requests++;}});
 await assert.rejects(read('https://stopandgo.net/events'),/database unavailable/);
 await assert.rejects(read('https://another.test/events'),/origem/);assert.equal(requests,0);
});
test('Apedalar home, listing and foreign redirects are unavailable without fetching their destination',async()=>{
 for(const target of ['https://apedalar.pt','/eventos/','https://another.test/eventos/prova']){
  const calls=[];const page=await fetchApedalarPage('https://apedalar.pt/eventos/antiga',{fetcher:async(url,options)=>{calls.push(url);assert.equal(options.redirect,'manual');return new Response('',{status:302,headers:{location:target}});}});
  assert.ok(page.unavailable);assert.equal(calls.length,1);
 }
});
test('Apedalar permits a canonical event redirect but rejects loops and access refusals',async()=>{
 const calls=[];const page=await fetchApedalarPage('https://apedalar.pt/eventos/antiga',{wait:async()=>{},fetcher:async url=>{calls.push(url);return url.endsWith('antiga')?new Response('',{status:301,headers:{location:'/eventos/info/nova'}}):new Response('<h1>Prova</h1>');}});
 assert.equal(calls.length,2);assert.equal(await page.response.text(),'<h1>Prova</h1>');
 await assert.rejects(fetchApedalarPage('https://apedalar.pt/eventos/ciclo',{wait:async()=>{},fetcher:async()=>new Response('',{status:302,headers:{location:'/eventos/ciclo'}})}),/ciclo/);
 let requests=0;await assert.rejects(fetchApedalarPage('https://apedalar.pt/eventos/prova',{fetcher:async()=>{requests++;return new Response('',{status:403});}}),{retryable:false});assert.equal(requests,1);
});
test('Apedalar records obsolete redirects as unavailable instead of invalid dates or saves',async t=>{
 const saved=[],errors=[],messages=[];let coverage;
 const scraper=await fixtureModule('../app/lib/scrapers/apedalar.js',{'../logger.js':{logInfo:async(_s,message)=>messages.push(message),logError:async(_s,message)=>errors.push(message)},'../merging/eventMerger.js':{saveOrMergeEvent:async(_db,event)=>saved.push(event)}});
 t.mock.method(globalThis,'fetch',async url=>url.endsWith('sitemap.xml')?new Response('<urlset><url><loc>https://apedalar.pt/eventos/antiga</loc></url></urlset>'):new Response('',{status:302,headers:{location:'https://apedalar.pt'}}));
 await scraper.scrapeApedalar({},['2099'],{onCoverage:value=>{coverage=value;}});
 assert.equal(saved.length,0);assert.equal(errors.length,0);assert.equal(coverage.unavailable,1);assert.equal(coverage.failed,0);assert.equal(coverage.unresolved,0);assert.ok(messages.some(value=>value.includes('indisponível')));
});
test('Stop and Go checkpoints a bounded chunk and resumes without rediscovery or duplicate requests',async t=>{
 const urls=Array.from({length:61},(_,i)=>'https://stopandgo.net/events/prova-'+i),calls=[],errors=[];
 const scraper=await fixtureModule('../app/lib/scrapers/stopandgo.js',{'../db.js':{prisma:{}},'../logger.js':{logInfo:async()=>{},logError:async(_s,message)=>errors.push(message)},'./stopandgoAccess.js':{createStopAndGoAccess:()=>globalThis.fetch},'./stopandgoParser.js':{readStopAndGoHeader:()=>({knownModality:true,cycling:false}),stopAndGoEventUrl:url=>url}});
 t.mock.method(globalThis,'fetch',async url=>{calls.push(url);return new Response('header');});
 const first=await scraper.scrapeStopAndGo({progress:{urls,nextIndex:0,outcomes:urls.map(url=>[url,null])}});
 assert.equal(first.continuation.nextIndex,60);assert.equal(calls.length,60);assert.equal(errors.length,0);
 let coverage;await scraper.scrapeStopAndGo({progress:first.continuation,onCoverage:value=>{coverage=value;}});
 assert.deepEqual(calls,urls);assert.equal(coverage.discovered,61);assert.equal(coverage.nonCycling,61);assert.equal(coverage.unresolved,0);assert.equal(errors.length,0);
});
