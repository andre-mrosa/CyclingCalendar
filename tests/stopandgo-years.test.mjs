import test from 'node:test';
import assert from 'node:assert/strict';
import {readStopAndGoHeader,stopAndGoWithinYears} from '../app/lib/scrapers/stopandgoParser.js';
import {fixtureModule} from './fixtureModule.mjs';
const page=(date,title='Prova BTT')=>`<nav>Calendário 2026</nav><section><div><h1>${title}</h1><div>Maia</div><div>${date}</div><div>BTT</div></div></section><aside>Prova recomendada 5 jan 2027</aside>`;
test('the race year comes from its dated header, never title, navigation, URL or the current year',()=>{
 const old=readStopAndGoHeader(page('<div>24 <span>mar</span> <span>2019</span></div>','Prova BTT 2026'));
 assert.equal(old.year,'2019');assert.equal(old.sortDate.toISOString(),'2019-03-24T00:00:00.000Z');assert.equal(stopAndGoWithinYears(old,['2026','2027']),false);
 const current=readStopAndGoHeader(page('24 mar 2027','Prova BTT 2019'));
 assert.equal(current.year,'2027');assert.equal(stopAndGoWithinYears(current,['2026','2027']),true);
 assert.equal(readStopAndGoHeader(page('24 mar','Prova BTT 2026')).sortDate,null);
 assert.equal(readStopAndGoHeader(page('24 mar 0026')).sortDate,null);
});
test('cross-year races overlap the requested seasons while distant and invalid ranges stay excluded',()=>{
 const crossing=readStopAndGoHeader(page('31 dez 2026 2 jan 2027'));
 assert.equal(crossing.year,'2026');assert.equal(crossing.endDate.toISOString(),'2027-01-02T00:00:00.000Z');
 assert.equal(stopAndGoWithinYears(crossing,['2026']),true);assert.equal(stopAndGoWithinYears(crossing,['2027']),true);assert.equal(stopAndGoWithinYears(crossing,['2028']),false);
 assert.equal(stopAndGoWithinYears(readStopAndGoHeader(page('5 jan 2028')),['2026','2027']),false);
 assert.equal(stopAndGoWithinYears(readStopAndGoHeader(page('29 fev 2027')),['2027']),false);
 assert.equal(stopAndGoWithinYears(readStopAndGoHeader(page('31 dez 2027 2 jan 2027')),['2027']),false);
});
test('listing membership and an allowed year in the slug cannot override the actual year on the page',async t=>{
 const urls=['https://stopandgo.net/events/neutral-2098','https://stopandgo.net/events/old-slug-2019'];
 const saved=[],errors=[];let coverage;
 const scraper=await fixtureModule('../app/lib/scrapers/stopandgo.js',{'../db.js':{prisma:{}},'../logger.js':{logInfo:async()=>{},logError:async(_s,message)=>errors.push(message)},'../merging/eventMerger.js':{saveOrMergeEvent:async(_db,event)=>saved.push(event)},'./stopandgoAccess.js':{createStopAndGoAccess:()=>globalThis.fetch},'./stopandgoListing.js':{fetchStopAndGoCyclingLinks:async()=>new Set(urls)}});
 t.mock.method(globalThis,'fetch',async url=>new Response(url.endsWith('sitemap.xml')?'<urlset/>':url.endsWith('2098')?page('5 jan 2099','Prova BTT 2098'):page('5 jan 2098','Prova BTT 2019')));
 await scraper.scrapeStopAndGo({years:['2098'],onCoverage:value=>{coverage=value;}});
 assert.equal(saved.length,1);assert.equal(saved[0].sortDate.toISOString(),'2098-01-05T00:00:00.000Z');assert.equal(coverage.outsideYears,1);assert.equal(coverage.saved,1);assert.equal(errors.length,0);
});
