import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPatches} from './recordingCollections.js';

const collections=[{id:'a',workTypeId:'MIX',recordingIds:['r1']},{id:'b',workTypeId:'MIX',recordingIds:[]},{id:'c',workTypeId:'REMIX',recordingIds:['r1']}];
test('moves a recording into the chosen collection and out of every other one',()=>{
 assert.deepEqual(collectionPatches(collections,'r1','MIX','b'),[{id:'a',recordingIds:[]},{id:'b',recordingIds:['r1']},{id:'c',recordingIds:[]}]);
});
test('nothing to do when it is already in the chosen collection',()=>{
 assert.deepEqual(collectionPatches([collections[0]],'r1','MIX','a'),[]);
});
test('a collection of another work type is never chosen; "no collection" leaves them all',()=>{
 assert.deepEqual(collectionPatches([collections[2]],'r2','MIX','c'),[]);
 assert.deepEqual(collectionPatches(collections,'r1','MIX',''),[{id:'a',recordingIds:[]},{id:'c',recordingIds:[]}]);
});
