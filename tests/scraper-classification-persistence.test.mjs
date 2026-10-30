import test from 'node:test';
import assert from 'node:assert/strict';
import {saveOrMergeEvent} from '../app/lib/merging/eventMerger.js';
import {getAmbito} from '../app/lib/scrapers/utils.js';
import {SOURCE_REVIEWS} from '../app/lib/contentReleasePolicy.js';

const hosts={FPC:'www.fpciclismo.pt',Cabreira:'cabreirasolutions.com','Stop and Go':'stopandgo.net',Apedalar:'apedalar.pt','Recorde Pessoal':'recordepessoal.pt'};
const race=(source,extra={})=>({id:'fixture-2027',title:'Taça Oeste XCM - Juniores 2027',date:'14 FEV 2027',sortDate:'2027-02-14',source,details:'Vimeiro',link:`https://${hosts[source]}/evento/2027`,...extra});
function database(initial=[]) {
    const rows=structuredClone(initial);
    return {rows,event:{
        findUnique:async({where})=>rows.find(row=>row.id===where.id)||null,
        findMany:async()=>rows,
        create:async({data})=>{rows.push({...data});return rows.at(-1);},
        update:async({where,data})=>{const row=rows.find(row=>row.id===where.id);Object.assign(row,data);return row;},
    }};
}

for(const source of Object.keys(SOURCE_REVIEWS)) test(`${source}: create and recollection use shared classification without manual metadata`,async()=>{
    const db=database();
    const input=race(source,{ambito:'Taça de Portugal',tag:'BTT'});
    assert.equal((await saveOrMergeEvent(db,input)).action,'created');
    assert.equal(db.rows[0].ambito,'Regional');
    assert.equal(db.rows[0].tag,'BTT XCM / Maratona');
    assert.deepEqual(JSON.parse(db.rows[0].escaloes),['Sub-19 (Juniores)']);
    db.rows[0].escaloes='["Masters / Veteranos"]';
    await saveOrMergeEvent(db,input);
    assert.equal(db.rows.length,1);
    assert.equal(db.rows[0].ambito,'Regional');
    assert.deepEqual(JSON.parse(db.rows[0].escaloes),['Sub-19 (Juniores)']);
});

test('recollection repairs obsolete scope/discipline and remains idempotent',async()=>{
    const input=race('Apedalar',{title:'Taça Oeste Gravel 2028',ambito:undefined,tag:undefined});
    const db=database([{...input,ambito:'Taça de Portugal',tag:'BTT XCO'}]);
    await saveOrMergeEvent(db,input);
    assert.equal(db.rows[0].ambito,'Regional');assert.equal(db.rows[0].tag,'Gravel');
    await saveOrMergeEvent(db,input);
    assert.equal(db.rows.length,1);assert.equal(db.rows[0].tag,'Gravel');
});

test('an unfamiliar cup never becomes national or open merely because its title says cup',async()=>{
    assert.equal(getAmbito('Taça Serra Azul XCO 2028'),'');
    const input=race('Apedalar',{title:'Taça Serra Azul XCO 2028',ambito:'Taça de Portugal'});
    const db=database([{...input,ambito:'Taça de Portugal'}]);
    await saveOrMergeEvent(db,input);
    assert.equal(db.rows[0].ambito,null);
    assert.equal(getAmbito('Taça de Portugal XCO - Oeste 2028'),'Taça de Portugal');
});

test('generic GP, classic and memorial names do not establish a national scope',()=>{
    for(const title of ['Grande Prémio da Vila','GP Serra Azul','Clássica do Rio','Memorial da Aldeia','Volta às Terras da Serra'])assert.equal(getAmbito(title),'');
    assert.equal(getAmbito('Circuito Nacional de Gravel'),'Nacional');
    assert.equal(getAmbito('Grande Prémio', '1.2', '', 'FPC'),'Internacional');
});

test('FPC structured categories replace outdated guesses on exact IDs and equivalent matches',async()=>{
    for(const sameId of [true,false]) {
        const input=race('FPC',{title:'Prova Jovem',details:'Fundão | 1.17',tag:'Estrada',escaloes:['Masters / Veteranos']});
        const db=database([{...input,id:sameId?input.id:'external-old',source:sameId?'FPC':'Stop and Go',escaloes:'["Masters / Veteranos"]'}]);
        const result=await saveOrMergeEvent(db,input);
        assert.equal(result.action,sameId?'updated':'merged');assert.equal(db.rows.length,1);
        assert.deepEqual(JSON.parse(db.rows[0].escaloes),['Sub-17 (Cadetes)']);
    }
});

test('a later non-official source does not overwrite structured FPC classification',async()=>{
    const old=race('FPC',{tag:'Estrada',ambito:'Campeonato Nacional',escaloes:'["Sub-17 (Cadetes)"]'});
    const db=database([old]);
    await saveOrMergeEvent(db,race('Stop and Go',{id:old.id,tag:'BTT',ambito:'Prova Aberta',escaloes:['Masters / Veteranos']}));
    assert.equal(db.rows[0].tag,'Estrada');assert.equal(db.rows[0].ambito,'Campeonato Nacional');
    assert.deepEqual(JSON.parse(db.rows[0].escaloes),['Sub-17 (Cadetes)']);
});

test('FPC TP classification survives minimal storage and promotional text cannot create a championship',async()=>{
    const db=database();
    await saveOrMergeEvent(db,race('FPC',{title:'Prova oficial',details:'Fundão | TP'}));
    assert.equal(db.rows[0].ambito,'Taça de Portugal');
    const guest=database();
    await saveOrMergeEvent(guest,race('Cabreira',{title:'Passeio de bicicleta',description:'Campeonato Nacional XCO - Masters'}));
    assert.equal(guest.rows[0].ambito,'Prova Aberta');
    assert.equal(guest.rows[0].tag,'Passeio / Lazer');assert.equal(guest.rows[0].escaloes,undefined);
});

test('a generic ride title retains the published cycling modality',async()=>{
    const db=database();
    await saveOrMergeEvent(db,race('Stop and Go',{title:'Rota das Aldeias',tag:'BTT'}));
    assert.equal(db.rows[0].tag,'BTT');
});
