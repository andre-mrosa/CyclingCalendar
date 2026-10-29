import test from 'node:test';import assert from 'node:assert/strict';
import {isSameEvent} from '../app/lib/merging/eventMatcher.js';
import {mergeEvents} from '../app/utils/mergeEvents.js';
const first={id:'fpc-old',source:'FPC',title:'5ª Taça de Portugal Ciclocrosse',sortDate:'2026-12-05',details:'Vale de Cambra',escaloes:[]};
const second={...first,id:'fpc-new',title:'5ª Taça de Portugal Ciclocross'};
test('official spelling aliases display once while preserving both favorite identifiers',()=>{
    assert.equal(isSameEvent(first,second),true);const result=mergeEvents([first,second]);assert.equal(result.length,1);assert.deepEqual(new Set(result[0]._allIds),new Set([first.id,second.id]));
});
test('spelling aliases never collapse different official rounds, dates, categories or locations',()=>{
    for(const extra of [{title:'6ª Taça de Portugal Ciclocross'},{sortDate:'2026-12-06'},{details:'Barcelos'},{title:'5ª Taça de Portugal Ciclocross - Masters'}])assert.equal(isSameEvent(first,{...second,...extra}),false);
});
