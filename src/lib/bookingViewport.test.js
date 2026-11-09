import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingFieldSection,scrollToBookingField,scrollToAppSection} from './bookingViewport.js';
test('assistant follows the actual event, work, explorer, simulation and booking faces',()=>{
 const events=[];
 const element={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:200}),scrollIntoView:()=>{}};
 global.document={querySelector:selector=>selector.includes('dialog[')?null:selector==='.echo-header'?null:element,querySelectorAll:()=>[]};
 global.window={scrollY:0,dispatchEvent:event=>{events.push(event);return true;},scrollTo:()=>{},matchMedia:()=>({matches:true})};
 global.requestAnimationFrame=fn=>fn();
 try{
  assert.equal(bookingFieldSection('event.type'),'availability');assert.equal(bookingFieldSection('music.styles'),'work');
  assert.equal(scrollToBookingField('equipment').section,'setup');assert.equal(events.find(event=>event.type==='echo:rental-face').detail,'explorer');
  events.length=0;assert.equal(scrollToBookingField('event.venue.name').section,'availability');assert.equal(events.find(event=>event.type==='echo:availability-face').detail,'venue');
  events.length=0;assert.equal(scrollToBookingField('event.date').section,'availability');assert.equal(events.find(event=>event.type==='echo:availability-face').detail,'calendar');
  assert.equal(scrollToBookingField('event.setup.powerAvailable').section,'simulation');
  assert.equal(scrollToBookingField('customer.phone').section,'booking');
  assert.equal(scrollToBookingField('services',{value:'["dj"]'}).section,'work');
  assert.deepEqual(scrollToAppSection('https://untrusted.invalid'),{shown:false,reason:'unknown_section'});
 }finally{delete global.document;delete global.window;delete global.requestAnimationFrame;}
});

test('Home then Skip reactivates the next viewport even when it is already aligned',()=>{
 const events=[];
 const hero={inert:true,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:0})};
 const live={inert:false,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:0})};
 global.document={documentElement:{classList:{contains:()=>true}},querySelector:selector=>selector==='.echo-artist-sequence'?hero:selector==='#live'?live:null};
 global.window={scrollY:0,dispatchEvent:event=>{
  if(event.type==='echo:viewport-navigate'){
   events.push(event.detail.section);event.preventDefault();
   hero.inert=event.detail.section!=='home';live.inert=event.detail.section!=='live';
  }
  return !event.defaultPrevented;
 },scrollTo:()=>assert.fail('The chapter controller must own scrolling')};
 try{
  scrollToAppSection('home',{source:'section-nav'});
  assert.equal(hero.inert,false);assert.equal(live.inert,true);
  scrollToAppSection('live',{source:'navigation',force:true});
  assert.equal(live.inert,false);assert.equal(hero.inert,true);
  scrollToAppSection('home',{source:'section-nav'});
  scrollToAppSection('live',{source:'navigation',force:true});
  assert.deepEqual(events,['home','live','home','live']);
 }finally{delete global.document;delete global.window;}
});
