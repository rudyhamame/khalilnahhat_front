import test from 'node:test';
import assert from 'node:assert/strict';
import {GUEST_DRESS_CODES,normalizeGuestDressCode} from './guestWardrobe.js';
test('unknown dress codes fall back to smart casual',()=>{
 for(const {id} of GUEST_DRESS_CODES)assert.equal(normalizeGuestDressCode(id),id);
 assert.equal(normalizeGuestDressCode('unknown'),'smart-casual');
});
