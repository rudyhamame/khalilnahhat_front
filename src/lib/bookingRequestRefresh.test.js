import test from 'node:test';
import assert from 'node:assert/strict';
import {startBookingRequestRefresh} from './bookingRequestRefresh.js';
test('admin tab loads new submissions and preserves the list across failures without overlapping reads',async()=>{
 let tick,resolve,calls=0,fail=false;const lists=[],events=new EventTarget();
 const stop=startBookingRequestRefresh({read:async()=>{calls++;if(fail)throw Error('offline');return new Promise(done=>resolve=done);},apply:items=>lists.push(items),events,schedule:fn=>{tick=fn;return 1;},unschedule:()=>{}});
 tick();assert.equal(calls,1);resolve({items:[{requestNumber:'ECHO-QA'}]});await new Promise(setImmediate);assert.equal(lists.length,1);
 fail=true;await tick();assert.equal(lists.length,1);fail=false;
 events.dispatchEvent(new Event('focus'));assert.equal(calls,3);stop();resolve({items:[]});await new Promise(setImmediate);assert.equal(lists.length,1,'unmounted admin tab rejects stale completion');
});
