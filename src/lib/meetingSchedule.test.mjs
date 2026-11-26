import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingStartIso,meetingTimeDefaults,shiftMeetingDate,meetingSummary,filterMeetings} from './meetingSchedule.mjs';
test('published times use Toronto wall clock in winter and summer, not the device timezone',()=>{
 assert.equal(meetingStartIso('2026-11-25','14:00'),'2026-11-25T19:00:00.000Z');
 assert.equal(meetingStartIso('2027-06-20','14:00'),'2027-06-20T18:00:00.000Z');
 assert.throws(()=>meetingStartIso('2027-03-14','02:30'),/clocks change/);
 assert.throws(()=>meetingStartIso('2027-02-30','14:00'));
 assert.throws(()=>meetingStartIso('2027-06-20','25:00'));
 assert.equal(shiftMeetingDate('2026-12-31',1),'2027-01-01');
});
test('counts and filters distinguish future availability, booked browser meetings and past appointments',()=>{
 const now=Date.parse('2026-11-25T12:00:00Z');
 const items=[{id:'open',start:'2026-11-25T16:00:00Z',durationMin:30,status:'open',mode:'online'},{id:'ana',start:'2026-11-25T17:00:00Z',durationMin:30,status:'booked',mode:'online',bookedByName:'Ana Client',topic:'Music ideas'},{id:'phone',start:'2026-11-25T18:00:00Z',durationMin:30,status:'booked',mode:'phone'},{id:'old',start:'2026-11-24T12:00:00Z',durationMin:30,status:'booked',mode:'online'}];
 assert.deepEqual(meetingSummary(items,now),{open:1,booked:2,browser:1});
 assert.deepEqual(filterMeetings(items,{filter:'booked',now}).map(item=>item.id),['ana','phone']);
 assert.deepEqual(filterMeetings(items,{query:'music ideas',now}).map(item=>item.id),['ana']);
 assert.deepEqual(filterMeetings(items,{filter:'open',now}).map(item=>item.id),['open']);
 assert.equal(items[0].id,'open','sorting never changes the original list');
});

test('start defaults use the next current Toronto minute and handle noon, midnight and summer time',()=>{
 assert.deepEqual(meetingTimeDefaults(Date.parse('2026-11-25T16:59:30Z')),{date:'2026-11-25',hour:'12',minute:'00',period:'PM'});
 assert.deepEqual(meetingTimeDefaults(Date.parse('2026-11-26T04:59:59Z')),{date:'2026-11-26',hour:'12',minute:'00',period:'AM'});
 assert.deepEqual(meetingTimeDefaults(Date.parse('2027-06-20T14:20:10Z')),{date:'2027-06-20',hour:'10',minute:'21',period:'AM'});
});
