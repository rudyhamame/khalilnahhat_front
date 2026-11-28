import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {clientBookingJourney} from '../lib/clientBookingJourney.js';
import {createEventOrder} from '../lib/eventOrderCore.mjs';
import {clientWorkspaceView} from '../lib/clientWorkspaceRoutes.js';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Client}=await server.ssrLoadModule('/src/components/DashboardPage.jsx');
const {default:Admin}=await server.ssrLoadModule('/src/components/AdminServicesPanel.jsx');
const order=createEventOrder();order.customer.firstName='Alex';order.customer.lastName='Morgan';order.event.type='wedding';order.additional.notes='Keep this saved booking note';
const request={id:'one',requestNumber:'ECHO-ONE',status:'quoted',customerName:'Alex Morgan',customerEmail:'alex@example.test',createdAt:'2026-11-25T12:00:00Z',quotedAt:'2026-11-25T13:00:00Z',expiresAt:'2099-06-20T12:00:00Z',order,items:[{serviceId:'svc-dj',name:'Saved DJ service',quantity:1,unitPrice:100,lineTotal:100}],payments:[],subtotal:100,tax:13,taxPercent:13,total:113,deposit:30,balance:83};
const client=r=>renderToStaticMarkup(createElement(Client,{user:{firstName:'Alex'},activeView:'bookings',serviceRequests:[r]}));
test('the dedicated contact page opens the selected booking room and links back to that booking',()=>{
 assert.equal(clientWorkspaceView('/dashboard/bookings/contact'),'contact');
 const html=renderToStaticMarkup(createElement(Client,{user:{firstName:'Alex'},activeView:'contact',bookingId:request.id,serviceRequests:[request]}));
 assert.match(html,/client-booking-contact-page/);
 assert.match(html,/href="\/dashboard\/bookings\?booking=one"/);
 assert.match(html,/meeting-room-call/);assert.match(html,/meeting-room-chat/);
 assert.doesNotMatch(html,/class="admin-booking-layout"|aria-modal="true"/);
});
test('client and admin share booking list, detail columns, status pipeline, atom review and quote presentation',()=>{
 const views=[client(request),renderToStaticMarkup(createElement(Admin,{requests:[{...request,journey:clientBookingJourney(request)}]}))];
 for(const html of views){for(const marker of ['admin-booking-layout','admin-booking-list-code','admin-booking-detail-heading','booking-status-band','booking-summary-main','booking-detail-sections','booking-quote-heading','booking-quote-layout','Keep this saved booking note','DJ service'])assert.ok(html.includes(marker),marker);}
 for(const [index,html] of views.entries()){
  const prefix=index===0?'client-booking':'admin-booking';
  assert.match(html,/role="tablist"/);
  assert.ok(html.includes(`id="${prefix}-details-tab" aria-selected="true"`));
  assert.ok(html.includes(`id="${prefix}-quote-tab" aria-selected="false"`));
  assert.match(html,new RegExp(`id="${prefix}-quote-panel"[^>]*hidden=""`));
 }
 const html=views[0];assert.match(html,/accept|ACCEPT QUOTE/);assert.match(html,/<fieldset[^>]*disabled/);assert.doesNotMatch(html,/Delete permanently|RECORD PAYMENT|Send quote|Load rates/);
});
test('unpublished client requests retain item quantities and never render draft quote prices',()=>{
 const html=client({...request,status:'pending',quotedAt:null,total:9876.54,items:[{...request.items[0],unitPrice:9876.54}]});
 assert.match(html,/data-quote="off"/);assert.match(html,/Saved DJ service × 1/);assert.doesNotMatch(html,/9,876\.54|booking-quote-layout|ACCEPT QUOTE/);
});
test('client booking details open at the first numbered step and keep other steps hidden',()=>{
 const html=client(request);
 assert.match(html,/class="bdr bdr-stepped"/);
 assert.match(html,/aria-label="Booking detail steps"/);
 assert.equal((html.match(/class="bdr-step-number"/g)||[]).length,4);
 assert.equal((html.match(/class="bdr-section"[^>]*role="tabpanel"[^>]*hidden=""/g)||[]).length,3);
 assert.match(html,/Step 1 of 4/);
 assert.match(html,/<button type="button" disabled="">Back<\/button>/);
 assert.match(html,/<button type="button">Next<\/button>/);
 assert.match(html,/<aside class="client-booking-contact-aside"[^>]*><section class="meeting-room-embedded"/);
 assert.match(html,/class="meeting-room-call"/);
 assert.match(html,/class="meeting-room-chat"/);
 assert.doesNotMatch(html,/aria-modal="true"|class="meeting-room-panel"|Want to meet with us/);
 const admin=renderToStaticMarkup(createElement(Admin,{requests:[{...request,journey:clientBookingJourney(request)}]}));
 assert.doesNotMatch(admin,/bdr-stepped|Booking detail steps/);
});
test('modification history and client undo remain available alongside the shared status steps',()=>{
 const html=client({...request,status:'pending',quotedAt:null,modifications:[{at:'2026-11-25T12:30:00Z',canUndo:true}]});
 assert.match(html,/Booking modified/);assert.match(html,/Undo modification/);
});

test('booking draft shows a vertical pipeline with only Draft current and every section visible without tabs',async()=>{
 const {default:Layout}=await server.ssrLoadModule('/src/components/BookingDraftLayout.jsx');
 const {default:Review}=await server.ssrLoadModule('/src/components/BookingDraftReview.jsx');
 for(const ar of [false,true]){
  const html=renderToStaticMarkup(createElement(Layout,{ar},createElement(Review,{order,ar})));
  assert.match(html,/bd-pipeline-layout/);assert.match(html,/booking-status-band/);
  assert.equal((html.match(/class="is-here"/g)||[]).length,1);assert.equal((html.match(/class="is-done"/g)||[]).length,0);
  assert.ok(html.includes(ar?'مسودة الحجز':'Booking draft'));
  assert.equal((html.match(/class="bdr-section"/g)||[]).length,4);
  assert.doesNotMatch(html,/bdr-tabs|bdr-arrow|role="tab|role="tabpanel/);
  assert.ok(html.includes('Keep this saved booking note'));
 }
});
