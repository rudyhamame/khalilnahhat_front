import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder} from './eventOrderCore.mjs';
import {mergeGuestDraft} from './mergeGuestDraft.mjs';

test('guest answers fill what the account left empty, and the account wins on a conflict',()=>{
 const account=createEventOrder();account.customer.fullName='Ada Client';account.event.type='birthday';account.event.venue.name='Account Hall';
 const guest=createEventOrder();guest.customer.fullName='Ignored';guest.event.type='wedding';guest.event.guestCount=80;guest.event.venue.name='Guest Hall';guest.event.venue.city='Toronto';guest.music.styles=['arabic'];guest.music.suggestedSongs=[{phase:'intro',song:'A'}];
 const merged=mergeGuestDraft(account,guest);
 assert.equal(merged.customer.fullName,'Ada Client');
 assert.equal(merged.event.type,'birthday');assert.equal(merged.event.venue.name,'Account Hall');
 assert.equal(merged.event.guestCount,80);assert.equal(merged.event.venue.city,'Toronto');
 assert.deepEqual(merged.music.styles,['arabic']);assert.deepEqual(merged.music.suggestedSongs,[{phase:'intro',song:'A'}]);
});
test('equipment from the guest draft is added once',()=>{
 const account=createEventOrder();account.equipment=[{id:'speaker',name:'Speaker',quantity:2}];
 const guest=createEventOrder();guest.equipment=[{id:'speaker',name:'Speaker',quantity:9},{id:'mic',name:'Mic',quantity:1}];
 assert.deepEqual(mergeGuestDraft(account,guest).equipment.map(item=>[item.id,item.quantity]),[['speaker',2],['mic',1]]);
});
