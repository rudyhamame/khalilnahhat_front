import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:EchoAdmin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
const {default:WorkPlayerBox}=await server.ssrLoadModule('/src/echo/WorkPlayerBox.jsx');
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
test('the Reels work box opens a dedicated video viewer in English and Arabic',()=>{
 for(const language of ['en','ar']){
  const html=renderToStaticMarkup(createElement(WorkPlayerBox,{active:true,lang:{lang:language},type:'LIVE',tone:5},createElement('div',null,'Reels')));
  assert.match(html,/is-reels is-open/);assert.match(html,/class="reels-player"/);
  assert.doesNotMatch(html,/wp-deck|wp-wheel/);
  assert.match(html,new RegExp(`dir="${language==='ar'?'rtl':'ltr'}"`));
 }
});
