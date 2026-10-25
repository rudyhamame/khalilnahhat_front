import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,dateKey,validBookingDate,torontoToday} from './bookingCalendar.js';
test('calendar includes full weeks and the correct leap day',()=>{
 const days=calendarDays(2028,1);assert.equal(days.length%7,0);assert.equal(days[0].getDay(),0);assert.equal(days.at(-1).getDay(),6);
 assert.equal(days.filter(d=>d.getMonth()===1).length,29);
 assert(days.some(d=>dateKey(d)==='2028-02-29'));
});
test('booking rejects impossible, malformed and past dates',()=>{
 assert(validBookingDate('2028-02-29','2028-02-01'));
 for(const date of ['2027-02-29','2028-02-30','2028-13-01','2028-2-01','2028-01-31',null])assert.equal(validBookingDate(date,'2028-02-01'),false);
 assert(validBookingDate('2028-02-01','2028-02-01'));
});
test('minimum date uses Toronto rather than the UTC date',()=>{
 assert.equal(torontoToday(new Date('2026-10-26T02:00:00Z')),'2026-10-25');
 assert.equal(torontoToday(new Date('2026-10-26T05:00:00Z')),'2026-10-26');
});
