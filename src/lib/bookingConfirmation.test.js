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
test('the PDF confirmation carries the Echo logo, loaded from the site origin',()=>{
 const html=bookingConfirmationHtml({requestNumber:'ECHO-1',journey:{label:'Submitted'}},{origin:'https://example.test'});
 assert.match(html,/<img class="logo" src="https:\/\/example\.test\/echo\/echo-event-entertainment-transparent\.webp" alt="Echo Event Entertainment">/);
});
test('the PDF shows uploaded photos as pictures (embedded data, never link text) and ignores non-Cloudinary files',()=>{
 const url='https://res.cloudinary.com/demo/image/upload/v1/khalil/ref.jpg';
 const order={references:{photos:[{url,name:'Stage <idea>.jpg',comment:'Like this'},{url:'https://evil.example/x.jpg',name:'bad.jpg'}]}};
 const request={requestNumber:'ECHO-2',journey:{label:'Submitted'},order};
 const html=bookingConfirmationHtml(request,{images:{[url.replace('/upload/','/upload/w_900,c_limit,q_auto,f_jpg/')]:'data:image/jpeg;base64,AAAA'}});
 assert.match(html,/<h2>Photos<\/h2>/);assert.match(html,/src="data:image\/jpeg;base64,AAAA"/);
 assert.match(html,/Stage &lt;idea&gt;\.jpg — Like this/);assert.doesNotMatch(html,/evil\.example/);assert.doesNotMatch(html,/<a /);
});

