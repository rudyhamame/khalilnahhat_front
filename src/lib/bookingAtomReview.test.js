import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atomReviewState,reviewBookingAtom,editBookingAtom,currentAtomReviews,unconfirmedReviewAtoms,manualBookingFieldHref,bookingAtomCorrectionReply} from './bookingAtomReview.js';

const entry={key:'event.type',label:'Event type',value:'Wedding',reviewValue:'wedding',empty:false,required:false};
test('tick confirms the exact current value regardless of its entry source',()=>{
 const reviews=reviewBookingAtom({},entry,true);
 assert.equal(atomReviewState(reviews,entry),'confirmed');
 assert.equal(atomReviewState(reviews,{...entry,value:'حفل زفاف'}),'confirmed');
 assert.equal(atomReviewState(reviews,{...entry,reviewValue:'birthday'}),null);
 assert.deepEqual(currentAtomReviews(reviews,[{...entry,reviewValue:'birthday'}]),{});
});
test('X preserves the entered value, marks correction and blocks submission until confirmed again',()=>{
 const original=structuredClone(entry);
 const reviews=reviewBookingAtom(reviewBookingAtom({},entry,true),entry,false);
 assert.equal(atomReviewState(reviews,entry),'correction');
 assert.deepEqual(entry,original);
 assert.equal(unconfirmedReviewAtoms(reviews,[entry]).length,1);
 assert.equal(unconfirmedReviewAtoms(reviewBookingAtom(reviews,entry,true),[entry]).length,0);
});
test('blank atoms are excluded from review and cannot be confirmed',()=>{
 const optional={key:'additional.notes',reviewValue:null,empty:true,required:false};
 const required={key:'event.date',reviewValue:null,empty:true,required:true};
 assert.deepEqual(unconfirmedReviewAtoms({},[optional,required]),[]);
 const reviews=reviewBookingAtom(reviewBookingAtom({},optional,true),required,true);
 assert.deepEqual(reviews,{});
 assert.equal(atomReviewState(reviews,optional),null);
 assert.equal(atomReviewState(reviews,required),null);
});
test('editing a confirmed atom removes confirmation without marking it incorrect or changing its value',()=>{
 const confirmed=reviewBookingAtom({},entry,true);
 const editing=editBookingAtom(confirmed,entry);
 assert.equal(atomReviewState(editing,entry),null);
 assert.equal(unconfirmedReviewAtoms(editing,[entry]).length,1);
 assert.equal(entry.reviewValue,'wedding');
});
test('unselected catalog options do not block submission; selected equipment does',()=>{
 const catalog=[{key:'service:sound',empty:true},{key:'equipment:sound:speaker',empty:true},{key:'equipment:sound:mic',reviewValue:2,empty:false}];
 assert.deepEqual(unconfirmedReviewAtoms({},catalog).map(row=>row.key),['equipment:sound:mic']);
});
test('rejected entries get a replacement question and a real manual-edit destination',()=>{
 const reply=bookingAtomCorrectionReply('event.type','Event type');
 assert.match(reply.content,/What would you like to use instead/);
 assert.equal(reply.actions[0].goto,'event.type');
 assert.equal(manualBookingFieldHref('event.type'),'/booking?field=event.type#booking-date');
 assert.equal(manualBookingFieldHref('references.photos'),'/rentals?field=references.photos#references');
 assert.equal(manualBookingFieldHref('customer.email'),'/dashboard/profile');
 const arabic=bookingAtomCorrectionReply('additional.notes','ملاحظات',true);
 assert.match(arabic.content,/القيمة البديلة/);assert.doesNotMatch(arabic.content,/[a-z]/i);
});
