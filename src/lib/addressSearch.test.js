import test from 'node:test';
import assert from 'node:assert/strict';
import {venueArea,isGta,formatPostal} from './addressSearch.js';
test('venue search can still filter by municipality or coordinates',()=>{
 assert.equal(venueArea({city:'Mississauga'}),'gta');assert.equal(venueArea({city:'Ottawa'}),'outside_gta');
 assert.equal(venueArea({longitude:-79.38,latitude:43.65}),'gta');assert.equal(venueArea({}),null);
 assert.equal(isGta('Richmond Hill'),true);assert.equal(formatPostal('m5v2t6'),'M5V 2T6');
});
