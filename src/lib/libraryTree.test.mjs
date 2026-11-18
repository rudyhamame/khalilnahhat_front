import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryTree} from './libraryTree.mjs';
test('recordings are grouped by work type, then by collection, and the rest stay visible',()=>{
 const tree=libraryTree([{id:'REMIX',name:'Remix'},{id:'COVER',name:'Cover'}],[{id:'c1',title:'Weddings',workTypeId:'REMIX',recordingIds:['a']}],[{id:'a',title:'A',workType:'REMIX'},{id:'b',title:'B',workType:'REMIX'},{id:'c',title:'C',workType:'LIVE'}]);
 assert.equal(tree[0].collections[0].recordings[0].id,'a');assert.deepEqual(tree[0].loose.map(row=>row.id),['b']);assert.equal(tree[1].count,0);
 assert.equal(tree.at(-1).name,'Other recordings');assert.equal(tree.at(-1).loose[0].id,'c');
});
