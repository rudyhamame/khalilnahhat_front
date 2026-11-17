import test from 'node:test';import assert from 'node:assert/strict';
import {rejectedFieldsNote} from './rejectedFieldsNote.js';
test('unavailable equipment is explained in words, never as "equipment" in a raw list',()=>{
 const text=rejectedFieldsNote(['equipment']);
 assert.match(text,/isn’t available to add right now/);assert.doesNotMatch(text,/could not apply|changes:/i);
 assert.match(rejectedFieldsNote(['equipment'],true),/غير متاحة/);
});
test('other rejected fields use their names; a draft that is not ready says so',()=>{
 assert.match(rejectedFieldsNote(['event.guestCount']),/couldn’t save: Guests/i);
 assert.match(rejectedFieldsNote(['draft_unavailable']),/isn’t ready yet/);
 assert.equal(rejectedFieldsNote([]),'');
 assert.match(rejectedFieldsNote(['equipment','event.guestCount','equipment']),/equipment selection as it was\. I couldn’t save/);
});
