import test from 'node:test';
import assert from 'node:assert/strict';
import {facetIndex,matchesSelection} from './collectionFacets.mjs';
const rec=(id,{genre,bpm,seconds,language,dialect,rhythm,artist}={})=>({id,artist,audio:{durationSeconds:seconds},work:{melody:{bpm,rhythm:rhythm&&{name:rhythm},genres:genre?[{name:genre}]:[]},lyrics:language?{language:{name:language},dialect:dialect&&{name:dialect}}:null}});
const rows=[rec('a',{genre:'Khaleeji',bpm:96,seconds:200,language:'Arabic',dialect:'Gulf',rhythm:'Khaliji',artist:'X'}),rec('b',{genre:'Pop',bpm:128,seconds:320,language:'English'}),rec('c',{genre:'Khaleeji',bpm:130,seconds:170,language:'Arabic',dialect:'Iraqi'})];
test('facet index lists values with counts and buckets numbers',()=>{
  const index=Object.fromEntries(facetIndex(rows).map(f=>[f.id,f]));
  assert.deepEqual(index.genre.values,[{value:'Khaleeji',count:2},{value:'Pop',count:1}]);
  assert.deepEqual(index.bpm.values.map(v=>v.value),['80–99','120–139']);
  assert.deepEqual(index.duration.values.map(v=>v.value),['Under 3 min','3–4 min','Over 5 min']);
  assert.equal(index.dialect.values.length,2);
});
test('selection is AND across keys and OR within a key',()=>{
  const pick=selection=>rows.filter(r=>matchesSelection(r,selection)).map(r=>r.id);
  assert.deepEqual(pick({}),['a','b','c']);
  assert.deepEqual(pick({genre:['Khaleeji']}),['a','c']);
  assert.deepEqual(pick({genre:['Khaleeji'],bpm:['120–139']}),['c']);
  assert.deepEqual(pick({language:['Arabic','English'],duration:['Over 5 min']}),['b']);
  assert.deepEqual(pick({genre:[]}),['a','b','c']);
});
