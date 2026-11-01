import test from 'node:test';
import assert from 'node:assert/strict';
import {liveStreamGuide,guideLinks,operationsGuideRoute} from './liveStreamGuide.js';

test('guide navigation has ten unique sections and a canonical nested service route',()=>{
 assert.equal(liveStreamGuide.sections.length,10);
 const ids=liveStreamGuide.sections.map(section=>section.id);
 assert.equal(new Set(ids).size,10);
 for(const id of ids)assert.match(id,/^[a-z][a-z-]+$/);
 const url=new URL(operationsGuideRoute,'https://echo.invalid');
 assert.equal(url.pathname,'/admin/echo');assert.equal(url.searchParams.get('tab'),'service-overview-operations-guide');assert.equal(url.searchParams.get('guide'),liveStreamGuide.id);
});
test('structured content renders complete tables, details, steps and safe destinations',()=>{
 const walk=blocks=>{for(const block of blocks){
  assert.ok(['paragraph','list','steps','links','table','details','checklist','diagram'].includes(block.type),block.type);
  if(block.type==='table'){assert.ok(block.rows.length);for(const row of block.rows)assert.equal(row.length,block.headers.length);}
  if(block.type==='details'){assert.ok(block.title);walk(block.blocks);}
  if(block.type==='links')for(const [,href] of block.items){assert.ok(href.startsWith('/admin/')||href==='/#live'||href.startsWith('https://'));assert.ok(!href.includes('token='));}
 }};
 for(const section of liveStreamGuide.sections){assert.ok(section.title);assert.ok(section.blocks.length);walk(section.blocks);}
 assert.equal(guideLinks.studio,'/admin/live-stream');assert.equal(guideLinks.recordings,'/admin/echo?tab=live-archive');
 assert.equal(liveStreamGuide.sections.find(section=>section.id==='first-stream').blocks.find(block=>block.type==='checklist').items.length,7);
});
