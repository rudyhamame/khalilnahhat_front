import {test} from 'node:test';
import assert from 'node:assert/strict';
import {venueResultReply} from './venueResultReply.js';

const items=Array.from({length:10},(_,index)=>({name:`Venue ${index+1}`,address:`${index+1} Main St`}));
test('full-list follow-ups return every venue without asking the model',()=>{
 for(const text of ['I want the full list!!!!','Show me all results','List them all','show the venue results','اعرض جميع النتائج','أريد القائمة كاملة']){
  assert.deepEqual(venueResultReply(text,[],{query:'Lara',items}).items,items);
 }
});
test('restored history supplies the full grid even without a live search',()=>{
 assert.deepEqual(venueResultReply('show the full list',[{role:'assistant',content:'Choose a venue',venueResults:items}],null).items,items);
});
test('older map-only replies repeat their original venue search',()=>{
 const history=[{role:'user',content:'venue: Lara restaurant'},{role:'assistant',content:'Which result in Venue Details matches your venue?'}];
 assert.deepEqual(venueResultReply('I want the full list',history,null),{items:[],query:'Lara restaurant'});
});
test('unrelated equipment lists do not reuse venue results without venue context',()=>{
 assert.equal(venueResultReply('show the full list',[],null),null);
 assert.equal(venueResultReply('Add 2 speakers',[],{items}),null);
 assert.equal(venueResultReply('Show the full list of equipment',[],{items}),null);
});
