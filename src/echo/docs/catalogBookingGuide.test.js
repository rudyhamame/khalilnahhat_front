import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogBookingGuide,catalogBookingGuideRoute} from './catalogBookingGuide.js';
test('catalog operations report includes full draft control, navigation and explicit rollout boundaries',()=>{
 assert.equal(new URL(catalogBookingGuideRoute,'https://echo.invalid').searchParams.get('guide'),catalogBookingGuide.id);
 assert.equal(new Set(catalogBookingGuide.sections.map(section=>section.id)).size,catalogBookingGuide.sections.length);
 const text=JSON.stringify(catalogBookingGuide);
 for(const phrase of ['full draft control','equipment_search','simulation face','not been deployed','complete bundles','component inventory'])assert.ok(text.toLowerCase().includes(phrase.toLowerCase()),phrase);
 for(const section of catalogBookingGuide.sections)for(const block of section.blocks)if(block.type==='table')for(const row of block.rows)assert.equal(row.length,block.headers.length);
});
