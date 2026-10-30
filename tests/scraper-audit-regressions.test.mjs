import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureModule} from './fixtureModule.mjs';
import {isCyclingCandidate,publishedRegulationDiscipline} from '../app/lib/scrapers/cyclingEvidence.js';
import {parsePublishedRaceDate} from '../app/lib/scrapers/publishedDates.js';
import {getEventRaceTypes,isOfficialNationalChampionship} from '../app/utils/eventClassifier.js';
import {readStopAndGoListing,fetchStopAndGoCyclingLinks} from '../app/lib/scrapers/stopandgoListing.js';
import {isSameEvent} from '../app/lib/merging/eventMatcher.js';
import {saveOrMergeEvent} from '../app/lib/merging/eventMerger.js';
const logger={logInfo:async()=>{},logError:async()=>{}};
async function scraper(name,saved=[]){return fixtureModule(`../app/lib/scrapers/${name}.js`,{'../db.js':{prisma:{}},'../logger.js':logger,'../merging/eventMerger.js':{saveOrMergeEvent:async(_db,event)=>saved.push(event)}});}

test('mixed cycling/walking remains eligible while pure running stays excluded',()=>{
 for(const title of ['Gravel e Caminhada','Granfondo e Caminhada','Grandfondo e Trail','Passeio BTT e Caminhada','MTB e corrida'])assert.equal(isCyclingCandidate(title,true),true,title);
 for(const title of ['Trail da Serra','São Silvestre','Meia maratona de atletismo','Corrida e Caminhada'])assert.equal(isCyclingCandidate(title,true),false,title);
 assert.equal(isCyclingCandidate('Desafio da Serra',true),true);
 assert.equal(isCyclingCandidate('Desafio da Serra'),false);
});

test('explicit disciplines override generic formats and obsolete stored guesses',()=>{
 assert.deepEqual(getEventRaceTypes({title:'Maratona Gravel',tag:'BTT XCM / Maratona'}),['Gravel']);
 assert.deepEqual(getEventRaceTypes('Granfondo dos Trilhos'),['Granfondo']);
 assert.deepEqual(getEventRaceTypes('Grandfondo Médio Tejo'),['Granfondo']);
 assert.deepEqual(getEventRaceTypes('Racenature Gravel'),['Gravel']);
 assert.deepEqual(getEventRaceTypes('Racenature BTT XCO'),['BTT XCO']);
 assert.deepEqual(getEventRaceTypes('Maratona BTT'),['BTT XCM / Maratona']);
 assert.deepEqual(getEventRaceTypes('Homenagem aos Cicloturistas Falecidos'),['Passeio / Lazer']);
 for(const category of ['BTT XCO CN','XCM CN','BMX CN','Pista CN'])assert.equal(isOfficialNationalChampionship({title:'Prova oficial',source:'FPC',details:category}),true);
});

test('published regulation sport is read without interpreting traffic rules as road racing',()=>{
 assert.equal(publishedRegulationDiscipline('O evento é uma prova aventura em BTT (bicicletas elétricas permitidas). Cumprir o Código da Estrada.'),'BTT');
 assert.equal(publishedRegulationDiscipline('Cumprir o Código da Estrada e as regras do evento.'),'');
 assert.equal(publishedRegulationDiscipline('Modalidade: Gravel'),'Gravel');
});

test('dedicated race date fields retain ranges and reject impossible or incomplete dates',()=>{
 const parsed=parsePublishedRaceDate('Sábado, 31 de outubro de 2026 às 15:00');
 assert.equal(parsed.sortDate.toISOString(),'2026-10-31T00:00:00.000Z');
 assert.equal(parsePublishedRaceDate('14 Novembro 2026 20h00').sortDate.toISOString(),'2026-11-14T00:00:00.000Z');
 assert.equal(parsePublishedRaceDate('31 de Outubro de 2026 a 1 de Novembro de 2026').endDate,'2026-11-01');
 assert.equal(parsePublishedRaceDate('31 de fevereiro de 2027'),null);
 assert.equal(parsePublishedRaceDate('Data a definir'),null);
});

test('Recorde category admits neutral names, mixed events and absolute links without refetching duplicates',async t=>{
 const saved=[],loaded=await scraper('recordepessoal',saved),calls=[];
 t.mock.method(globalThis,'fetch',async value=>{
  const url=new URL(value);calls.push(url.href);
  if(url.pathname==='/eventos')return new Response(url.searchParams.get('cat')==='btt'?'<div class="evento" data-evento="/evento/neutral"><div class="titulo">Desafio da Serra</div></div><div class="evento" data-evento="https://www.recordepessoal.pt/evento/mixed"><div class="titulo">Gravel e Caminhada</div></div><div class="evento" data-evento="/evento/run"><div class="titulo">Trail da Serra</div></div>':'<div class="evento" data-evento="/evento/mixed"><div class="titulo">Gravel e Caminhada</div></div>');
  return new Response(`<div class="eventoTitulo"><div class="titulosPaginasBold">${url.pathname.endsWith('neutral')?'Desafio da Serra':'Gravel e Caminhada'}</div></div><div class="dataEvento"><div>Data</div><div>14 Novembro 2099 20h00</div></div><div class="localEvento"><div>Local</div><div>Lisboa</div></div>`);
 });
 assert.equal(await loaded.scrapeRecordePessoal({years:['2099']}),2);
 assert.equal(saved.find(e=>e.title==='Desafio da Serra').tag,'BTT');
 assert.equal(saved.find(e=>e.title==='Gravel e Caminhada').tag,'Gravel');
 assert.equal(calls.filter(u=>u.includes('/evento/mixed')).length,1);assert.equal(calls.length,4);
});

test('Apedalar deduplicates sitemap URLs and preserves mixed-event dates',async t=>{
 const saved=[],loaded=await scraper('apedalar',saved);let calls=0;
 const url='https://apedalar.pt/eventos/mixed';
 t.mock.method(globalThis,'fetch',async target=>{calls++;return new Response(target.endsWith('sitemap.xml')?`<urlset><url><loc>${url}</loc></url><url><loc>${url}</loc></url></urlset>`:'<h1>Granfondo e Caminhada</h1><h2>QUANDO?</h2><div>31 de outubro de 2099 às 15:00</div><h2>ONDE?</h2><div>Lisboa</div>');});
 await loaded.scrapeApedalar({},['2099']);assert.equal(calls,2);assert.equal(saved.length,1);assert.equal(saved[0].tag,'Granfondo');
 assert.equal(saved[0].sortDate.toISOString(),'2099-10-31T00:00:00.000Z');
});

test('Apedalar date metadata covers a changed layout without reimporting archived past races',async t=>{
 const saved=[],loaded=await scraper('apedalar',saved);
 t.mock.method(globalThis,'fetch',async target=>new Response(target.endsWith('sitemap.xml')?'<urlset><url><loc>https://apedalar.pt/eventos/future</loc></url><url><loc>https://apedalar.pt/eventos/past</loc></url></urlset>':`<h1>Passeio BTT</h1><meta property="og:description" content="31 de outubro de ${target.endsWith('future')?'2099':'2020'} às 15:00">`));
 await loaded.scrapeApedalar({},['2099','2020']);assert.equal(saved.length,1);assert.equal(saved[0].date,'31 OUT 2099');
});

test('source refusals stop collection, never silently succeed or retry immediately',async t=>{
 for(const [name,invoke]of [['fpc',m=>m.fetchFPCCalendar('2026')],['cabreira',m=>m.scrapeCabreira()],['recordepessoal',m=>m.scrapeRecordePessoal()],['apedalar',m=>m.scrapeApedalar({},['2026'])],['stopandgo',m=>m.scrapeStopAndGo()]]){
  const loaded=await scraper(name);let calls=0;
  const mock=t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:429});});
  await assert.rejects(invoke(loaded),{code:'SOURCE_ACCESS_DENIED',retryable:false});assert.equal(calls,1,name);mock.mock.restore();
 }
});

test('query-only pagination retains filters and page 11 is discoverable without a silent ten-page cutoff',async()=>{
 const page='<select name="modality"><option value="1">BTT</option><option value="1">BTT</option></select>';
 const parsed=readStopAndGoListing('<a href="?page=11">Seguinte</a>',true,'https://stopandgo.net/events?modality=1&status=S');
 assert.equal(new URL(parsed.pages[0]).searchParams.get('modality'),'1');
 assert.equal(new URL(parsed.pages[0]).searchParams.get('status'),'S');
 const calls=[];const urls=await fetchStopAndGoCyclingLinks(async target=>{
  calls.push(target);const url=new URL(target);
  if(!url.search)return new Response(page);
  assert.equal(url.searchParams.get('modality'),'1');assert.equal(url.searchParams.get('status'),'S');
  return new Response(!url.searchParams.has('page')?'<a href="?page=11">Seguinte</a>':'<a href="/events/future-race">Prova</a>');
 });
 assert.equal(calls.length,3);assert.deepEqual([...urls],['https://stopandgo.net/events/future-race']);
});

test('different rounds, formats and source pages are not hidden by fuzzy merging',()=>{
 const a={id:'one',title:'1ª Taça Regional XCO',sortDate:'2026-11-01',source:'Stop and Go',link:'https://stopandgo.net/events/one'};
 for(const b of [{...a,id:'two',title:'2ª Taça Regional XCO'},{...a,id:'two',title:'1ª Taça Regional XCM'},{...a,id:'two',link:'https://stopandgo.net/events/two'}])assert.equal(isSameEvent(a,b),false);
});

test('an already combined open ride can be recollected after a source title change, without merging distinct FPC rows',()=>{
 const a={id:'cabreira-open',title:'Nome atualizado',ambito:'Prova Aberta',source:'Cabreira, FPC, Stop and Go',sortDate:'2026-11-14',link:'https://stopandgo.net/events/open-2026'};
 const b={...a,id:'fpc-original',source:'FPC',title:'Nome anterior'};
 assert.equal(isSameEvent(a,b),true);
 assert.equal(isSameEvent({...a,id:'fpc-other'},b),false);
 assert.equal(isSameEvent(a,{...b,sortDate:'2026-11-15'}),false);
 assert.equal(isSameEvent(a,{...b,link:'https://stopandgo.net/events/other'}),false);
});

test('a postponement on the same source page updates the existing ID while another year stays separate',async()=>{
 const old={id:'original-favorite',title:'Passeio BTT',date:'01 NOV 2026',sortDate:new Date('2026-11-01'),source:'Apedalar',link:'https://apedalar.pt/eventos/same'};
 const rows=[old];const db={event:{findUnique:async()=>null,findMany:async()=>rows,update:async({where,data})=>{assert.equal(where.id,old.id);Object.assign(old,data);return old;},create:async({data})=>{rows.push(data);return data;}}};
 const incoming={...old,id:'new-date-id',date:'20 DEZ 2026',sortDate:'2026-12-20'};
 assert.equal((await saveOrMergeEvent(db,incoming)).action,'updated');assert.equal(rows.length,1);assert.equal(old.id,'original-favorite');assert.equal(old.date,'20 DEZ 2026');
 assert.equal((await saveOrMergeEvent(db,{...incoming,id:'next-edition',date:'20 DEZ 2027',sortDate:'2027-12-20'})).action,'created');
});
