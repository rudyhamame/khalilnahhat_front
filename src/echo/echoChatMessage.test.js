import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>server.close());
const {default:EchoChatMessage}=await server.ssrLoadModule('/src/echo/EchoChatMessage.jsx');
const {AtomGroups}=await server.ssrLoadModule('/src/echo/bookingReview.jsx');
const {default:QuotePage}=await server.ssrLoadModule('/src/echo/QuotePage.jsx');
const {default:BookingConfirmation,BookingSendingState}=await server.ssrLoadModule('/src/echo/BookingConfirmation.jsx');
const {EventOrderContext}=await server.ssrLoadModule('/src/echo/eventOrderContext.js');
const {createEventOrder}=await server.ssrLoadModule('/src/lib/eventOrderCore.mjs');
const render=content=>renderToStaticMarkup(createElement(EchoChatMessage,{message:{role:'assistant',content}}));
test('both confirmation placements use a memorable booking ID, copy action and clear next steps',()=>{
 const code='ECHO-ABCD-EFGH-JKLM';
 for(const heading of [true,false]){
  const html=renderToStaticMarkup(createElement(BookingConfirmation,{code,heading}));
  assert.match(html,/class="booking-receipt-code"/);
  assert.ok(html.includes(code));assert.match(html,/Copy booking ID/);
  assert.match(html,/memorize or save this booking ID/);
  assert.match(html,/href="\/dashboard\/bookings"/);
  assert.doesNotMatch(html,/echo-section|QUOTE REQUEST RECEIVED/);
 }
});
test('the Arabic receipt preserves the exact left-to-right booking ID',()=>{
 const html=renderToStaticMarkup(createElement(BookingConfirmation,{code:'ECHO-ABCD-EFGH-JKLM',ar:true}));
 assert.match(html,/dir="rtl"/);assert.match(html,/<code dir="ltr" translate="no"/);
 assert.match(html,/يرجى حفظ رقم الحجز/);
});
test('sending state does not invent a receipt before the server saves the request',()=>{
 const html=renderToStaticMarkup(createElement(BookingSendingState,{}));
 assert.match(html,/once your request is saved/);
 assert.doesNotMatch(html,/class="booking-receipt-code"|ECHO-/);
});
test('equipment and quantities in a markdown table render as a real table, with the question after it',()=>{
 const html=render('Your draft is updated.\n\n| Item | Qty |\n| --- | --- |\n| Lectern | 1 |\n| Uplights | 8 |\n\nWhat is the setup time?');
 assert.match(html,/<table class="echo-message-table"><thead><tr><th scope="col">Item<\/th><th scope="col">Qty<\/th>/);
 assert.equal((html.match(/<tr>/g)||[]).length,3);assert.match(html,/<td>Uplights<\/td><td>8<\/td>/);
 assert.ok(html.indexOf('Your draft is updated')<html.indexOf('<table')&&html.indexOf('<table')<html.indexOf('What is the setup time?'));
 assert.doesNotMatch(html,/---/);
});
test('plain replies and bullet lists are unchanged',()=>{
 assert.match(render('Hello there.'),/<p dir="auto">Hello there\.<\/p>/);
 assert.match(render('- one\n- two'),/<ul class="echo-message-list"><li>one<\/li><li>two<\/li><\/ul>/);
});
test('an attached file is shown by its name as a link; only https links are linked',()=>{
 const html=render('Added to your Inspiration photos: [stage.jpg](https://res.cloudinary.com/x/stage.jpg)');
 assert.match(html,/<a href="https:\/\/res\.cloudinary\.com\/x\/stage\.jpg" target="_blank" rel="noopener noreferrer">stage\.jpg<\/a>/);
 assert.doesNotMatch(render('[evil](javascript:alert(1))'),/<a /);
});
test('a correction reply provides a manual-edit hyperlink without a send handler',()=>{
 const html=renderToStaticMarkup(createElement(EchoChatMessage,{message:{role:'assistant',content:'What date would you prefer instead?',actions:[{label:'Edit manually',goto:'event.date'}]}}));
 assert.match(html,/<a href="\/booking\?field=event.date#booking-date">Edit manually<\/a>/);
});
test('booking review shows only tick and X controls per atom and keeps corrections entered',()=>{
 const line={key:'event.type',label:'Event type',value:'Wedding',empty:false};
 const html=renderToStaticMarkup(createElement(AtomGroups,{lines:[line],progress:{missing:[]},tr:en=>en,review:{stateFor:()=> 'correction',onReview(){}}}));
 assert.match(html,/data-group="entered"/);
 assert.match(html,/data-review="correction"/);
 assert.equal((html.match(/<button /g)||[]).length,2);
 assert.match(html,/aria-label="Confirm Event type"/);
 assert.match(html,/aria-label="Correct Event type"/);
 assert.doesNotMatch(html,/Modify|pencil/i);
});
test('confirmed atoms replace tick and reject controls with a single Edit button',()=>{
 const line={key:'event.type',label:'Event type',value:'Wedding',empty:false};
 const html=renderToStaticMarkup(createElement(AtomGroups,{lines:[line],progress:{missing:[]},tr:en=>en,review:{stateFor:()=> 'confirmed',onReview(){},onEdit(){}}}));
 assert.equal((html.match(/<button /g)||[]).length,1);
 assert.match(html,/aria-label="Edit Event type"/);
 assert.doesNotMatch(html,/aria-label="Confirm |aria-label="Correct /);
});
test('blank required and optional atoms have no review controls',()=>{
 const lines=[{key:'event.date',label:'Date',value:'Not set yet',empty:true,required:true},{key:'additional.notes',label:'Notes',value:'Not set yet',empty:true,required:false}];
 const html=renderToStaticMarkup(createElement(AtomGroups,{lines,progress:{missing:[lines[0]]},tr:en=>en,review:{stateFor:()=>null,onReview(){}}}));
 assert.doesNotMatch(html,/<button |class="ea-atom-controls"/);
 assert.match(html,/Needs attention/);
 assert.match(html,/Optional/);
});
test('automatic submission is blocked until every atom is confirmed',()=>{
 const ctx={order:createEventOrder(),draftId:'test',draftEditable:true,cloudReady:true};
 const html=renderToStaticMarkup(createElement(EventOrderContext.Provider,{value:ctx},createElement(QuotePage,{lang:{lang:'en'},user:{id:'test'},isSessionReady:true,autoSubmit:true,atomsConfirmed:false})));
 assert.match(html,/Confirm every entry in Booking review before submitting/);
 assert.doesNotMatch(html,/Sending your booking|booking-auto-send-spinner/);
});

test('venue matches render inside the reply as a grid with names, addresses and selection buttons',()=>{
 const venues=[{sourceId:'one',name:'Grand Hall',address:'1 Main St, Toronto, ON',sourceAttribution:'© OpenStreetMap contributors'},{sourceId:'two',name:'Garden Hall',address:'2 Main St, Toronto, ON'}];
 const html=renderToStaticMarkup(createElement(EchoChatMessage,{message:{role:'assistant',content:'Which result matches your venue?',venueResults:venues},onVenueSelect(){}}));
 assert.match(html,/class="echo-message-venues" role="group" aria-label="Matching venues"/);
 assert.equal((html.match(/class="echo-message-venue"/g)||[]).length,2);
 for(const venue of venues){assert.ok(html.includes(venue.name));assert.ok(html.includes(venue.address.split(',')[0]));assert.ok(html.includes(`aria-label="Use venue: ${venue.name}"`));}
 assert.match(html,/<address dir="ltr">1 Main St\nToronto ON<\/address>/);
 assert.ok(html.indexOf('Which result')<html.indexOf('echo-message-venues'));
 assert.match(html,/© OpenStreetMap contributors/);
});

test('venue cards support Arabic and disable selection while the draft cannot be edited',()=>{
 const html=renderToStaticMarkup(createElement(EchoChatMessage,{ar:true,message:{role:'assistant',content:'اختر المكان',venueResults:[{name:'قاعة',address:'تورونتو'}]},onVenueSelect(){},venueDisabled:true}));
 assert.match(html,/aria-label="الأماكن المطابقة" dir="rtl"/);
 assert.match(html,/<button type="button" disabled="" aria-label="استخدام المكان: قاعة">استخدام هذا المكان<\/button>/);
});
