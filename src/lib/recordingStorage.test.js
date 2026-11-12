import test from 'node:test';
import assert from 'node:assert/strict';
import {storedOn} from './recordingStorage.js';

test('a live in progress is not on OVH until OVH has received bytes from it',()=>{
 assert.equal(storedOn({status:'recording',bytes:0,partCount:0},{id:'a'}).onOvh,false);
 assert.equal(storedOn({status:'recording',bytes:5e6,partCount:0},{id:'a'}).onOvh,true);
});
test('local-only recordings are never on OVH; finished ones are on OVH until archived',()=>{
 assert.deepEqual(storedOn({status:'local',partCount:0}),{onComputer:true,onOvh:false,inCloud:false});
 assert.equal(storedOn({status:'processing',partCount:0}).onOvh,true);
 assert.equal(storedOn({status:'ready',partCount:3}).onOvh,false);
 assert.equal(storedOn({status:'ready',partCount:3,cleanupPending:true}).onOvh,true);
});
