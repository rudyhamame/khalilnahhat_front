import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingDataAtomsGuide,bookingDataAtomsGuideRoute} from './bookingDataAtomsGuide.js';
import {fields,isAiEditableField} from '../../lib/eventOrderCore.mjs';
test('the Echo Booking Data Atoms doc lists every client atom, generated from the contract',()=>{
 assert.match(bookingDataAtomsGuideRoute,/guide=booking-data-atoms/);
 const paths=bookingDataAtomsGuide.sections.filter(section=>section.id.startsWith('asked-')&&section.id!=='asked-overview').flatMap(section=>section.blocks[0].rows.map(row=>row[0]));
 for(const field of fields)if(!field.key.match(/^event\.venue\.(latitude|longitude|source|sourceId|sourceAttribution)$/))assert.ok(paths.includes(field.key),field.key);
 assert.equal(new Set(paths).size,paths.length); // no atom is listed twice
 // Part 2 covers every atom too, and its write column is exactly the rule the server applies.
 const scope=bookingDataAtomsGuide.sections.find(section=>section.id==='ai-scope').blocks.find(block=>block.type==='table').rows;
 assert.equal(new Set(scope.map(row=>row[0])).size,scope.length);
 for(const row of scope)assert.equal(row[3].startsWith('Yes'),isAiEditableField(row[0]),row[0]);
 assert.ok(scope.some(row=>row[0]==='planning.mustPlay')===false);
 assert.ok(bookingDataAtomsGuide.sections.every(section=>section.blocks.length>0));
});
