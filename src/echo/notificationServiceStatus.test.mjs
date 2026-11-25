import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingsServiceStatus,noreplyServiceStatus} from './notificationServiceStatus.mjs';
test('bookings reports sending and receiving independently',()=>{
 assert.equal(bookingsServiceStatus({sendingConfigured:true,receivingConfigured:true}).label,'Configured');
 assert.equal(bookingsServiceStatus({sendingConfigured:true,receivingConfigured:false}).label,'Sending only');
 assert.equal(bookingsServiceStatus({sendingConfigured:false,receivingConfigured:true}).label,'Receiving only');
 assert.equal(bookingsServiceStatus({sendingConfigured:false,receivingConfigured:false}).label,'Needs setup');
 assert.equal(bookingsServiceStatus({configured:true}).state,'ready');
});
test('unavailable status is not reported as an unconfigured service',()=>{
 assert.equal(bookingsServiceStatus(null,true).state,'unknown');
 assert.equal(noreplyServiceStatus(null,true).label,'Unavailable');
 assert.equal(noreplyServiceStatus({configured:false}).label,'Needs setup');
});
test('noreply requires both a configured sender and the correct sender address',()=>{
 assert.equal(noreplyServiceStatus({configured:true,senderEmail:' NOREPLY@djkhalilnahhat.ca '}).label,'Configured');
 const different=noreplyServiceStatus({configured:true,senderEmail:'legacy@example.test'});
 assert.equal(different.state,'partial');assert.equal(different.label,'Different sender');assert.match(different.detail,/legacy@example.test/);
});
