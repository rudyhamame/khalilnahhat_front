import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveResults } from './archiveSearch.js';
const data = {
  categories:[{id:'c',title:'Wedding Entrances'}],
  albums:[{id:'a',title:'Entrance 2026',categoryId:'c',year:2026},{id:'b',title:'Entrance 2025',categoryId:'c',year:2025}],
  songs:[{id:'one',title:'Celebrate',artist:'Khalil',albumId:'a',date:'2026-10-24',sortOrder:1},{id:'two',title:'First Dance',artist:'Guest',albumId:'b',date:'2025-06-01',sortOrder:0}],
};
test('search finds songs through artists, album titles, category and year, and surfaces their albums', () => {
  for (const query of ['Khalil','Entrance 2026','2026']) {
    const result = archiveResults(data,{query});
    assert.deepEqual(result.songs.map(s => s.id),['one']);
    assert.deepEqual(result.albums.map(a => a.id),['a']);
  }
  assert.equal(archiveResults(data,{query:'Wedding'}).songs.length,2);
});
test('year/category/album filters combine and sorting does not mutate the saved order', () => {
  assert.deepEqual(archiveResults(data,{category:'c',year:'2025'}).songs.map(s => s.id),['two']);
  assert.deepEqual(archiveResults(data,{albumId:'a'}).songs.map(s => s.id),['one']);
  assert.deepEqual(archiveResults(data,{sort:'curated'}).songs.map(s => s.id),['two','one']);
  assert.deepEqual(data.songs.map(s => s.id),['one','two']);
  assert.equal(archiveResults(data,{query:'not present'}).albums.length,0);
});
