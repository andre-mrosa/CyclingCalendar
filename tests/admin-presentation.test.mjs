import test from 'node:test';
import assert from 'node:assert/strict';
import {runSummary,duration,sourceScope} from '../app/utils/adminPresentation.js';
test('partial, failed, interrupted and missing runs never claim success',()=>{
 for(const status of ['partial','error','failed','interrupted','unknown'])assert.ok(!runSummary({status}).text.includes('sucesso'));
 assert.equal(runSummary({status:'partial',sources:{sg:{name:'Stop and Go',status:'error'}}}).attention,true);
 assert.equal(runSummary({status:'partial',sources:{sg:{status:'error'}}}).problems.length,1);
 assert.equal(runSummary({status:'success'},true).status,'running');
 assert.equal(runSummary({status:'success'}).attention,false);
 assert.equal(runSummary({status:'success',sources:{sg:{status:'error'}}}).status,'partial');
 assert.equal(runSummary(null).status,'unknown');
});
test('operator copy formats duration and human-readable scopes',()=>{
 assert.equal(duration(315.5),'5 min 16 s');assert.equal(duration('219.2s'),'3 min 39 s');assert.equal(duration(null),'—');
 assert.equal(sourceScope('Apedalar:active'),'Apedalar · época ativa');assert.equal(sourceScope('FPC:2027'),'FPC · 2027');
});
