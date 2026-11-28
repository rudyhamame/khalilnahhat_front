import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {default:BookingNegotiation,OfferReview}=await vite.ssrLoadModule('/src/components/BookingNegotiation.jsx');
const {default:DashboardPage}=await vite.ssrLoadModule('/src/components/DashboardPage.jsx');
const {clientBookingJourney}=await vite.ssrLoadModule('/src/lib/clientBookingJourney.js');
const base={id:'r1',requestNumber:'ECHO-TEST',createdAt:new Date().toISOString(),items:[{serviceId:'svc-dj',name:'DJ service',category:'service',quantity:1,unitPrice:100}],quoteRevision:2,negotiationRevision:1,payments:[],total:100,subtotal:100,tax:0,taxPercent:0,deposit:30,balance:70};
const proposal={revision:1,quoteRevision:2,submittedAt:new Date().toISOString(),message:'Add speakers instead',items:[{serviceId:'speaker',name:'Speaker',category:'sound',quantity:2,unitPrice:40}],quotedItems:base.items};
const render=(Component,props)=>renderToStaticMarkup(createElement(Component,props));
const request=status=>({...base,status,journey:clientBookingJourney({status})});
test('admin offer review shows additions, removals, per-unit prices and an adoption action',()=>{const html=render(OfferReview,{request:{...base,negotiation:proposal},onAdopt(){}});assert.match(html,/Client’s offer|Client&#x27;s offer|Client’s offer/);assert.match(html,/Removed by client/);assert.match(html,/Added by client/);assert.match(html,/data-label="Quantity">2<\/span>/);assert.match(html,/\$40\.00/);assert.match(html,/Proposed subtotal[\s\S]*\$80\.00/);assert.match(html,/Use client/);assert.match(html,/Add speakers instead/);});
test('negotiation stays available before acceptance and closes after acceptance or decline',()=>{for(const status of ['quoted']){const html=render(BookingNegotiation,{request:request(status),token:'test',onQuoteAction(){}});assert.match(html,/Negotiate the price/);}for(const status of ['accepted','confirmed','cancelled'])assert.equal(render(BookingNegotiation,{request:request(status),token:'test',onQuoteAction(){}}),'');});
test('dashboard offers price negotiation before acceptance only (the Meet Echo card is always there)',()=>{const props={user:{firstName:'Test'},activeView:'bookings',authToken:'test',onQuoteAction(){}}; // legacy /services view opens quotes by default
 for(const status of ['quoted']){const html=render(DashboardPage,{...props,activeView:'services',serviceRequests:[{...request(status),negotiation:status==='changes_requested'?proposal:null}]});assert.match(html,/Negotiate the price|Edit your offer/);assert.match(html,/client-booking-meeting-invite/);}
 const accepted=render(DashboardPage,{...props,activeView:'services',serviceRequests:[request('accepted')]});assert.match(accepted,/client-booking-meeting-invite/);assert.doesNotMatch(accepted,/Negotiate the price/);
});
test('reviewed offer uses its original quote snapshot to preserve removed-line context',()=>{const html=render(OfferReview,{request:{...base,items:proposal.items,negotiation:{...proposal,resolvedAt:new Date().toISOString()}},onAdopt(){}});assert.match(html,/DJ service/);assert.match(html,/Removed by client/);assert.doesNotMatch(html,/Use client’s selection/);});
