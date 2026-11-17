import test from 'node:test';import assert from 'node:assert/strict';
import {bookingNextStep} from './bookingNextStep.js';
import {createEventOrder} from './eventOrderCore.mjs';
const complete=()=>{const o=createEventOrder();Object.assign(o.customer,{fullName:'A B',email:'a@b.co',contactMethod:'email'});Object.assign(o.event,{type:'wedding',date:'2099-06-20',startTime:'18:00',endTime:'23:00',guestCount:100});Object.assign(o.event.venue,{name:'Hall',address:'1 St',city:'Toronto',postalCode:'M1B 2K3',setting:'indoor'});o.music.djRequested=true;o.services=['dj'];return o;};
test('the stages are explicit: required, then optional extras, then ready to submit',()=>{
 assert.ok(bookingNextStep(createEventOrder()).path);
 const optional=bookingNextStep(complete());
 assert.equal(optional.path,null);assert.equal(optional.ready,undefined);assert.match(optional.text,/nothing more to add/);
 const ready=bookingNextStep(complete(),false,{optionalDone:true});
 assert.equal(ready.ready,true);assert.match(ready.text,/ready to be submitted\. Press Review & send/);
 assert.match(bookingNextStep(complete(),true,{optionalDone:true}).text,/جاهز للإرسال/);
});
