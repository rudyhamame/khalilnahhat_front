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
 assert.match(render('bookings',[request]),/TEST-001/);
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
 const request={id:'one',status:'pending',customerName:'Test Client',customerEmail:'test@example.com',changeRequest:'Please adjust the setup',order,items:[],journey:{label:'Pending',repriceable:true}};
 for(const ar of [false,true]){
  const admin=renderToStaticMarkup(createElement(Admin,{requests:[request],ar}));
  const client=renderToStaticMarkup(createElement(Review,{order,snapshot:true,ar}));
  assert.ok(admin.includes('Please adjust the setup'));
  for(const html of [admin,client]){
   for(const marker of ['Custom celebration','https://example.com/song-marker','Photo note marker','Document note marker'])assert.ok(html.includes(marker),marker);
   assert.ok(html.includes(ar?'المعلومات المرسلة':'Submitted details'));
   assert.ok(html.includes(ar?'نوع فعاليتك':'Your event type'));
  }
 }
});

test('Arabic dashboard localizes draft navigation, request actions and quote totals',async()=>{
 const request={id:'ar',status:'quoted',requestNumber:'ECHO-AR',createdAt:'2026-11-22T12:00:00Z',items:[],payments:[],total:100,deposit:30,expiresAt:'2099-06-20T12:00:00Z'};
 const html=renderToStaticMarkup(createElement(Dashboard,{user,activeView:'bookings',serviceRequests:[request],lang:{lang:'ar'}}));
 for(const value of ['مسودة الحجز','الطلبات وعروض الأسعار','قبول عرض السعر','إجمالي عرض السعر','الرصيد المتبقي','بانتظار قرار العميل'])assert.ok(html.includes(value),value);
 assert.doesNotMatch(html,/ACCEPT QUOTE|Remaining balance|Requests &amp; quotes/);
 const draft=renderToStaticMarkup(createElement(Dashboard,{user,activeView:'draft',lang:{lang:'ar'}}));
 assert.ok(draft.includes('جارٍ تحميل مسودة حسابك…'));
 assert.match(draft,/dir="rtl" lang="ar"/);
 const {default:Admin}=await server.ssrLoadModule('/src/components/AdminServicesPanel.jsx');
 const admin=renderToStaticMarkup(createElement(Admin,{ar:true,requests:[{...request,journey:{label:'Waiting for client',repriceable:true}}]}));
 for(const value of ['طلبات الحجز','تفاصيل الحجز','بانتظار قرار العميل'])assert.ok(admin.includes(value),value);
});

test('quote editor preserves prices and notes, renders totals and terms once, and supports read-only Arabic',async()=>{
 const {default:Editor}=await server.ssrLoadModule('/src/components/BookingQuoteEditor.jsx');
 const {quoteTotals}=await server.ssrLoadModule('/src/lib/quoteTotals.mjs');
 const draft={items:[{serviceId:'speaker',name:'Saved speaker',quantity:2}],prices:{speaker:'120.50'},discountType:'percent',discountValue:10,taxPercent:13,depositAmount:50,validDays:7,adminNote:'Keep <original> note',paymentInstructions:'Original instructions'};
 const totals=quoteTotals({...draft,items:draft.items.map(item=>({...item,unitPrice:Number(draft.prices[item.serviceId])}))});
 const props={request:{},draft,totals,onPriceChange:()=>{},onFieldChange:()=>{},onNoteChange:()=>{},onFillRates:()=>{}};
 const english=renderToStaticMarkup(createElement(Editor,props));
 for(const value of ['Saved speaker','120.50','Keep &lt;original&gt; note','Original instructions','$245.10','$195.10','Quote terms','Price adjustments'])assert.ok(english.includes(value),value);
 assert.equal((english.match(/max="30"/g)||[]).length,1,'one tax control');
 assert.equal((english.match(/max="60"/g)||[]).length,1,'one validity control');
 assert.ok(english.includes('<table'));assert.ok(english.includes('scope="row"'));
 const arabic=renderToStaticMarkup(createElement(Editor,{...props,ar:true,editable:false}));
 for(const value of ['dir="rtl"','إجمالي عرض السعر','شروط عرض السعر','Saved speaker','Original instructions'])assert.ok(arabic.includes(value),value);
 assert.equal((arabic.match(/<fieldset[^>]*disabled=""/g)||[]).length,2);
 assert.ok(arabic.includes('للقراءة فقط'));
});
