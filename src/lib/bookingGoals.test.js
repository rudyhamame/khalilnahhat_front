import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOOKING_GOALS,bookingGoal,goalNextStep,goalProgress,goalValue,goalFields} from './bookingGoals.js';
import {createEventOrder,fields} from './eventOrderCore.mjs';
import {voiceConversationContext} from './aiBookingStream.mjs';
test('selecting a goal asks within its scope, even when earlier event details are missing',()=>{
 const order=createEventOrder();
 for(const goal of BOOKING_GOALS){const next=goalNextStep(order,false,goal.id);if(next.path)assert.ok(goal.matches(next.path),`${goal.id}: ${next.path}`);}
 assert.equal(goalNextStep(order,false,'venue').path,'event.venue.name');
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
 assert.ok(goalFields(bookingGoal('venue')).every(field=>field.type!=='coordinate'));
});
test('selected goal reaches text and voice context without modifying draft facts',()=>{
 const order=createEventOrder(),before=structuredClone(order);
 const context=voiceConversationContext([],order,{selectedBookingGoal:{id:'venue',title:'Venue'},nextBookingQuestion:goalNextStep(order,false,'venue')});
 assert.match(context,/"selectedBookingGoal":\{"id":"venue","title":"Venue"\}/);
 assert.match(context,/Focus on it/);assert.deepEqual(order,before);
});
