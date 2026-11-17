import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:EchoAdmin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
const {default:WorkPlayerBox}=await server.ssrLoadModule('/src/echo/WorkPlayerBox.jsx');
const {default:WorkTypeJourney}=await server.ssrLoadModule('/src/echo/WorkTypeJourney.jsx');
test('Posting studio retains the administrator gate',()=>{
 for(const user of [null,{isAdmin:false}]){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{user,isSessionReady:true,search:'?tab=posting-studio'}));assert.match(html,/Admin sign-in required/);assert.doesNotMatch(html,/posting-tools/);
 }
});
test('dashboard and legacy video links show the dedicated Posting Studio launcher',()=>{
 for(const tab of ['posting-studio','video-editor']){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{user:{isAdmin:true,email:'test@example.invalid'},isSessionReady:true,search:`?tab=${tab}`}));
  assert.match(html,/data-area="posting-studio"/);assert.match(html,/aria-label="Posting studio launcher"/);
  assert.match(html,/Open Posting Studio/);assert.doesNotMatch(html,/class="posting-tools"/);
 }
});
test('the dedicated full-screen Posting Studio route contains every creation tool',()=>{
 const html=renderToStaticMarkup(createElement(EchoAdmin,{user:{isAdmin:true,email:'test@example.invalid'},isSessionReady:true,search:'?tool=video',postingStudioWindow:true}));
 assert.match(html,/data-area="posting-studio"/);assert.match(html,/aria-label="Posting studio"/);
 for(const label of ['Video editor','Social cards','Audio + photo/video','Post copy'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/admin-ai-aside/);
});
test('the video work box uses the admin name in English and Arabic',()=>{
 const workType={id:'LIVE',name:'Stage moments',nameArabic:'لحظات المسرح'};
 for(const language of ['en','ar']){
  const name=language==='ar'?workType.nameArabic:workType.name;
  const html=renderToStaticMarkup(createElement(WorkPlayerBox,{active:true,lang:{lang:language},type:'LIVE',workType,tone:5},createElement('div',null,name)));
  assert.match(html,/is-reels is-open/);assert.match(html,/class="reels-player"/);
  assert.doesNotMatch(html,/wp-deck|wp-wheel/);
  assert.match(html,new RegExp(`dir="${language==='ar'?'rtl':'ltr'}"`));
  assert.ok(html.includes(`aria-label="${name}"`));
  assert.ok(html.includes(`<span>${name}</span>`));
  assert.doesNotMatch(html,/>Reels<|>ريلز</);
 }
});
test('work stories use admin names and details for every type without editorial overrides',()=>{
 const workTypes=[{id:'LIVE',name:'Stage moments',nameArabic:'لحظات المسرح',details:'Admin video description',detailsArabic:'وصف الفيديو من الإدارة'},{id:'MIX',name:'Evening sessions',nameArabic:'جلسات المساء',details:'Admin mix description',detailsArabic:'وصف الجلسات من الإدارة'}];
 for(const ar of [false,true]){
  const html=renderToStaticMarkup(createElement(WorkTypeJourney,{ar,workTypes,renderCard:work=>createElement('span',null,work.id)}));
  for(const work of workTypes){assert.ok(html.includes(ar?work.nameArabic:work.name));assert.ok(html.includes(ar?work.detailsArabic:work.details));}
  assert.doesNotMatch(html,/One mood|A little closer|Reels|ريلز/);
 }
});
