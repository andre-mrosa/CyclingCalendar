import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';

const year = new Date().getFullYear() + 1;
const url = `https://stopandgo.net/events/granfondo-fixture-${year}`;
const dates = '<p>Abertura das inscrições dia 01/11/2026</p><p>Inscrições encerram dia 20/12/2026</p>';
const html = `<section><div><h1>Granfondo Fixture</h1><div>Maia, Portugal</div><div>5 jan ${year}</div><div>BTT</div></div></section>${dates}`;
const saved = [];
const scraper = await fixtureModule('../app/lib/scrapers/stopandgo.js', {
 '../db.js': {prisma:{}},
 '../logger.js': {logInfo:async()=>{},logError:async()=>{}},
 '../merging/eventMerger.js': {saveOrMergeEvent:async(_db,event)=>saved.push(event)},
 './stopandgoListing.js': {fetchStopAndGoCyclingLinks:async()=>new Set([url])},
});

test('Stop and Go reads race metadata and registration dates with one successful event request',async t=>{
 saved.length=0;const requests=[];
 t.mock.method(globalThis,'fetch',async requested=>{
  requests.push(requested);
  if(requested==='https://stopandgo.net/sitemap.xml')return new Response(`<urlset><url><loc>${url}</loc></url><url><loc>${url}</loc></url></urlset>`);
  assert.equal(requested,url);
  return new Response(html);
 });
 assert.equal(await scraper.scrapeStopAndGo(),1);
 assert.equal(requests.filter(value=>value===url).length,1);
 assert.equal(saved.length,1);
 assert.equal(saved[0].title,'Granfondo Fixture');
 assert.equal(saved[0].sortDate.toISOString(),`${year}-01-05T00:00:00.000Z`);
 assert.equal(saved[0].details,'Maia, Portugal');
 assert.equal(saved[0].registrationOpensAt.toISOString(),'2026-11-01T00:00:00.000Z');
 assert.equal(saved[0].registrationClosesAt.toISOString(),'2026-12-20T23:59:00.000Z');
});

test('reusing an empty page does not silently trigger an extra request',async t=>{
 t.mock.method(globalThis,'fetch',async()=>assert.fail('Unexpected duplicate request'));
 assert.deepEqual(await scraper.deepScrapeStopAndGo(url,''),{opensAt:null,closesAt:null});
});
