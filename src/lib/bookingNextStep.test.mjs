import test from 'node:test';import assert from 'node:assert/strict';
import {bookingNextStep} from './bookingNextStep.js';
import {createEventOrder} from './eventOrderCore.mjs';
const complete=()=>{const o=createEventOrder();Object.assign(o.customer,{firstName:'A',lastName:'B',email:'a@b.co',contactMethod:'email'});Object.assign(o.event,{type:'wedding',date:'2099-06-20',startTime:'18:00',endTime:'23:00',guestCount:100});Object.assign(o.event.venue,{name:'Hall',address:'1 St',city:'Toronto',postalCode:'M1B 2K3',country:'Canada',setting:'indoor'});o.music.djRequested=true;o.music.mcRequested=false;o.rental={...o.rental,requested:false};o.services=['dj'];return o;};
test('the stages are explicit: required, then optional extras, then ready to submit',()=>{
 assert.ok(bookingNextStep(createEventOrder()).path);
 const optional=bookingNextStep(complete());
 assert.equal(optional.path,null);assert.equal(optional.ready,undefined);assert.match(optional.text,/nothing more to add/);
 const ready=bookingNextStep(complete(),false,{optionalDone:true});
 assert.equal(ready.ready,true);assert.match(ready.text,/ready to be submitted\. Press Submit booking/);
 assert.match(bookingNextStep(complete(),true,{optionalDone:true}).text,/جاهز للإرسال/);
});

import {sectionLines} from './bookingReviewModel.js';
import {bookingGoal} from './bookingGoals.js';
test('"Your event type" appears in the review only when the type is Other, and is then asked right after the type',()=>{
 const wedding=complete();assert.ok(!sectionLines(wedding,bookingGoal('event'),false).lines.some(line=>line.key==='event.title'));
 const other=complete();other.event.type='other';
 const line=sectionLines(other,bookingGoal('event'),false).lines.find(item=>item.key==='event.title');
 assert.equal(line.label,'Your event type');assert.equal(line.required,true);
 assert.equal(bookingNextStep(other).path,'event.title');
 other.event.title='Quinceañera';assert.notEqual(bookingNextStep(other).path,'event.title');
});

test('step 4 (rental question, services, equipment) is entirely optional: nothing there is ever the next required question',()=>{
 const order=complete();order.rental.requested=null;
 assert.notEqual(bookingNextStep(order).path,'rental.requested');
 order.services=[];order.music.djRequested=false;order.equipment=[];
 assert.notEqual(bookingNextStep(order).path,'services');
});
test('MC hosting must be answered, yes or no, like the DJ question (step 3 is Services)',()=>{
 const order=complete();order.music.mcRequested=null;
 assert.equal(bookingNextStep(order).path,'music.mcRequested');
 order.music.mcRequested=true;assert.notEqual(bookingNextStep(order).path,'music.mcRequested');
});
