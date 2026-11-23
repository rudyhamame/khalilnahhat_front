import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Dashboard}=await server.ssrLoadModule('/src/components/DashboardPage.jsx');
const {default:renderRoute}=await server.ssrLoadModule('/src/echo/routes.jsx');
const user={firstName:'Test'};
const render=(activeView,serviceRequests=[])=>renderToStaticMarkup(createElement(Dashboard,{user,activeView,serviceRequests}));
test('/services renders the rentals section directly instead of a blank redirect frame',()=>{
 const route=renderRoute('/services',{lang:{lang:'en'}});assert.equal(route.props.children.props.section,'setup');
});
test('legacy dashboard planning and payments views render useful empty states',()=>{
 assert.match(render('planning'),/Planning opens after confirmation/);
 assert.match(render('payments'),/No payments to arrange yet/);
 assert.match(render('services'),/No service requests yet/);
});
test('dashboard handles saved requests without a journey object and exposes confirmed planning',()=>{
 const request={id:'one',status:'confirmed',requestNumber:'TEST-001',createdAt:'2026-11-17T12:00:00Z',event:{eventDate:'2027-06-19'},items:[],payments:[]};
 assert.match(render('overview',[request]),/TEST-001/);
 assert.match(render('planning',[request]),/SAVE PLANNING DETAILS/);
 assert.match(render('services',[request]),/Booking confirmed/);
});

test('admin and client snapshots retain custom event types, song URLs and attachment notes in both languages',async()=>{
 const {default:Admin}=await server.ssrLoadModule('/src/components/AdminServicesPanel.jsx');
 const {default:Review}=await server.ssrLoadModule('/src/components/BookingDraftReview.jsx');
 const {createEventOrder}=await server.ssrLoadModule('/src/lib/eventOrderCore.mjs');
 const order=createEventOrder();order.event.type='other';order.event.title='Custom celebration';order.music.djRequested=true;
 order.music.suggestedSongs=[{song:'Song',artist:'Artist',phase:'Intro',link:'https://example.com/song-marker'}];
 order.references.photos=[{name:'Photo',url:'https://res.cloudinary.com/demo/image/upload/photo.jpg',comment:'Photo note marker'}];
 order.references.files=[{name:'Document',url:'https://res.cloudinary.com/demo/raw/upload/doc.pdf',comment:'Document note marker'}];
 const request={id:'one',status:'pending',customerName:'Test Client',customerEmail:'test@example.com',order,items:[],journey:{label:'Pending',repriceable:true}};
 for(const ar of [false,true]){
  const admin=renderToStaticMarkup(createElement(Admin,{requests:[request],ar}));
  const client=renderToStaticMarkup(createElement(Review,{order,snapshot:true,ar}));
  for(const html of [admin,client]){
   for(const marker of ['Custom celebration','https://example.com/song-marker','Photo note marker','Document note marker'])assert.ok(html.includes(marker),marker);
   assert.ok(html.includes(ar?'المعلومات المرسلة':'Submitted details'));
   assert.ok(html.includes(ar?'نوع فعاليتك':'Your event type'));
  }
 }
});
