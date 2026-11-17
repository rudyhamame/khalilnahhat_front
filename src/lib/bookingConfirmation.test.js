import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,updateOrderField} from './eventOrderCore.mjs';
import {bookingConfirmationHtml} from './bookingConfirmation.js';
test('the PDF confirmation shows the booking, the quote and escapes everything',()=>{
 let order=createEventOrder();order=updateOrderField(order,'event.type','wedding');order=updateOrderField(order,'additional.notes','<script>alert(1)</script> Keep it elegant');
 const request={requestNumber:'ECHO-1001',id:'abc',createdAt:'2026-11-10T15:00:00Z',journey:{label:'Booking confirmed',isBooked:true,showsPrices:true},order,items:[{name:'DJ <Khalil>',quantity:1,unitPrice:1000,lineTotal:1000}],subtotal:1000,discount:0,taxPercent:13,tax:130,total:1130,deposit:300,balance:830};
 const html=bookingConfirmationHtml(request,{now:new Date('2026-11-17T12:00:00Z')});
 assert.match(html,/Booking confirmation/);assert.match(html,/ECHO-1001/);assert.match(html,/\$1,130\.00/);assert.match(html,/Remaining balance/);
 assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;script&gt;/);assert.match(html,/DJ &lt;Khalil&gt;/);
 assert.match(bookingConfirmationHtml({...request,journey:{label:'In review',isBooked:false,showsPrices:false}}),/Booking request summary/);
});
