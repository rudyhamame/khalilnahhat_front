import test from 'node:test';
import assert from 'node:assert/strict';
import {fields,createEventOrder,validValue,applyOrderPatch,normalizeEventOrder} from './eventOrderCore.mjs';
import {BOOKING_ATOM_SECTIONS,ATOM_KEYS,bookingAtom,bookingAtomInputProps,bookingAtomApplies,bookingAtomRequired,bookingAtomRange,bookingAtomState,fieldCode} from './bookingAtoms.mjs';
import {EVENT_PAGE_STEPS,eventPageSummary} from './eventPageModel.js';
import {hasBookingServices,djServiceChanges} from './bookingFlow.mjs';
import {activeGoals,bookingGoal,goalNextStep} from './bookingGoals.js';
import {setTreeSteps} from './treeCore.js';
import {sectionLines} from './bookingReviewModel.js';

test('numbered atoms have one contract field, one section and one stable code',()=>{
 const keys=BOOKING_ATOM_SECTIONS.flatMap(section=>section.keys);
 assert.equal(new Set(keys).size,keys.length);assert.deepEqual(keys,ATOM_KEYS);
 assert.equal(new Set(keys.map(fieldCode)).size,keys.length);
 for(const key of keys)assert.equal(bookingAtom(key).key,key);
 const support=new Set(['services','event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution']);
 for(const field of fields)assert.ok(keys.includes(field.key)||support.has(field.key),field.key);
 assert.throws(()=>bookingAtom('additional.unknown'),/Unknown booking atom/);
});
test('page groups and displayed ranges come from the atom contract, including required country',()=>{
 assert.ok(EVENT_PAGE_STEPS.venue.includes('event.venue.country'));
 assert.equal(bookingAtomRange(EVENT_PAGE_STEPS.personal),'01.01.01–07');
 assert.equal(bookingAtomRange(EVENT_PAGE_STEPS.venue),'02.04.01–07');
 assert.equal(bookingAtomRange(['event.startTime','event.endTime']),'02.02.02–03');
 const order=createEventOrder();order.event.venue.country='Canada';
 const country=eventPageSummary(order).find(row=>row.key==='event.venue.country');assert.equal(country.value,'Canada');
});
test('scalar input constraints accept the same boundary values as canonical validation',()=>{
 for(const key of ['customer.firstName','customer.lastName','customer.email','customer.phone','customer.company','event.title','event.venue.name','event.venue.address','event.venue.city','event.venue.postalCode','event.venue.country','event.venue.addressDetails','event.setup.requirements','additional.notes','additional.voucherCode']){
  const props=bookingAtomInputProps(key,createEventOrder());assert.equal(props['data-booking-field'],key);
  const value=key==='customer.email'?'x'.repeat(props.maxLength-7)+'@a.test':'x'.repeat(props.maxLength);
  assert.equal(validValue(bookingAtom(key),value),true,key);
  assert.equal(validValue(bookingAtom(key),value+'x'),false,key);
 }
 const guests=bookingAtomInputProps('event.guestCount');assert.equal(guests.max,bookingAtom('event.guestCount').max);assert.equal(guests.min,0);assert.equal(guests.step,1);
});
test('false and zero remain saved answers, and optional service choices are not marked required',()=>{
 let order=createEventOrder();order.event.guestCount=0;
 assert.equal(bookingAtomState(order,'event.guestCount').missing,false);
 for(const key of ['music.djRequested','music.mcRequested','rental.requested']){assert.equal(bookingAtomInputProps(key,order).required,false);assert.equal(bookingAtomRequired(order,key),false);}
 order=applyOrderPatch(order,djServiceChanges(order,'none'));assert.equal(order.music.djRequested,false);assert.equal(bookingAtomState(order,'music.djRequested').value,false);
 order=applyOrderPatch(order,djServiceChanges(order,'dj'));assert.equal(order.music.djRequested,true);assert.ok(order.services.includes('dj'));
});
test('service-gated preferences follow their atoms and retain hidden saved data',()=>{
 const order=createEventOrder();order.music.genres=['Dabke'];order.music.mcLanguagePairs=[{language:'Arabic',dialect:'Lebanese'}];
 assert.equal(bookingAtomApplies(order,'music.genres'),false);assert.equal(bookingAtomApplies(order,'music.mcLanguagePairs'),false);
 order.music.djRequested=true;order.music.mcRequested=true;
 assert.equal(bookingAtomApplies(order,'music.genres'),true);assert.equal(bookingAtomApplies(order,'music.mcLanguagePairs'),true);
 order.music.djRequested=false;assert.deepEqual(order.music.genres,['Dabke']);
 assert.equal(bookingAtomApplies(order,'event.setup.requirements'),true,'setup notes are not rental-gated');
});
test('saved custom event descriptions stay visible in both page summary and review after a type change',()=>{
 const order=createEventOrder();order.event.type='other';
 assert.equal(bookingAtomRequired(order,'event.title'),true);
 order.event.title='Community gathering';order.event.type='wedding';
 assert.equal(bookingAtomApplies(order,'event.title'),true);assert.equal(bookingAtomRequired(order,'event.title'),false);
 assert.ok(eventPageSummary(order).some(row=>row.key==='event.title'));
 assert.equal(sectionLines(order,bookingGoal('event'),false).lines.find(row=>row.key==='event.title').value,'Community gathering');
});
test('MC-only catalogues keep the service step and ask only for available service atoms',()=>{
 try{setTreeSteps({dj:false,mc:true,rental:false});
  assert.equal(hasBookingServices({dj:false,mc:true,rental:false}),true);assert.ok(activeGoals().some(goal=>goal.id==='music'));
  assert.equal(goalNextStep(createEventOrder(),false,'music').path,'music.mcRequested');
 }finally{setTreeSteps({dj:true,mc:true,rental:true});}
});

test('legacy service selections normalize into explicit atoms while saved No stays authoritative',()=>{
 const legacy=createEventOrder();legacy.services=['dj','mc'];legacy.music.genres=['Dabke'];
 const upgraded=normalizeEventOrder(legacy);assert.equal(upgraded.music.djRequested,true);assert.equal(upgraded.music.mcRequested,true);assert.deepEqual(upgraded.music.genres,['Dabke']);assert.equal(legacy.music.djRequested,null);
 legacy.music.djRequested=false;const declined=normalizeEventOrder(legacy);assert.equal(declined.music.djRequested,false);assert.ok(!declined.services.includes('dj'));assert.ok(declined.services.includes('mc'));assert.deepEqual(declined.music.genres,['Dabke']);
 const chosen=createEventOrder();chosen.music.djRequested=true;assert.ok(normalizeEventOrder(chosen).services.includes('dj'));
});
