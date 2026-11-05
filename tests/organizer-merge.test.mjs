import test from 'node:test';
import assert from 'node:assert/strict';
import {saveOrMergeEvent} from '../app/lib/merging/eventMerger.js';
function database(initial=[]){const rows=structuredClone(initial);return {rows,event:{findUnique:async({where})=>rows.find(row=>row.id===where.id)||null,findMany:async()=>rows,create:async({data})=>{rows.push(data);return data;},update:async({where,data})=>{const row=rows.find(row=>row.id===where.id);Object.assign(row,data);return row;}}};}
const monthly={id:'organizador-terra-norte-2027',title:'Terra Norte 2027',date:'— OUT 2027',sortDate:'2027-10-01',source:'Organizador',link:'https://terranorte.pt/',tag:'Gravel',details:'Vila Real',temporalEvidence:{version:1,series:'terra-norte',race:{precision:'month',value:'2027-10',source:'https://terranorte.pt/'}}};
test('FPC confirmation refines an announced month in the original row, preserving personal-event identity',async()=>{
 const db=database();await saveOrMergeEvent(db,monthly);
 await saveOrMergeEvent(db,{...monthly,id:'fpc-terra-norte-23-OUT-2027',source:'FPC',date:'23 OUT 2027',sortDate:'2027-10-23',temporalEvidence:undefined});
 assert.equal(db.rows.length,1);assert.equal(db.rows[0].id,monthly.id);assert.equal(db.rows[0].date,'23 OUT 2027');assert.match(db.rows[0].source,/FPC/);
 // The next organizer consultation still only advertises a month.
 await saveOrMergeEvent(db,monthly);assert.equal(db.rows[0].date,'23 OUT 2027');assert.equal(db.rows[0].sortDate.toISOString().slice(0,10),'2027-10-23');
});
test('new organizer collection enriches the existing manually added MQ without replacing its ID',async()=>{
 const existing={...monthly,id:'organizador-mountain-quest-2027',title:'Mountain Quest 2027',date:'19 JUN 2027',sortDate:'2027-06-19',tag:'BTT',temporalEvidence:undefined,link:'https://mountainquest.pt/'};
 const db=database([existing]);
 await saveOrMergeEvent(db,{...existing,registrationOpensAt:'2027-04-01T00:00:00Z',temporalEvidence:{version:1,series:'mountain-quest',registrationOpen:{precision:'month',value:'2027-04',source:'https://mountainquest.pt/registrations/'}}});
 assert.equal(db.rows.length,1);assert.equal(db.rows[0].id,existing.id);assert.equal(db.rows[0].temporalEvidence.registrationOpen.precision,'month');
 // An exact opening date must not be degraded by an older monthly announcement.
 await saveOrMergeEvent(db,{...existing,source:'FPC',registrationOpensAt:'2027-04-14T12:00:00Z'});
 await saveOrMergeEvent(db,{...existing,registrationOpensAt:'2027-04-01T00:00:00Z',temporalEvidence:{version:1,series:'mountain-quest',registrationOpen:{precision:'month',value:'2027-04',source:'https://mountainquest.pt/registrations/'}}});
 assert.equal(db.rows[0].registrationOpensAt.toISOString(),'2027-04-14T12:00:00.000Z');assert.notEqual(db.rows[0].temporalEvidence.registrationOpen?.precision,'month');
});
test('conflicting exact dates from another source are visible and do not silently move the race',async()=>{
 const db=database([{...monthly,date:'23 OUT 2027',sortDate:'2027-10-23'}]);
 await assert.rejects(saveOrMergeEvent(db,{...monthly,id:'new-fpc-id',source:'FPC',date:'24 OUT 2027',sortDate:'2027-10-24',temporalEvidence:undefined}),/Conflito de datas/);assert.equal(db.rows[0].date,'23 OUT 2027');
});
