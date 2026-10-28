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
test('the manual review editor uses the canonical questionnaire and does not request final dance planning',()=>{
  const html=renderToStaticMarkup(createElement(EventOrderProvider,{user:{firstName:'Example',lastName:'Client',email:'test@example.invalid'},lang:{lang:'en'}},createElement(QuotePage,{lang:{lang:'en',t:{}},user:{firstName:'Example'},isSessionReady:true})));
  for(const label of ['Full name','Full venue address','Setup / production requirements','Music styles','Music Archive track reference','Special requests'])assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/name="firstDance"/);
  assert.match(html,/Submit quote request/);
});
test('the retired How to Book viewport is removed; booking links retain a nonvisual entry point',()=>{
  const source=readFileSync(new URL('./EchoHome.jsx',import.meta.url),'utf8');
  assert.match(source,/id="how-to-book" className="event-order-entry-anchor"/);assert.doesNotMatch(source,/echo-event-ordering|booking-method-picker|Start personal booking|<AIBookingPanel/);
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

for(const ar of [false,true])test(`standalone review keeps canonical fields and provides section navigation (${ar?'Arabic':'English'})`,()=>{
 const lang={lang:ar?'ar':'en',t:{}};
 const user={id:'preview',firstName:'Preview',email:'preview@example.invalid'};
 const html=renderToStaticMarkup(createElement(EventOrderProvider,{user,token:'fixture',lang,reviewOnly:true},createElement(QuotePage,{lang,user,isSessionReady:true,review:true})));
 assert.ok(html.includes(ar?'أقسام تفاصيل الفعالية':'Event brief sections'));
 assert.ok(html.includes(ar?'كل التفاصيل':'Every detail.')||html.includes('بكل تفاصيلها.'));
 for(const id of ['draft-customer','draft-event','draft-music','draft-studioChoice','draft-references','draft-equipment'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(html.includes('id="order-event-venue-address"'));
 assert.ok(html.includes('id="order-references-archiveTrack"'));
 assert.ok(html.includes(ar?'أرسل طلب عرض السعر':'Submit quote request'));
 assert.doesNotMatch(html,/id="event-order-panel"|ai-booking-panel/);
});

test('equipment badges retain real stock counts without inventing unknown availability',()=>{
 const available=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'available',availableQuantity:1}}));
 assert.match(available,/setup-equipment-stock is-available/);assert.match(available,/· 1/);assert.doesNotMatch(available,/Stock availability|Available quantity/);
 const unknown=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'on_request',availableQuantity:null}}));assert.match(unknown,/On request/);assert.doesNotMatch(unknown,/<b>/);
 const unavailable=renderToStaticMarkup(createElement(EquipmentAvailability,{item:{name:'Speaker',availabilityStatus:'unavailable',availableQuantity:0}}));assert.match(unavailable,/Unavailable/);assert.match(unavailable,/· 0/);
});
