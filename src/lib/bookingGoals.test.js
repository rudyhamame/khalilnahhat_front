import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOOKING_GOALS,bookingGoal,goalNextStep,goalProgress,goalValue,goalFields} from './bookingGoals.js';
import {createEventOrder,fields,updateOrderField} from './eventOrderCore.mjs';
import {bookingSteps} from './bookingFlow.mjs';
import {effectiveMissing,bookingNextStep} from './bookingNextStep.js';
import {voiceConversationContext} from './aiBookingStream.mjs';
test('selecting a goal asks within its scope, even when earlier event details are missing',()=>{
 const order=createEventOrder();
 for(const goal of BOOKING_GOALS){const next=goalNextStep(order,false,goal.id);if(next.path)assert.ok(goal.matches(next.path),`${goal.id}: ${next.path}`);}
 assert.equal(goalNextStep(order,false,'contact').path?.startsWith('customer.'),true);
 assert.equal(goalNextStep(order,false,'event').path,'event.type');
 assert.deepEqual(BOOKING_GOALS.map(goal=>goal.title),['Personal info','Event info','DJ service','Rental services & equipment','Special requests']);
 assert.equal(goalNextStep(order,false,'music').path,'music.djRequested');
 assert.equal(bookingGoal('unknown'),null);
});
test('explicitly declined services are answered, and rentals need actual selections only when requested',()=>{
 const order=createEventOrder();order.music.djRequested=false;order.music.mcRequested=false;order.rental.requested=false;
 assert.equal(goalProgress(order,bookingGoal('music')).missing.length,0);
 assert.equal(goalNextStep(order,false,'music').path,null);
 order.services=['dj'];order.music.djRequested=true;
 assert.equal(goalProgress(order,bookingGoal('rentals')).complete,true);
 order.rental.requested=true;assert.ok(goalProgress(order,bookingGoal('rentals')).missing.some(field=>field.key==='services'));
 order.equipment=[{id:'speaker',name:'Speaker',quantity:2}];assert.equal(goalProgress(order,bookingGoal('rentals')).missing.length,0);
 assert.equal(goalValue(false),'No');assert.equal(goalValue(order.equipment),'Speaker × 2');
});
test('goals cover every required questionnaire field exactly once',()=>{
 for(const field of fields.filter(field=>field.required))assert.equal(BOOKING_GOALS.filter(goal=>goal.matches(field.key)).length,1,field.key);
 assert.ok(goalFields(bookingGoal('event')).every(field=>field.type!=='coordinate'));
});
test('selected goal reaches text and voice context without modifying draft facts',()=>{
 const order=createEventOrder(),before=structuredClone(order);
 const context=voiceConversationContext([],order,{selectedBookingGoal:{id:'venue',title:'Venue'},nextBookingQuestion:goalNextStep(order,false,'venue')});
 assert.match(context,/"selectedBookingGoal":\{"id":"venue","title":"Venue"\}/);
 assert.match(context,/Focus on it/);assert.deepEqual(order,before);
});

test('goals and the booking flow share one section definition: same titles, same order, same field mapping',()=>{
 const flow=bookingSteps(createEventOrder());
 assert.deepEqual(BOOKING_GOALS.map(goal=>goal.title),flow.map(step=>step.title));
 assert.deepEqual(BOOKING_GOALS.map(goal=>goal.ar),flow.map(step=>step.ar));
 for(const step of flow)for(const field of step.fields)assert.equal(BOOKING_GOALS.filter(goal=>goal.matches(field.key)).length,1,field.key);
});

test('goal progress and the next question read one missing list, so they can never disagree',()=>{
 // A DJ chosen through services counts as answered everywhere, not only in the next question.
 let order=updateOrderField(createEventOrder(),'services',['dj']);
 assert.equal(effectiveMissing(order).some(field=>field.key==='music.djRequested'),false);
 assert.equal(goalProgress(order,bookingGoal('music')).missing.some(field=>field.key==='music.djRequested'),false);
 for(const sample of [createEventOrder(),order]){
  const everything=effectiveMissing(sample).map(field=>field.key);
  for(const goal of BOOKING_GOALS)assert.deepEqual(goalProgress(sample,goal).missing.map(field=>field.key),everything.filter(key=>goal.matches(key)),goal.id);
  const next=bookingNextStep(sample).path;
  if(next)assert.ok(everything.includes(next),next);
 }
});
