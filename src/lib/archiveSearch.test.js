import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveResults } from './archiveSearch.js';
const data = {
  collections:[{id:'a',title:'Wedding Entrances',recordingIds:['two','one']},{id:'b',title:'Empty set',recordingIds:[]}],
  songs:[{id:'one',title:'Celebrate',artist:'Khalil',date:'2026-10-24',sortOrder:1},{id:'two',title:'First Dance',artist:'Guest',date:'2025-06-01',sortOrder:0},{id:'three',title:'Solo',artist:'Khalil',date:'2024-01-01',sortOrder:2}],
};
test('search finds songs by title, artist, date or collection title and surfaces their collections', () => {
  assert.deepEqual(archiveResults(data,{query:'Khalil'}).songs.map(s => s.id),['one','three']);
  assert.deepEqual(archiveResults(data,{query:'Khalil'}).collections.map(c => c.id),['a']);
  assert.deepEqual(archiveResults(data,{query:'Wedding'}).songs.map(s => s.id),['one','two']);
  assert.equal(archiveResults(data,{query:'not present'}).collections.length,0);
});
test('a chosen collection returns only its recordings, in the order Khalil set', () => {
  assert.deepEqual(archiveResults(data,{collectionId:'a',sort:'curated'}).songs.map(s => s.id),['two','one']);
  assert.deepEqual(archiveResults(data,{collectionId:'b',sort:'curated'}).songs,[]);
  assert.deepEqual(archiveResults(data,{sort:'curated'}).songs.map(s => s.id),['two','one','three']);
  assert.deepEqual(data.songs.map(s => s.id),['one','two','three']);
});
