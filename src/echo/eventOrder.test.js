import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:OrderSignIn}=await server.ssrLoadModule('/src/echo/OrderSignIn.jsx');
const {EventOrderProvider}=await server.ssrLoadModule('/src/echo/EventOrderProvider.jsx');
const {default:QuotePage}=await server.ssrLoadModule('/src/echo/QuotePage.jsx');
const {default:EquipmentAvailability}=await server.ssrLoadModule('/src/echo/EquipmentAvailability.jsx');
const {default:ServiceOperationsGuide}=await server.ssrLoadModule('/src/echo/ServiceOperationsGuide.jsx');
const {default:EchoAdmin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
const {AdministratorVoiceContext}=await server.ssrLoadModule('/src/echo/administratorVoiceContext.js');

test('booking guide navigation selects the documented subtab and every section link has a target',()=>{
 const html=renderToStaticMarkup(createElement(ServiceOperationsGuide,{search:'?guide=client-booking-process'}));
 assert.match(html,/guide=client-booking-process" aria-current="page"/);
 assert.match(html,/Client Booking Process guide sections/);
 for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/<details/);assert.match(html,/Technical detail: verification boundary/);
 const fallback=renderToStaticMarkup(createElement(ServiceOperationsGuide,{search:'?guide=unknown'}));
 assert.match(fallback,/Live Stream guide sections/);
});
test('Echo Docs keeps its existing session and administrator gate',()=>{
 const props={search:'?tab=service-overview-operations-guide&guide=client-booking-process',isSessionReady:true};
 for(const user of [null,{isAdmin:false}]){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{...props,user}));
  assert.match(html,/Admin sign-in required/);assert.doesNotMatch(html,/Client Booking Process/);
 }
 assert.equal(renderToStaticMarkup(createElement(EchoAdmin,{...props,isSessionReady:false,user:{isAdmin:true}})),'');
 const html=renderToStaticMarkup(createElement(AdministratorVoiceContext.Provider,{value:{voice:{active:false}}},createElement(EchoAdmin,{...props,user:{isAdmin:true,email:'admin@example.invalid'}})));
 assert.match(html,/Client Booking Process guide sections/);
});
test('the manual review editor uses the canonical questionnaire and does not request final dance planning',()=>{
  const html=renderToStaticMarkup(createElement(EventOrderProvider,{user:{firstName:'Example',lastName:'Client',email:'test@example.invalid'},lang:{lang:'en'}},createElement(QuotePage,{lang:{lang:'en',t:{}},user:{firstName:'Example'},isSessionReady:true})));
  for(const id of ['order-customer-fullName','order-event-venue-address','order-event-setup-requirements','order-music-otherPreferences','order-additional-specialRequests'])assert.ok(html.includes(id),id);
  assert.doesNotMatch(html,/name="firstDance"/);
  assert.match(html,/Submit quote request/);
});
test('legacy booking links open the current provider and AI panel includes the guided form',()=>{
  const provider=readFileSync(new URL('./EventOrderProvider.jsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('./AIBookingPanel.jsx',import.meta.url),'utf8');
  assert.ok(provider.includes("['#how-to-book','#event-order']"));
  assert.ok(provider.includes("url.hash='event-order'"));
  assert.match(panel,/<GuidedBookingFlow/);
});
test('the order rail is portaled outside the app; wrapped chapters retain viewport selectors',()=>{
  const provider=readFileSync(new URL('./EventOrderProvider.jsx',import.meta.url),'utf8');
  const fit=readFileSync(new URL('./viewportFit.css',import.meta.url),'utf8');
  const css=readFileSync(new URL('./eventOrder.css',import.meta.url),'utf8');
  assert.match(provider,/createPortal\(<>/);
  assert.match(provider,/<EventOrderAside .*open=\{panelOpen\}/);
  assert.match(provider,/<\/>\s*,document.body\)/);
  assert.match(fit,/:is\(#echo-main,\.event-order-main\)>\.viewport-fit-section/);
  assert.doesNotMatch(css,/echo-header|echo-menu-toggle/);
});

const {default:AIBookingPanel}=await server.ssrLoadModule('/src/echo/AIBookingPanel.jsx');
for(const ar of [false,true]){
  test(`manual and AI-assisted orders require sign-in (${ar?'Arabic':'English'})`,()=>{
    const lang={lang:ar?'ar':'en',t:{}};
    const render=child=>renderToStaticMarkup(createElement(EventOrderProvider,{user:null,lang},child));
    const manual=render(createElement(QuotePage,{lang,user:null,isSessionReady:true}));
    const ai=render(createElement(AIBookingPanel,{ar,user:null,token:null}));
    for(const html of [manual,ai]){
      assert.match(html,/href="\/login"/);
      assert.ok(html.includes(ar?'يجب تسجيل الدخول':'Sign in to start a manual or AI-assisted order.'));
      assert.doesNotMatch(html,/<form|<input|<textarea|<select/);
    }
  });
}
test('manual order fields stay hidden while the account session is being checked',()=>{
  const lang={lang:'en',t:{}};
  const user={id:'client',firstName:'Example'};
  const html=renderToStaticMarkup(createElement(EventOrderProvider,{user,token:'session',lang},createElement(QuotePage,{lang,user,isSessionReady:false})));
  assert.match(html,/Checking your sign-in/);
  assert.doesNotMatch(html,/<form|<input|<textarea|<select/);
});

for(const ar of [false,true])test(`order column offers email and Google account access in place (${ar?'Arabic':'English'})`,()=>{
 const html=renderToStaticMarkup(createElement(OrderSignIn,{ar,auth:{onLogin:()=>{},onSignup:()=>{},onGoogleLogin:()=>{}}}));
 assert.match(html,/<form/);
 assert.match(html,/type="email"/);
 assert.ok(html.includes(ar?'البريد الإلكتروني':'Email address'));
 assert.ok(html.includes(ar?'إنشاء حساب':'Create account'));
 assert.ok(html.includes('Google'));
 assert.doesNotMatch(html,/name="username"|access-portrait|href="\/login"/);
});

for(const ar of [false,true])test(`guided review keeps canonical fields and provides section navigation (${ar?'Arabic':'English'})`,()=>{
 const lang={lang:ar?'ar':'en',t:{}};
 const user={id:'preview',firstName:'Preview',email:'preview@example.invalid'};
 const html=renderToStaticMarkup(createElement(EventOrderProvider,{user,token:'fixture',lang},createElement(QuotePage,{lang,user,isSessionReady:true,guided:true})));
 assert.ok(html.includes(ar?'تفاصيل الحجز':'Booking details'));
 assert.match(html,/role="tablist"/);
 for(const section of ['customer','event','music','references','equipment'])assert.ok(html.includes(`data-draft-section="${section}"`),section);
 assert.ok(html.includes('id="order-event-venue-address"'));
 assert.ok(html.includes('id="order-references-documents"'));
 assert.ok(html.includes(ar?'أرسل طلب عرض السعر':'Submit quote request'));
 assert.doesNotMatch(html,/id="event-order-panel"|ai-booking-panel/);
});

test('equipment badges retain real stock counts without inventing unknown availability',()=>{
 const available=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'available',availableQuantity:1}}));
 assert.match(available,/setup-equipment-stock is-available/);assert.match(available,/<b[^>]*>1<\/b>/);assert.doesNotMatch(available,/Stock availability|Available quantity/);
 const unknown=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'on_request',availableQuantity:null}}));assert.match(unknown,/On request/);assert.doesNotMatch(unknown,/<b>/);
 const unavailable=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'unavailable',availableQuantity:0}}));assert.match(unavailable,/Unavailable/);assert.match(unavailable,/<b[^>]*>0<\/b>/);
});

test('populated planning, hidden venue metadata and shared voucher remain visible in draft review',async()=>{
 const {EventOrderContext}=await server.ssrLoadModule('/src/echo/eventOrderContext.js');
 const {createEventOrder}=await server.ssrLoadModule('/src/lib/eventOrderCore.mjs');
 const order=createEventOrder();order.planning.firstDance='Client selected song';order.event.venue.latitude=43.65;order.event.venue.longitude=-79.38;order.additional.voucherCode='ECHO10';
 const html=renderToStaticMarkup(createElement(EventOrderContext.Provider,{value:{order,draftId:'synthetic',setField:()=>{}}},createElement(QuotePage,{lang:{lang:'en',t:{}},user:{firstName:'Example'},isSessionReady:true})));
 assert.match(html,/Client selected song/);assert.match(html,/data-field="planning.firstDance"/);assert.match(html,/Saved draft details/);assert.match(html,/43\.65/);assert.match(html,/value="ECHO10"/);
});
