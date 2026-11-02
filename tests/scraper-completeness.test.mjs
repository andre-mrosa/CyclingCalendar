import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {parseSitemap,fetchSitemapUrls} from '../app/lib/scrapers/sitemapDiscovery.js';
import {createCollectionAudit,settleSourceBatch} from '../app/lib/scrapers/collectionAudit.js';
import {saveOrMergeEvent} from '../app/lib/merging/eventMerger.js';
import {isSameEvent} from '../app/lib/merging/eventMatcher.js';
import {mergeEvents} from '../app/utils/mergeEvents.js';
import {publishedCategoryEvidence,mergeCategoryEvidence} from '../app/utils/categoryEvidence.js';
import {qualityIssues} from '../app/lib/sourceQuality.js';
import {fetchStopAndGoCyclingLinks} from '../app/lib/scrapers/stopandgoListing.js';
import {parseRegistrationDates} from '../app/utils/registrationDates.js';

const logger={logInfo:async()=>{},logError:async()=>{}};
async function scraper(name,saved=[],errors=[]) {
    return fixtureModule(`../app/lib/scrapers/${name}.js`,{
        '../db.js':{prisma:{}},'../logger.js':{...logger,logError:async(_s,message)=>errors.push(message)},
        '../merging/eventMerger.js':{saveOrMergeEvent:async(_db,event)=>saved.push(event)},
    });
}
const race={id:'favorite-id',title:'Desafio BTT',date:'14 FEV 2027',sortDate:'2027-02-14',source:'Cabreira',link:'https://cabreirasolutions.com/evento/desafio/',tag:'BTT'};
function database(initial) {
    const row=structuredClone(initial);
    return {row,event:{findUnique:async()=>row,findMany:async()=>[],update:async({data})=>Object.assign(row,data)}};
}

test('sitemaps decode XML entities, namespace prefixes and duplicate entries',()=>{
    assert.deepEqual(parseSitemap('<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"><sm:url><sm:loc>https://apedalar.pt/eventos/prova?a=1&amp;b=2</sm:loc></sm:url></sm:urlset>'),{kind:'urls',entries:['https://apedalar.pt/eventos/prova?a=1&b=2']});
});
test('truncated sitemaps and missing location fields cannot look like complete lists',()=>{
    assert.throws(()=>parseSitemap('<urlset><url><loc>https://apedalar.pt/eventos/teste</loc></url>'),/truncado/);
    assert.throws(()=>parseSitemap('<urlset><url></url></urlset>'),/sem URL/);
});
test('one failed child sitemap retains other discoveries and reports an incomplete source',async()=>{
    const errors=[];
    const urls=await fetchSitemapUrls('https://apedalar.pt/sitemap.xml',{source:'Apedalar',eventUrl:u=>u,onError:e=>errors.push(e.message),fetcher:async url=>{
        if(url.endsWith('/sitemap.xml'))return new Response('<sitemapindex><sitemap><loc>/one.xml</loc></sitemap><sitemap><loc>/two.xml</loc></sitemap></sitemapindex>');
        return url.endsWith('/two.xml')?new Response('',{status:503}):new Response('<urlset><url><loc>https://apedalar.pt/eventos/one</loc></url></urlset>');
    }});
    assert.equal(urls.size,1);assert.equal(errors.length,1);
});
test('sitemap indexes follow each child once and do not fetch event bodies',async()=>{
    const calls=[];
    const result=await fetchSitemapUrls('https://apedalar.pt/sitemap.xml',{source:'Apedalar',eventUrl:url=>url,fetcher:async url=>{
        calls.push(url);return new Response(url.endsWith('sitemap.xml')?'<sitemapindex><sitemap><loc>/child.xml</loc></sitemap><sitemap><loc>/child.xml</loc></sitemap></sitemapindex>':'<urlset><url><loc>https://apedalar.pt/eventos/new</loc></url></urlset>');
    }});
    assert.equal(calls.length,2);assert.deepEqual([...result],['https://apedalar.pt/eventos/new']);
});
test('sitemap traversal refuses another origin, access denial and silent truncation',async()=>{
    await assert.rejects(fetchSitemapUrls('https://apedalar.pt/sitemap.xml',{source:'Apedalar',eventUrl:u=>u,fetcher:async()=>new Response('<sitemapindex><sitemap><loc>http://127.0.0.1/internal</loc></sitemap></sitemapindex>')}),/origem/);
    await assert.rejects(fetchSitemapUrls('https://apedalar.pt/sitemap.xml',{source:'Apedalar',eventUrl:u=>u,fetcher:async()=>new Response('',{status:429})}),{retryable:false});
    await assert.rejects(fetchSitemapUrls('https://apedalar.pt/sitemap.xml',{source:'Apedalar',eventUrl:u=>u,maxSitemaps:1,fetcher:async()=>new Response('<sitemapindex><sitemap><loc>/child.xml</loc></sitemap></sitemapindex>')}),/limite/);
});
test('coverage accounts for candidates which never save, and detects unfinished work',async()=>{
    const errors=[];let snapshot;
    const audit=createCollectionAudit('Fixture',{onCoverage:value=>{snapshot=value;}},{...logger,logError:async(_s,message)=>errors.push(message)});
    audit.discover(['one','one','two','three','four']);audit.resolve('one','saved');audit.resolve('two','past');await audit.fail('three','data inválida');await audit.finish();
    assert.equal(snapshot.discovered,4);assert.equal(snapshot.saved,1);assert.equal(snapshot.past,1);assert.equal(snapshot.failed,1);assert.equal(snapshot.unresolved,1);assert.equal(errors.length,2);
});
test('a refused request does not release a source while other saves are still running',async()=>{
    let complete=false;
    await assert.rejects(settleSourceBatch([1,2],async id=>{
        if(id===1)throw Error('refusal');await new Promise(resolve=>setTimeout(resolve,20));complete=true;
    }),/refusal/);
    assert.equal(complete,true);
});
test('Apedalar reports unread dates and removed pages instead of silently claiming coverage',async t=>{
    const saved=[],errors=[],loaded=await scraper('apedalar',saved,errors);let coverage;
    t.mock.method(globalThis,'fetch',async url=>{
        if(url.endsWith('sitemap.xml'))return new Response('<urlset><url><loc>https://apedalar.pt/eventos/bad</loc></url><url><loc>https://apedalar.pt/eventos/gone</loc></url></urlset>');
        return url.endsWith('/gone')?new Response('',{status:410}):new Response('<h1>Prova BTT</h1><h2>QUANDO?</h2><div>31 fevereiro 2099</div>');
    });
    await loaded.scrapeApedalar({},['2099'],{onCoverage:c=>{coverage=c;}});
    assert.equal(saved.length,0);assert.equal(coverage.failed,1);assert.equal(coverage.unavailable,1);assert.equal(errors.length,1);
});
test('Cabreira detail failure never becomes a newly verified partial record',async t=>{
    const saved=[],errors=[],loaded=await scraper('cabreira',saved,errors);let coverage;
    t.mock.method(globalThis,'fetch',async url=>new Response(url.endsWith('/eventos/')?'<div class="evento-grid-item"><div class="evento-item-image-container"><a href="/evento/desafio-btt/"></a></div><span class="evento-item-data">14 FEVEREIRO 2099</span></div>':'unavailable',{status:url.endsWith('/eventos/')?200:503}));
    await loaded.scrapeCabreira(null,{onCoverage:c=>{coverage=c;}});
    assert.equal(saved.length,0);assert.equal(coverage.failed,1);assert.equal(errors.length,1);
});
test('Cabreira deduplicates listing cards, resolves relative links and uses the published date',async t=>{
    const saved=[],loaded=await scraper('cabreira',saved);let requests=0,coverage;
    const card='<div class="evento-grid-item"><div class="evento-item-image-container"><a href="/evento/desafio-btt/"></a></div><span class="evento-item-data">31 OUTUBRO 2099 a 1 NOVEMBRO 2099</span></div>';
    t.mock.method(globalThis,'fetch',async url=>{requests++;assert.ok(url.startsWith('https://cabreirasolutions.com/'));return new Response(url.endsWith('/eventos/')?card+card:'<h1>Desafio BTT</h1>');});
    await loaded.scrapeCabreira(null,{onCoverage:c=>{coverage=c;}});
    assert.equal(requests,2);assert.equal(saved.length,1);assert.equal(saved[0].sortDate.toISOString(),'2099-10-31T00:00:00.000Z');assert.equal(coverage.discovered,1);
});
test('Recorde Pessoal distinguishes an empty confirmed listing from an unrecognised layout',async t=>{
    const errors=[],loaded=await scraper('recordepessoal',[],errors);
    t.mock.method(globalThis,'fetch',async url=>new Response(url.includes('cat=btt')?'<h1>Oops</h1>':'<div id="eventosDiv">Não existem eventos de acordo com a pesquisa efetuada...</div>'));
    await loaded.scrapeRecordePessoal();assert.equal(errors.length,1);assert.match(errors[0],/não reconhecida/);
});
test('same-source recollection removes stale age categories while retaining the favorite ID',async()=>{
    const input={...race,publishedCategories:['Masters / Veteranos']};const db=database({...race,escaloes:'["Masters / Veteranos"]',categoryEvidence:publishedCategoryEvidence(input)});
    await saveOrMergeEvent(db,race);assert.equal(db.row.escaloes,'[]');assert.equal(db.row.id,race.id);
});
test('FPC category evidence remains authoritative when an external platform publishes a different selection',()=>{
    const official=publishedCategoryEvidence({...race,source:'FPC',publishedCategories:['Sub-17 (Cadetes)']}),external=publishedCategoryEvidence({...race,publishedCategories:['Masters / Veteranos']});
    assert.deepEqual(mergeCategoryEvidence(official,external,'Cabreira'),official);
});
test('published registration changes update events already combined with FPC',async()=>{
    const db=database({...race,source:'Cabreira, FPC',registrationClosesAt:'2027-02-01T23:59:00.000Z'});
    await saveOrMergeEvent(db,{...race,registrationClosesAt:'2027-02-10T23:59:00.000Z'});
    assert.equal(db.row.registrationClosesAt.toISOString(),'2027-02-10T23:59:00.000Z');
});
test('invalid source records produce an explicit save failure',async()=>{
    await assert.rejects(saveOrMergeEvent({}, {...race,title:''}),/validação mínima/);
});
test('similar titles with conflicting published sports remain separate in storage and display',()=>{
    const a={...race,id:'one',title:'Desafio da Serra',tag:'Gravel',source:'Apedalar',details:'Lisboa',ambito:'Prova Aberta'},b={...a,id:'two',tag:'BTT',source:'Cabreira'};
    assert.equal(isSameEvent(a,b),false);assert.equal(mergeEvents([a,b]).length,2);
});
test('quality warnings include discovery loss and pages which never reached persistence',()=>{
    const issues=qualityIssues({processed:0,coverage:{discovered:2,failed:1,unresolved:0,unavailable:1}},{processed:0,coverage:{discovered:20}});
    for(const code of ['unreadCandidates','unavailablePages','discovery_drop'])assert.ok(issues.some(issue=>issue.code===code),code);
});
test('Stop and Go examines neutral current-year and yearless cycling URLs, and falls back to listings after a broken sitemap',async t=>{
    const year=new Date().getFullYear()+1,neutral=`https://stopandgo.net/events/desafio-${year}`,yearless='https://stopandgo.net/events/gravel-serra';
    for(const broken of [false,true]){
        const saved=[],errors=[];
        const loaded=await fixtureModule('../app/lib/scrapers/stopandgo.js',{'../db.js':{prisma:{}},'../logger.js':{...logger,logError:async(_s,message)=>errors.push(message)},'../merging/eventMerger.js':{saveOrMergeEvent:async(_db,event)=>saved.push(event)},'./stopandgoListing.js':{fetchStopAndGoCyclingLinks:async()=>new Set(broken?[neutral]:[])}});
        const mock=t.mock.method(globalThis,'fetch',async url=>new Response(url.endsWith('sitemap.xml')?(broken?'Unavailable':`<urlset><url><loc>${neutral}</loc></url><url><loc>${yearless}</loc></url></urlset>`):`<section><div><h1>Desafio da Serra</h1><div>Maia</div><div>5 jan ${year}</div><div>BTT</div></div></section>`,{status:url.endsWith('sitemap.xml')&&broken?503:200}));
        await loaded.scrapeStopAndGo();assert.equal(saved.length,broken?1:2);assert.equal(errors.length,broken?1:0);mock.mock.restore();
    }
});
test('one failed Stop and Go modality retains previously discovered links and still reads other modalities',async()=>{
    const errors=[],calls=[];
    const urls=await fetchStopAndGoCyclingLinks(async url=>{
        calls.push(url);
        if(!url.includes('?'))return new Response('<select name="modality"><option value="1">BTT</option><option value="2">Gravel</option><option value="3">Estrada</option></select>');
        if(url.includes('modality=2'))return new Response('',{status:503});
        return new Response(`<a href="/events/race-${url.includes('modality=1')?'one':'three'}">Prova</a>`);
    },{onError:error=>errors.push(error.message)});
    assert.equal(calls.length,4);assert.equal(urls.size,2);assert.equal(errors.length,1);
});
test('conflicting Recorde category listings do not arbitrarily reclassify a neutral event',async t=>{
    const saved=[],loaded=await scraper('recordepessoal',saved);
    t.mock.method(globalThis,'fetch',async url=>new Response(url.includes('/eventos?')?'<div class="evento" data-evento="/evento/same"><div class="titulo">Desafio da Serra</div></div>':'<div class="eventoTitulo"><div class="titulosPaginasBold">Desafio da Serra</div></div><div class="dataEvento"><div>Data</div><div>14 fevereiro 2099</div></div>'));
    await loaded.scrapeRecordePessoal({years:['2099']});assert.equal(saved.length,1);assert.equal(saved[0].tag,'');
});
test('registration parsing ignores code and rejects an inverted opening/closing window',()=>{
    const inverted=parseRegistrationDates('<p>Abertura das inscrições dia 10/11/2026</p><p>Inscrições encerram dia 09/11/2026</p>');
    assert.equal(inverted.registrationOpensAt,null);assert.equal(inverted.registrationClosesAt,null);
    assert.equal(parseRegistrationDates('<script>Inscrições encerram dia 09/11/2026</script>').registrationClosesAt,null);
});
test('one malformed FPC row is reported without losing other valid races from the season',async t=>{
    const saved=[],errors=[],loaded=await scraper('fpc',saved,errors);let coverage;
    const row=(name,date)=>`<tr><th>${date}</th><th>${date}</th><td>${name}</td><td>Lisboa</td><td>CPT</td></tr>`;
    t.mock.method(globalThis,'fetch',async()=>new Response(`<select name="epoca_site"><option selected>2099</option></select><select name="mes_de_new"><option selected>01</option></select><select name="mes_ate_new"><option selected>12</option></select><table class="dc_table_s12"><tbody>${row('Prova BTT válida','14-02-2099')}${row('Prova BTT inválida','31-02-2099')}</tbody></table>`));
    await loaded.scrapeFPC('2099',{onCoverage:c=>{coverage=c;}});
    assert.equal(saved.length,1);assert.equal(coverage.discovered,2);assert.equal(coverage.failed,1);assert.equal(errors.length,1);
});
test('a reused yearless source ID keeps annual editions and their favorites separate',async()=>{
    const old={...race,id:'stopandgo-gravel-serra',source:'Stop and Go',link:'https://stopandgo.net/events/gravel-serra',date:'14 FEV 2026',sortDate:new Date('2026-02-14')},rows=[old];
    const db={event:{findUnique:async({where})=>rows.find(row=>row.id===where.id)||null,findMany:async()=>rows,create:async({data})=>{rows.push(data);return data;},update:async({where,data})=>Object.assign(rows.find(row=>row.id===where.id),data)}};
    const incoming={...old,date:'14 FEV 2027',sortDate:new Date('2027-02-14')};
    const first=await saveOrMergeEvent(db,incoming);assert.equal(first.action,'created');assert.equal(old.date,'14 FEV 2026');assert.equal(first.event.id,'stopandgo-gravel-serra-2027');
    await saveOrMergeEvent(db,incoming);assert.equal(rows.length,2);assert.equal(old.id,'stopandgo-gravel-serra');
    assert.equal(isSameEvent({...old,sortDate:'2026-12-31'},{...incoming,id:'next-year',sortDate:'2027-01-01'}),false);
});
test('a renamed combined ride still matches FPC after its preferred source link changes',async()=>{
    const shared='https://stopandgo.net/events/passeio-serra-2027';
    const row={...race,title:'Nome antigo',source:'Cabreira, FPC',ambito:'Prova Aberta',link:shared},rows=[row];
    const db={event:{findUnique:async({where})=>rows.find(e=>e.id===where.id)||null,findMany:async()=>rows,create:async({data})=>{rows.push(data);return data;},update:async({where,data})=>Object.assign(rows.find(e=>e.id===where.id),data)}};
    const official={...race,id:'fpc-original-row',title:'Nome antigo',source:'FPC',ambito:'Prova Aberta',link:shared};
    const organizer={...race,title:'Nome novo',ambito:'Prova Aberta'};
    for(let run=0;run<3;run++){
        await saveOrMergeEvent(db,official);await saveOrMergeEvent(db,organizer);
        assert.equal(rows.length,1);assert.equal(row.id,race.id);
    }
});
