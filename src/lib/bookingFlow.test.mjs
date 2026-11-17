import test from 'node:test';
import assert from 'node:assert/strict';
import {contract,createEventOrder,applyOrderPatch} from './eventOrderCore.mjs';
import {bookingSteps,bookingStepForField,firstIncompleteStep,missingViewportFields,djServiceChoice,djServiceChanges,venueSelectionChanges} from './bookingFlow.mjs';
test('draft steps follow VP02, VP03 and VP04 and cover every canonical field once',()=>{
 const steps=bookingSteps(createEventOrder());
 assert.deepEqual(steps.map(step=>step.id),['customer','event','music','equipment','references','notes']);
 assert.deepEqual(steps.slice(1,4).map(step=>step.chapter),['02','03','04']);
 const keys=steps.flatMap(step=>step.fields.map(field=>field.key));
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual([...keys].sort(),contract.sections.flatMap(section=>section.fields.map(field=>field.key)).sort());
 assert.equal(bookingStepForField('services'),'equipment');assert.equal(bookingStepForField('event.venue.address'),'event');
});
test('review follows actual missing field objects and completes the venue chapter',()=>{
 const order=createEventOrder();assert.equal(firstIncompleteStep(order),'customer');order.customer={fullName:'Client',email:'client@example.invalid',phone:'123456789',contactMethod:'email',phoneContact:'call'};
 assert.equal(firstIncompleteStep(order),'event');
 Object.assign(order.event,{type:'wedding',date:'2027-06-20',startTime:'18:00',endTime:'02:00',guestCount:100});
 Object.assign(order.event.venue,{name:'Venue',address:'1 Example St',city:'Toronto',postalCode:'M1A 1A1',setting:'indoor'});
 // A complete venue finishes the event chapter.
 assert.equal(firstIncompleteStep(order),'equipment');assert.deepEqual(missingViewportFields(order).map(field=>field.key),[]);
 order.services=['dj'];assert.equal(firstIncompleteStep(order),'references');
});
test('chapter 03 DJ choice preserves chapter 04 MC and rental choices',()=>{
 let order=createEventOrder();order.services=['sound'];order.music.djMc='Introduce the couple';order.music.mcRequested=true;
 order=applyOrderPatch(order,djServiceChanges(order,'dj'));assert.equal(djServiceChoice(order),'dj');assert.ok(order.services.includes('sound'));assert.equal(order.music.mcRequested,true);
 order=applyOrderPatch(order,djServiceChanges(order,'none'));assert.equal(djServiceChoice(order),'none');assert.deepEqual(order.services,['sound']);assert.equal(order.music.djMc,'Introduce the couple');assert.equal(order.music.mcRequested,true);
});
test('the map and draft address picker use the same venue identity and clear stale coordinates',()=>{
 const updates=venueSelectionChanges({name:'New venue',address:'2 Example St',city:'Toronto'});
 const order=applyOrderPatch(createEventOrder(),updates);
 assert.equal(order.event.venue.name,'New venue');assert.equal(order.event.venue.country,'Canada');assert.equal(order.event.venue.latitude,null);
});

test('every assistant booking item has a draft destination and survives a typed patch',async()=>{
 const {aiFields,validValue,getPath,isAiEditableField}=await import('./eventOrderCore.mjs');
 const sample=field=>field.key==='music.favouriteSongs'?[{song:'Favourite song',artist:'Favourite artist'}]:field.key==='equipment'?[{id:'speaker',quantity:2}]:field.type==='attachments'?[{url:'https://res.cloudinary.com/demo/image/upload/a.jpg',name:'a.jpg',comment:'Like this'}]:field.type==='songs'?[{phase:'intro',song:'Opening song'}]:field.type==='tags'?['Dabke']:field.type==='pairs'?[{language:'Arabic',dialect:'Syrian'}]:field.options?(['multi','links'].includes(field.type)?[field.options[0]]:field.options[0]):field.type==='number'?100:field.type==='coordinate'?0:field.type==='boolean'?false:field.type==='links'?['https://example.com/reference']:field.type==='multi'?[]:field.type==='date'?'2027-11-14':field.type==='time'?'18:00':field.type==='email'?'client@example.com':'Client provided detail'.slice(0,field.maxLength||320);
 let order=createEventOrder();
 for(const field of aiFields.filter(field=>isAiEditableField(field.key))){
  assert.ok(['event','music','equipment','customer','references','notes'].includes(bookingStepForField(field.key)),field.key);
  const value=sample(field);assert.ok(validValue(field,value),field.key);
  order=applyOrderPatch(order,[{path:field.key,value}]);assert.deepEqual(getPath(order,field.key),value,field.key);
 }
 assert.equal(order.additional.voucherCode,'Client provided detail');
 assert.deepEqual(order.equipment,[{id:'speaker',quantity:2}]);
});

test('venue selection never creates the retired region atom, even from an old search result',()=>{
 const changes=venueSelectionChanges({name:'Venue',address:'1 Example St',area:'gta'});
 assert.ok(!changes.some(row=>row.path==='event.venue.area'));
 assert.ok(!bookingSteps(createEventOrder()).flatMap(step=>step.fields).some(field=>field.key==='event.venue.area'));
});
