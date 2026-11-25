import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyBookingRules,cleanBookingRules,createEventOrder,missingOrderFields,validValue,fields} from './eventOrderCore.mjs';
import {requiredMark,requiredNote,bookingAtomRequired,bookingAtomInputProps} from './bookingAtoms.mjs';

// One rule in the Booking Tree must reach every consumer of the contract.
test('a Booking Tree rule governs validation, missing fields, stars and form props', () => {
 const order=createEventOrder(),key='customer.firstName',field=fields.find(item=>item.key===key);
 try{
  assert.ok(missingOrderFields(order).some(item=>item.key===key));assert.equal(requiredMark(key),' *');assert.equal(bookingAtomInputProps(key,order).required,true);
  applyBookingRules(cleanBookingRules({[key]:{required:false,maxLength:5}}));
  assert.ok(!missingOrderFields(order).some(item=>item.key===key));
  assert.equal(requiredMark(key),'');assert.equal(requiredNote(key),'');assert.equal(bookingAtomRequired(order,key),false);assert.equal(bookingAtomInputProps(key,order).required,false);
  assert.equal(validValue(field,'abcdef'),false);assert.equal(validValue(field,'abcde'),true);
 }finally{applyBookingRules({});}
 assert.equal(requiredMark(key),' *');assert.equal(validValue(field,'abcdef'),true);
});
test('event title follows its own rule instead of the built-in "other" condition', () => {
 const order=createEventOrder();order.event.type='other';
 try{
  assert.ok(missingOrderFields(order).some(item=>item.key==='event.title'));
  applyBookingRules(cleanBookingRules({'event.title':{required:false}}));
  assert.ok(!missingOrderFields(order).some(item=>item.key==='event.title'));
 }finally{applyBookingRules({});}
});
test('rules cannot name unknown atoms or invent values', () => {
 assert.throws(()=>cleanBookingRules({'nope.key':{required:true}}));
 assert.throws(()=>cleanBookingRules({'event.type':{options:['not-an-option']}}));
});
