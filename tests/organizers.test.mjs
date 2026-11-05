import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMountainQuest,parseBairrada,ORGANIZER_PAGES} from '../app/lib/scrapers/organizerParser.js';
import {fixtureModule} from './fixtureModule.mjs';
const home='<span class="hub-date">19 de Junho de 2027 · Amarante</span><script type="application/ld+json">{"startDate":"2026-06-20"}</script>';
const registration=`<script type="application/ld+json">{"startDate":"2026-06-20","availability":"SoldOut"}</script><script>var CONFIG = { date: '2027-06-19' };const pt={kReg:'Inscrições abrem', vReg:'Abril 2027'};</script>`;
const series='<div class="ir-card"><div class="ir-date">FEV2027</div>Salvador do Monte</div><div class="ir-card"><div class="ir-date">SET2027</div>Castelo de Paiva</div><div class="tn-ban">Outubro 2027 · em preparação</div>';
const bairradaHome='<h1>Bairrada Ultra Marathon</h1><h2>ÁGUEDA, 09 DE MAIO DE 2026</h2>';
const bairradaRules='<p>Regulamento Oficial – Bairrada Ultra Marathon 2026 (11.ª Edição)</p><p>Data: 9 de maio de 2026</p><h3>Período de Inscrições</h3><p>De 1 de dezembro de 2025 (00h00) a 30 de abril de 2026 (23h59).</p><p>1.ª fase até 31 de março de 2026. Pagamento até 3 de maio de 2026.</p>';

test('MQ extracts the current UI date and April opening, ignoring stale structured data and old rules',()=>{
 const rows=parseMountainQuest(home,registration,series,{salvador:'<p>Data: 8 de março de 2026</p><p>inscrições até ao dia 27 de fevereiro de 2026</p>',terra:'<p>O evento realiza-se no dia 17 de outubro de 2026</p>'});
 assert.equal(rows.length,4);assert.equal(rows[0].date,'19 JUN 2027');assert.equal(rows[0].registrationOpensAt,'2027-04-01T00:00:00.000Z');
 assert.equal(rows[0].temporalEvidence.registrationOpen.precision,'month');assert.equal(rows[1].date,'— FEV 2027');assert.equal(rows[2].date,'— SET 2027');assert.equal(rows[3].date,'— OUT 2027');
 assert.equal(rows[1].registrationClosesAt,undefined);assert.equal(rows[3].tag,'Gravel');
});
test('MQ fails visibly when its current edition configuration or series cards cannot be verified',()=>{
 assert.throws(()=>parseMountainQuest(home,registration.replace('2027-06-19','2026-06-20'),series),/edição atual/);
 assert.throws(()=>parseMountainQuest(home,registration,series.replace('ir-card','old-card')),/ronda/);
 assert.throws(()=>parseMountainQuest('<h1>Other page</h1>',registration,series),/não reconhecido/);
});
test('a current Iron Rider rule refines its month and extracts actual opening and final deadline',()=>{
 const detail='<p>Data: 12 de setembro de 2027</p><p>As inscrições estarão abertas a partir das 20:00h de sexta-feira, 17 de julho de 2027, e deverão ser efetuadas, impreterivelmente, até ao dia 10 de setembro de 2027.</p>';
 const row=parseMountainQuest(home,registration,series,{castelo:detail})[2];
 assert.equal(row.date,'12 SET 2027');assert.equal(row.registrationOpensAt,'2027-07-17T20:00:00.000Z');assert.equal(row.registrationClosesAt,'2027-09-10T23:59:00.000Z');
});
test('Bairrada reads the full registration window across years, never the phase or payment deadline',()=>{
 const [row]=parseBairrada(bairradaHome,bairradaRules);
 assert.equal(row.date,'09 MAI 2026');assert.equal(row.registrationOpensAt,'2025-12-01T00:00:00.000Z');assert.equal(row.registrationClosesAt,'2026-04-30T23:59:00.000Z');
 const mismatch=parseBairrada(bairradaHome,bairradaRules.replace('Marathon 2026','Marathon 2027'))[0];assert.equal(mismatch.registrationOpensAt,undefined);assert.match(mismatch._warnings[0],/outra edição/);
 assert.throws(()=>parseBairrada(bairradaHome,bairradaRules.replace('Data: 9','Data: 10')),/contraditórias/);
});
test('Bairrada publishes a newly announced month without borrowing last year registration dates',()=>{
 const row=parseBairrada('<h2>ÁGUEDA, MAIO DE 2027</h2>',bairradaRules)[0];assert.equal(row.date,'— MAI 2027');assert.equal(row.registrationOpensAt,undefined);assert.equal(row.id,'organizador-bairrada-ultra-marathon-2027');
});
async function collector(){
 const rows=new Map(),requests=[],saved=[];let clock=Date.parse('2026-11-05T12:00:00Z');
 const db={systemLog:{findUnique:async({where})=>rows.get(where.id),upsert:async({where,create,update})=>{rows.set(where.id,rows.has(where.id)?{...rows.get(where.id),...update}:create);}}};
 const mod=await fixtureModule('../app/lib/scrapers/organizers.js',{'../db.js':{prisma:db},'../logger.js':{logInfo:async()=>{}},'../merging/eventMerger.js':{saveOrMergeEvent:async()=>{}}});
 const html={mq:home,mqRegistration:registration,series,salvador:'old',castelo:'old',terra:'old',bairrada:bairradaHome,bairradaRules};
 const deps={db,now:()=>new Date(clock),wait:async ms=>{clock+=ms;},save:async(_db,row)=>saved.push(row),fetcher:async url=>{requests.push(url);return new Response(html[Object.entries(ORGANIZER_PAGES).find(([,value])=>value===url)[0]]);}};
 return {...mod,rows,requests,saved,deps,time:value=>{clock=Date.parse(value);}};
}
test('monthly collection persists before access and re-entry in the same month makes zero requests',async()=>{
 const f=await collector();const result=await f.collectOrganizer('mq',{},f.deps);assert.equal(result.events.length,4);assert.equal(f.requests.length,6);
 assert.equal(JSON.parse(f.rows.get(f.organizerStateId('mq')).details).nextCheckAt,'2026-12-01T05:00:00.000Z');
 const repeat=await f.collectOrganizer('mq',{},f.deps);assert.equal(repeat.skipped,true);assert.equal(f.requests.length,6);
 f.time('2026-12-01T05:00:00Z');await f.collectOrganizer('mq',{},f.deps);assert.equal(f.requests.length,12);
});
test('Bairrada 2026 is not copied into 2027 and is a successful no-new-edition check',async()=>{
 const f=await collector();const result=await f.collectOrganizer('bairrada',{},f.deps);assert.deepEqual(result.events,[]);assert.equal(f.saved.length,0);assert.equal(JSON.parse(f.rows.get(f.organizerStateId('bairrada')).details).status,'done');
});
test('access refusals stop discovery, persist a domain gate and prevent requests even after the month boundary',async()=>{
 const f=await collector();let requests=0;f.deps.fetcher=async()=>{requests++;return new Response('',{status:429,headers:{'retry-after':'Wed, 02 Dec 2026 15:00:00 GMT'}});};
 await assert.rejects(f.collectOrganizer('mq',{},f.deps),error=>error.retryable===false&&/429/.test(error.message));assert.equal(requests,1);assert.equal(f.saved.length,0);
 f.time('2026-12-01T05:00:00Z');await assert.rejects(f.collectOrganizer('mq',{},f.deps),/suspenso/);assert.equal(requests,1);
});
test('a broken source conserves existing events and does not retry all pages in the same month',async()=>{
 const f=await collector();f.deps.fetcher=async()=>new Response('<html>changed layout</html>');
 await assert.rejects(f.collectOrganizer('mq',{},f.deps),/não reconhecido/);assert.equal(f.saved.length,0);
 assert.equal((await f.collectOrganizer('mq',{},f.deps)).skipped,true);
});
