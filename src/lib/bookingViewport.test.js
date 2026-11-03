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
  events.length=0;assert.equal(scrollToBookingField('event.venue.name').section,'simulation');assert.equal(events.find(event=>event.type==='echo:rental-face').detail,'simulation');
  assert.equal(scrollToBookingField('customer.phone').section,'booking');
  assert.equal(scrollToBookingField('services',{value:'["dj"]'}).section,'work');
  assert.deepEqual(scrollToAppSection('https://untrusted.invalid'),{shown:false,reason:'unknown_section'});
 }finally{delete global.document;delete global.window;delete global.requestAnimationFrame;}
});
