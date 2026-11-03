import test from 'node:test';
import assert from 'node:assert/strict';
import {getBookingSubmissionIdentity,bookingSubmissionReceipt,loadBookingSubmissionIdentity,storeBookingSubmissionIdentity} from './bookingSubmission.js';

test('an unchanged retry retains its submission identity, while edited details get a new one',()=>{
 const payload={order:{event:{date:'2027-06-01'},customer:{email:'a@example.com'}},items:[{serviceId:'dj',quantity:1}]};
 let sequence=0;const createId=()=>`submission-${++sequence}`;
 const first=getBookingSubmissionIdentity(payload,null,createId);
 const retry=getBookingSubmissionIdentity({...payload,order:{customer:{email:'a@example.com'},event:{date:'2027-06-01'}}},first,createId);
 assert.equal(retry.id,first.id);
 const edited=getBookingSubmissionIdentity({...payload,order:{...payload.order,event:{date:'2027-06-02'}}},retry,createId);
 assert.notEqual(edited.id,first.id);
});

test('a missing or malformed server receipt cannot clear the booking draft as a success',()=>{
 assert.equal(bookingSubmissionReceipt(undefined),null);
 assert.equal(bookingSubmissionReceipt({item:{id:'request'}}),null);
 assert.equal(bookingSubmissionReceipt({item:{requestNumber:'ECHO-123'}}),null);
 assert.equal(bookingSubmissionReceipt({item:{id:'request',requestNumber:'ECHO-123'}}),'ECHO-123');
});

test('session recovery retains an uncertain attempt and safely handles unavailable storage',()=>{
 const entries=new Map();const storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
 const first=getBookingSubmissionIdentity({event:'example'},null,()=> '60b34139-905f-4493-88e9-952f82459e76');
 storeBookingSubmissionIdentity('account:one:draft:one',first,storage);
 const restored=getBookingSubmissionIdentity({event:'example'},loadBookingSubmissionIdentity('account:one:draft:one',storage),()=> 'wrong-new-attempt');
 assert.equal(restored.id,first.id);assert.equal(loadBookingSubmissionIdentity('account:two:draft:one',storage),null);
 storeBookingSubmissionIdentity('account:one:draft:one',null,storage);assert.equal(loadBookingSubmissionIdentity('account:one:draft:one',storage),null);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(loadBookingSubmissionIdentity('draft',blocked),null);assert.doesNotThrow(()=>storeBookingSubmissionIdentity('draft',first,blocked));
});
