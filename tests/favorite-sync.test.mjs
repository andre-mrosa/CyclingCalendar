import test from 'node:test';
import assert from 'node:assert/strict';
import { createFavoriteSynchronizer, favoriteCacheKey, favoritePendingKey } from '../app/utils/favoriteSync.js';
function fixture() {
    const values = new Map(); let online = true;
    const sync = createFavoriteSynchronizer({read:(key,fallback)=>values.get(key)??fallback, write:(key,value)=>values.set(key,value), online:()=>online});
    const save=(id,list)=>{values.set(favoriteCacheKey(id),JSON.stringify(list));values.set(favoritePendingKey(id),'true');};
    return {values,sync,save,setOnline:value=>{online=value;}};
}
test('rapid account edits are serialized and the latest favorite list wins', async()=>{
    const f=fixture(); const writes=[]; let release;
    const gate=new Promise(resolve=>{release=resolve;});
    const user={id:'one',unsafeMetadata:{other:'preserved'},update:async data=>{writes.push(data);if(writes.length===1)await gate;}};
    f.save('one',['a']);const first=f.sync(user);await Promise.resolve();await Promise.resolve();
    f.save('one',['b']);const second=f.sync(user);release();await Promise.all([first,second]);
    assert.deepEqual(writes.map(data=>data.unsafeMetadata.favorites),[['a'],['b']]);
    assert.equal(writes[1].unsafeMetadata.other,'preserved');assert.equal(f.values.get(favoritePendingKey('one')),'false');
});
test('offline edits remain pending and sync when the connection returns',async()=>{
    const f=fixture();let calls=0;const user={id:'one',update:async()=>{calls++;}};
    f.setOnline(false);f.save('one',['a']);await f.sync(user);assert.equal(calls,0);assert.equal(f.values.get(favoritePendingKey('one')),'true');
    f.setOnline(true);await f.sync(user);assert.equal(calls,1);assert.equal(f.values.get(favoritePendingKey('one')),'false');
});
test('failed writes do not erase pending edits and separate accounts never share lists',async()=>{
    const f=fixture();let fail=true;const first={id:'one',update:async()=>{if(fail)throw Error('offline');}};let secondList;
    const second={id:'two',update:async data=>{secondList=data.unsafeMetadata.favorites;}};
    f.save('one',['private-a']);f.save('two',['private-b']);await Promise.all([f.sync(first),f.sync(second)]);
    assert.equal(f.values.get(favoritePendingKey('one')),'true');assert.deepEqual(secondList,['private-b']);
    fail=false;await f.sync(first);assert.equal(f.values.get(favoritePendingKey('one')),'false');
});
