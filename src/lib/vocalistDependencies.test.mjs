import test from 'node:test';
import assert from 'node:assert/strict';
import {dialectsForLanguages} from './vocalistDependencies.mjs';

test('vocalist dialect options follow selected languages, including legacy parent links',()=>{
 const rows=[{id:'sy',parentId:'ar'},{id:'ca',languageIds:['en','fr']},{id:'unlinked'},{id:'eg',languageIds:['ar'],parentId:'ar'}];
 assert.deepEqual(dialectsForLanguages(rows,[]),[]);
 assert.deepEqual(dialectsForLanguages(rows,['ar']).map(row=>row.id),['sy','eg']);
 assert.deepEqual(dialectsForLanguages(rows,['fr']).map(row=>row.id),['ca']);
 assert.deepEqual(dialectsForLanguages(rows,['ar','en']).map(row=>row.id),['sy','ca','eg']);
});
