import test from 'node:test';
import assert from 'node:assert/strict';
import {clientBookingGuide,clientBookingGuideRoute} from './clientBookingGuide.js';

test('client booking guide has stable subtab route and complete sections',()=>{
 const route=new URL(clientBookingGuideRoute,'https://echo.invalid');
 assert.equal(route.pathname,'/admin/echo');
 assert.equal(route.searchParams.get('tab'),'service-overview-operations-guide');
 assert.equal(route.searchParams.get('guide'),clientBookingGuide.id);
 assert.equal(clientBookingGuide.reviewedOn,'2026-11-02');
 assert.ok(clientBookingGuide.sections.length>=8);
 assert.equal(new Set(clientBookingGuide.sections.map(section=>section.id)).size,clientBookingGuide.sections.length);
 for(const section of clientBookingGuide.sections){assert.ok(section.title);assert.ok(section.blocks.length);}
});

test('guide describes the implemented approval and confirmation gates without claiming instant booking',()=>{
 const text=JSON.stringify(clientBookingGuide).toLowerCase();
 for(const phrase of ['not an instant booking','accepted active quote','date and equipment checks','http 409','does not collect card payments online'])assert.ok(text.includes(phrase),phrase);
 for(const section of clientBookingGuide.sections)for(const block of section.blocks){
  if(block.type==='table')for(const row of block.rows)assert.equal(row.length,block.headers.length);
  if(block.type==='links')for(const [,href] of block.items)assert.ok(href.startsWith('/'));
 }
});
