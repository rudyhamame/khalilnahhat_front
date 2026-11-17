import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentChanges,isChangeTarget,changedPaths} from './equipmentChange.js';
import {createEventOrder} from './eventOrderCore.mjs';
test('an added or re-quantified item is a target, an untouched item is not',()=>{
 const before={...createEventOrder(),equipment:[{id:'a',quantity:1},{id:'b',quantity:2}],services:['sound']};
 const after={...before,equipment:[{id:'a',quantity:1},{id:'b',quantity:4},{id:'c',quantity:8}],services:['sound','lighting']};
 const changes=equipmentChanges(before,after);
 assert.deepEqual([...changes.items].sort(),['b','c']);assert.deepEqual([...changes.services],['lighting']);
 assert.equal(isChangeTarget('equipment:sound:b',['equipment'],changes),true);
 assert.equal(isChangeTarget('equipment:sound:a',['equipment'],changes),false);
 assert.equal(isChangeTarget('service:lighting',['services'],changes),true);
 assert.equal(isChangeTarget('service:sound',['services'],changes),false);
});
test('changed atoms include ones a change moves by itself',()=>{
 const before=createEventOrder(),after=structuredClone(before);after.music.djRequested=true;after.event.guestCount=150;
 assert.deepEqual(changedPaths(before,after).sort(),['event.guestCount','music.djRequested']);
});
