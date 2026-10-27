import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveLibrary} from './archiveLibrary.js';
import {archiveResults} from './archiveSearch.js';
test('category and album selection only returns their recordings',()=>{
  const original={categories:[{id:'a',title:'Weddings'},{id:'b',title:'Live'}],albums:[{id:'one',title:'One',categoryId:'a'},{id:'two',title:'Two',categoryId:'b'}],songs:[{id:'s1',title:'First',albumId:'one',audioUrl:'/1.mp3'},{id:'s2',title:'Second',albumId:'two',audioUrl:'/2.mp3'}]};
  const library=archiveLibrary(original);
  assert.deepEqual(archiveResults(library,{category:'a',albumId:'one'}).songs.map(item=>item.id),['s1']);
  assert.equal(original.albums.length,2);
});
test('legacy recordings get honest display collections, without fake songs',()=>{
  const original={categories:[],albums:[],songs:[{id:'s1',title:'Real recording',category:'mix',audioUrl:'/real.mp3'}]};
  const library=archiveLibrary(original);
  assert.equal(library.albums[0].isLoose,true);
  assert.deepEqual(archiveResults(library,{category:'legacy:mix',albumId:library.albums[0].id}).songs.map(item=>item.id),['s1']);
  assert.equal(original.songs[0].albumId,undefined);
  assert.equal(original.categories.length,0);
});
test('empty catalogs stay empty',()=>assert.deepEqual(archiveLibrary({categories:[],albums:[],songs:[]}),{categories:[],albums:[],songs:[]}));
