import test from 'node:test';
import assert from 'node:assert/strict';
import {rankVenues,venueScore} from './venueLexical.js';

const items=[
 {name:'Toronto Union Station',address:'65 Front St W, Toronto, ON'},
 {name:'CN Tower',address:'301 Front St W, Toronto, ON'},
 {name:'Tower Hotel',address:'12 King St, Hamilton, ON'},
 {name:'Café du Parc',address:'1 Park Rd, Ottawa, ON'},
];
test('matches whole words and prefixes, ignoring case, accents and punctuation',()=>{
 assert.deepEqual(rankVenues(items,'tow').map(v=>v.name),['Tower Hotel','CN Tower','Toronto Union Station']);
 assert.deepEqual(rankVenues(items,'CAFE du').map(v=>v.name),['Café du Parc']);
});
test('every typed word must match; results without a match are dropped',()=>{
 assert.deepEqual(rankVenues(items,'tower hamilton').map(v=>v.name),['Tower Hotel']);
 assert.equal(rankVenues(items,'zzz').length,0);
});
test('exact and leading name matches rank above address-only matches',()=>{
 assert.equal(rankVenues(items,'cn tower')[0].name,'CN Tower');
 assert.ok(venueScore(items[1],'cn tower')>venueScore(items[0],'front'));
});
test('tolerates a misspelt word: "kig" finds The Keg, "tronto" finds Toronto',()=>{
 const more=[{name:'The Keg Steakhouse',address:'9 Bay St, Toronto, ON'},{name:'Lara\'s Kitchen',address:'4 Main St, Guelph, ON'},...items];
 assert.equal(rankVenues(more,'kig')[0].name,'The Keg Steakhouse');
 assert.deepEqual(rankVenues(more,'lar').map(v=>v.name),['Lara\'s Kitchen']);
 assert.ok(rankVenues(more,'torotno').some(v=>v.name==='Toronto Union Station'));
 assert.equal(rankVenues(more,'xqz').length,0);
});
