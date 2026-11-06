import test from 'node:test';
import assert from 'node:assert/strict';
import {contract,createEventOrder,applyOrderPatch} from './eventOrderCore.mjs';
import {bookingSteps,bookingStepForField,firstIncompleteStep,missingViewportFields,djServiceChoice,djServiceChanges,venueSelectionChanges} from './bookingFlow.mjs';
test('draft steps follow VP02, VP03 and VP04 and cover every canonical field once',()=>{
 const steps=bookingSteps(createEventOrder());
 assert.deepEqual(steps.map(step=>step.id),['event','venue','music','equipment','customer','references']);
 assert.deepEqual(steps.slice(0,4).map(step=>step.chapter),['02','02','03','04']);
 const keys=steps.flatMap(step=>step.fields.map(field=>field.key));
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual([...keys].sort(),contract.sections.flatMap(section=>section.fields.map(field=>field.key)).sort());
 assert.equal(bookingStepForField('services'),'equipment');assert.equal(bookingStepForField('event.venue.address'),'venue');
});
test('review follows actual missing field objects and VP02 includes GTA area requirements',()=>{
 const order=createEventOrder();assert.equal(firstIncompleteStep(order),'event');order.customer={fullName:'Client',email:'client@example.invalid',phone:'123456789',contactMethod:'email'};
 assert.equal(firstIncompleteStep(order),'event');
 Object.assign(order.event,{type:'wedding',date:'2027-06-20',startTime:'18:00',endTime:'02:00',guestCount:100});
 Object.assign(order.event.venue,{name:'Venue',address:'1 Example St',city:'Toronto',postalCode:'M1A 1A1',setting:'indoor'});
 assert.equal(firstIncompleteStep(order),'venue');assert.deepEqual(missingViewportFields(order).map(field=>field.key),['event.venue.area']);
 order.event.venue.area='gta';assert.equal(firstIncompleteStep(order),'equipment');order.services=['dj'];assert.equal(firstIncompleteStep(order),'references');
});
test('chapter 03 DJ choice preserves chapter 04 MC and rental choices',()=>{
 let order=createEventOrder();order.services=['sound'];order.music.djMc='Introduce the couple';order.music.mcRequested=true;
 order=applyOrderPatch(order,djServiceChanges(order,'dj'));assert.equal(djServiceChoice(order),'dj');assert.ok(order.services.includes('sound'));assert.equal(order.music.mcRequested,true);
 order=applyOrderPatch(order,djServiceChanges(order,'none'));assert.equal(djServiceChoice(order),'none');assert.deepEqual(order.services,['sound']);assert.equal(order.music.djMc,'Introduce the couple');assert.equal(order.music.mcRequested,true);
});
test('the map and draft address picker use the same venue identity and clear stale coordinates',()=>{
 const updates=venueSelectionChanges({name:'New venue',address:'2 Example St',city:'Toronto'},'gta');
 const order=applyOrderPatch(createEventOrder(),updates);
 assert.equal(order.event.venue.name,'New venue');assert.equal(order.event.venue.country,'Canada');assert.equal(order.event.venue.area,'gta');assert.equal(order.event.venue.latitude,null);
});

test('every assistant booking item has a draft destination and survives a typed patch',async()=>{
 const {aiFields,validValue,getPath}=await import('./eventOrderCore.mjs');
 const sample=field=>field.key==='equipment'?[{id:'speaker',quantity:2}]:field.options?(['multi','links'].includes(field.type)?[field.options[0]]:field.options[0]):field.type==='number'?100:field.type==='coordinate'?0:field.type==='boolean'?false:field.type==='links'?['https://example.com/reference']:field.type==='multi'?[]:field.type==='date'?'2027-11-14':field.type==='time'?'18:00':field.type==='email'?'client@example.com':'Client provided detail'.slice(0,field.maxLength||320);
 let order=createEventOrder();
 for(const field of aiFields){
  assert.ok(['event','venue','music','equipment','customer','references'].includes(bookingStepForField(field.key)),field.key);
  const value=sample(field);assert.ok(validValue(field,value),field.key);
  order=applyOrderPatch(order,[{path:field.key,value}]);assert.deepEqual(getPath(order,field.key),value,field.key);
 }
 assert.equal(order.additional.voucherCode,'Client provided detail');
 assert.deepEqual(order.equipment,[{id:'speaker',quantity:2}]);
});
