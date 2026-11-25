import test from 'node:test';
import assert from 'node:assert/strict';
import {editableEmail,emailHasChanges,filterNotificationEmails,validateEmailDraft,reminderTiming} from './notificationEmailSettings.mjs';
const item={id:'meeting',label:'Meeting reminder',group:'Meetings',recipient:'Meeting attendee',when:'Before a booked meeting starts',revision:1,enabled:true,subject:'Your meeting',body:'Hello {{recipientName}}. {{meetingTime}}',leadHours:24,variables:['recipientName','meetingTime'],required:['meetingTime']};

test('draft changes are compared independently, including enable and reminder edits',()=>{
 const draft=editableEmail(item);assert.equal(emailHasChanges(item,draft),false);
 for(const change of [{enabled:false},{leadHours:48},{imageUrl:'https://example.test/photo.jpg'},{subject:'New subject'},{body:'Different message'}])assert.equal(emailHasChanges(item,{...draft,...change}),true);
 assert.equal(emailHasChanges(item,undefined),false);assert.equal(editableEmail({...item,leadHours:undefined}).leadHours,null);
});
test('search combines words and filters by category, draft status and unsaved changes',()=>{
 const off={...item,id:'booking',group:'Bookings',recipient:'Admin team',label:'Booking received',when:'When submitted',enabled:false};
 const items=[item,off],drafts={meeting:{...editableEmail(item),enabled:false},booking:editableEmail(off)};
 assert.deepEqual(filterNotificationEmails(items,drafts,{query:'  meeting before  ',status:'off'}).map(row=>row.id),['meeting']);
 assert.equal(filterNotificationEmails(items,drafts,{status:'on'}).length,0);
 assert.deepEqual(filterNotificationEmails(items,drafts,{status:'unsaved'}).map(row=>row.id),['meeting']);
 assert.deepEqual(filterNotificationEmails(items,drafts,{group:'Bookings'}).map(row=>row.id),['booking']);
 assert.equal(filterNotificationEmails(items,drafts,{query:'no match'}).length,0);
 assert.equal(filterNotificationEmails(items,drafts).length,2);
});
test('validation catches missing essential details in the body even when present in the subject',()=>{
 assert.deepEqual(validateEmailDraft(item,editableEmail(item)),{});
 const result=validateEmailDraft(item,{...editableEmail(item),subject:'{{meetingTime}}',body:'Hello'});assert.match(result.body,/Meeting time/);
 assert.ok(validateEmailDraft(item,{...editableEmail(item),subject:'Bad\nsubject'}).subject);
 assert.ok(validateEmailDraft(item,{...editableEmail(item),subject:'x'.repeat(201)}).subject);
 assert.ok(validateEmailDraft(item,{...editableEmail(item),body:'x'.repeat(12001)+' {{meetingTime}}'}).body);
});
test('malformed and unavailable automatic details are explained before an API call',()=>{
 for(const body of ['{{meetingTime}} {{unknown}}','{{meetingTime}} {{broken','{{meetingTime}} broken}}'])assert.ok(validateEmailDraft(item,{...editableEmail(item),body}).body);
 assert.ok(validateEmailDraft(item,{...editableEmail(item),subject:'{{unknown}}'}).subject);
 assert.deepEqual(validateEmailDraft(item,{...editableEmail(item),body:'Your meeting is {{ meetingTime }}.'}),{});
});
test('reminder validation rejects empty, non-finite and out of range inputs',()=>{
 for(const leadHours of ['',NaN,Infinity,0,.1,721,null])assert.ok(validateEmailDraft(item,{...editableEmail(item),leadHours}).leadHours);
 for(const leadHours of [.25,1,24,720])assert.equal(validateEmailDraft(item,{...editableEmail(item),leadHours}).leadHours,undefined);
 const triggered={...item,leadHours:null};assert.ok(validateEmailDraft(triggered,{...editableEmail(triggered),leadHours:1}).leadHours);
 assert.equal(reminderTiming(.5),'30 minutes before');assert.equal(reminderTiming(1),'1 hour before');assert.equal(reminderTiming(24),'1 day before');assert.equal(reminderTiming(48),'2 days before');assert.equal(reminderTiming(''),'Choose a reminder time');
});
test('legacy message photos must use HTTPS without credentials',()=>{
 for(const imageUrl of ['javascript:alert(1)','http://example.test/a.jpg','https://user:password@example.test/a.jpg'])assert.ok(validateEmailDraft(item,{...editableEmail(item),imageUrl}).imageUrl);
 assert.deepEqual(validateEmailDraft(item,{...editableEmail(item),imageUrl:'https://example.test/photo.jpg'}),{});
});
