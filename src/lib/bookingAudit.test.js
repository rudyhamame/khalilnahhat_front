import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,updateOrderField,normalizeEventOrder,preserveMusicLanguages,fieldName} from './eventOrderCore.mjs';
import {bookingSections} from './bookingSections.js';

test('song moments have a clear label and no longer fill the retired Entrance text field',()=>{
 let order=createEventOrder();const song={song:'Ahla Marra',artist:'Melhem Zein',phase:'Grand entrance',link:'https://youtu.be/example'};
 order=updateOrderField(order,'music.suggestedSongs',[song]);
 assert.equal(fieldName('music.suggestedSongs'),'Songs for event moments');
 assert.equal(order.music.entrance,undefined);
});
test('successive language additions retain existing languages and dialects; explicit replacements still replace',()=>{
 const order=createEventOrder();order.music.languagePairs=[{language:'Arabic',dialect:'Lebanese'}];
 const patch=[{path:'music.languagePairs',value:JSON.stringify([{language:'English',dialect:''}])}];
 const first=preserveMusicLanguages(order,patch,'Add English too');
 assert.deepEqual(JSON.parse(first[0].value),[{language:'Arabic',dialect:'Lebanese'},{language:'English',dialect:''}]);
 order.music.languagePairs=JSON.parse(first[0].value);
 const second=preserveMusicLanguages(order,[{path:'music.languagePairs',value:[{language:'Arabic',dialect:'Syrian'}]}],'Also Arabic in Syrian dialect');
 assert.deepEqual(second[0].value,[{language:'Arabic',dialect:'Lebanese'},{language:'English',dialect:''},{language:'Arabic',dialect:'Syrian'}]);
 assert.deepEqual(preserveMusicLanguages(order,patch,'Only English, replace the languages'),patch);
 assert.deepEqual(preserveMusicLanguages(order,patch,'Remove Arabic'),patch);
 assert.deepEqual(JSON.parse(preserveMusicLanguages(order,patch,'Only instrumental songs for dinner; add English too')[0].value),[{language:'Arabic',dialect:'Lebanese'},{language:'English',dialect:''}]);
 const empty=preserveMusicLanguages(order,[{path:'music.languagePairs',value:[]}],'Add another dialect');assert.equal(empty[0].value.length,2);
});
test('MC category shows selected equipment even before a separate hosting decision is answered',()=>{
 const service={id:'mc',selectionField:'music.mcRequested',bookingServiceId:'rental',equipment:[{id:'mc-mic'},{id:'lectern'},{id:'mc-host'}]};
 const order=createEventOrder();order.equipment=service.equipment.map(row=>({id:row.id,quantity:1}));
 const mc=bookingSections(order,[service]).rentals[0];assert.equal(mc.on,true);assert.equal(mc.equipment.filter(row=>row.quantity).length,3);
 assert.equal(order.music.mcRequested,null,'display must not invent a hosting decision');
});
