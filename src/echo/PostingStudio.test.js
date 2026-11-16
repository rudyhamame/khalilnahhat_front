import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:EchoAdmin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
test('Posting studio retains the administrator gate',()=>{
 for(const user of [null,{isAdmin:false}]){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{user,isSessionReady:true,search:'?tab=posting-studio'}));assert.match(html,/Admin sign-in required/);assert.doesNotMatch(html,/posting-tools/);
 }
});
test('new studio and legacy video links select Social media with all creation tools',()=>{
 for(const tab of ['posting-studio','video-editor']){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{user:{isAdmin:true,email:'test@example.invalid'},isSessionReady:true,search:`?tab=${tab}`}));
  assert.match(html,/data-area="posting-studio"/);assert.match(html,/aria-label="Posting studio"/);
  for(const label of ['Video editor','Social cards','Audio + photo/video','Post copy'])assert.ok(html.includes(label),label);
  assert.match(html,/Social media/);assert.doesNotMatch(html,/>Video Player &amp; Editor</);
 }
});
