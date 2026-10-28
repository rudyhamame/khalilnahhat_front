import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveLibrary} from './archiveLibrary.js';
import {archiveResults} from './archiveSearch.js';
test('library keeps playable recordings and never mutates the catalog',()=>{
  const original={collections:[{id:'c',title:'Set',recordingIds:['s1']}],songs:[{id:'s1',title:'First',audioUrl:'/1.mp3'},{id:'s2',title:'No audio'}]};
  const library=archiveLibrary(original);
  assert.deepEqual(archiveResults(library,{collectionId:'c'}).songs.map(item=>item.id),['s1']);
  assert.equal(library.songs.length,1);assert.equal(original.songs.length,2);
});
test('empty catalogs stay empty',()=>assert.deepEqual(archiveLibrary({collections:[],songs:[]}),{collections:[],songs:[]}));
