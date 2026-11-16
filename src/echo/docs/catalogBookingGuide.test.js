import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogBookingGuide,catalogBookingGuideRoute} from './catalogBookingGuide.js';
import {eventAtomAuditGuideRoute} from './eventAtomAuditGuide.js';
import {servicesAuditGuideRoute} from './servicesAuditGuide.js';

test('catalog audit retains its route, complete tables and links to the dedicated audits',()=>{
 assert.equal(new URL(catalogBookingGuideRoute,'https://echo.invalid').searchParams.get('guide'),catalogBookingGuide.id);
 assert.equal(catalogBookingGuide.reviewedOn,'2026-11-16');
 assert.equal(new Set(catalogBookingGuide.sections.map(section=>section.id)).size,catalogBookingGuide.sections.length);
 const destinations=catalogBookingGuide.sections.flatMap(section=>section.blocks).filter(block=>block.type==='links').flatMap(block=>block.items.map(([,href])=>href));
 assert.ok(destinations.includes(eventAtomAuditGuideRoute));assert.ok(destinations.includes(servicesAuditGuideRoute));
 for(const section of catalogBookingGuide.sections){assert.ok(section.blocks.length);for(const block of section.blocks)if(block.type==='table')for(const row of block.rows)assert.equal(row.length,block.headers.length);}
});
test('catalog audit distinguishes read awareness, write permissions, open findings and unverified deployment',()=>{
 const text=JSON.stringify(catalogBookingGuide).toLowerCase();
 for(const phrase of ['account-owned contact fields remain read-only','manual-only location','past date','overnight','submitted order','equipment_search','tracked inventory','open findings','deployed environment'])assert.ok(text.includes(phrase),phrase);
 for(const obsolete of ['53 typed items','main page now runs live (01)','can read and update all defined fields','api changes in this refactor have not been deployed'])assert.ok(!text.includes(obsolete),obsolete);
 const navigation=catalogBookingGuide.sections.find(section=>section.id==='assistant-navigation').blocks.find(block=>block.type==='table');
 const setup=navigation.rows.find(row=>row[0].includes('event.setup.requirements'));
 assert.match(setup[1],/\/rentals#setup-notes/);assert.ok(!setup[2].includes('Simulation face'));
 assert.ok(navigation.rows.some(row=>row[1].includes('/room')));
});
