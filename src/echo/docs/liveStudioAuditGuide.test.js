import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {liveStudioAuditGuide,liveStudioAuditGuideRoute} from './liveStudioAuditGuide.js';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:Guide}=await server.ssrLoadModule('/src/echo/ServiceOperationsGuide.jsx');
const {default:EchoAdmin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
const {default:AdminLiveStudio}=await server.ssrLoadModule('/src/components/AdminLiveStudio.jsx');
test('Live Studio audit has a unique route and complete structured sections',()=>{
 const url=new URL(liveStudioAuditGuideRoute,'https://echo.invalid');
 assert.equal(url.searchParams.get('guide'),liveStudioAuditGuide.id);
 assert.equal(new Set(liveStudioAuditGuide.sections.map(section=>section.id)).size,6);
 for(const section of liveStudioAuditGuide.sections){
  assert.ok(section.title);assert.ok(section.blocks.length);
  for(const block of section.blocks){if(block.type==='table')for(const row of block.rows)assert.equal(row.length,block.headers.length);}
 }
});
test('the dashboard guide selects the audit tab and renders fixes and open findings',()=>{
 const html=renderToStaticMarkup(createElement(Guide,{search:new URL(liveStudioAuditGuideRoute,'https://echo.invalid').search}));
 assert.match(html,/aria-current="page"[^>]*>.*?Live Studio Audit/);
 for(const section of liveStudioAuditGuide.sections)assert.ok(html.includes(`id="guide-${section.id}"`));
 for(const text of ['ready or partial','cancellation token','not a deployment certification'])assert.ok(html.includes(text),text);
});
test('audit content remains behind the admin dashboard gate',()=>{
 for(const user of [null,{isAdmin:false}]){
  const html=renderToStaticMarkup(createElement(EchoAdmin,{user,isSessionReady:true,search:new URL(liveStudioAuditGuideRoute,'https://echo.invalid').search}));
  assert.match(html,/Admin sign-in required/);assert.doesNotMatch(html,/guide-recording-monitor/);
 }
});
test('the refactored studio renders its offline controls without accessing capture devices',()=>{
 const html=renderToStaticMarkup(createElement(AdminLiveStudio,{enabled:false,token:''}));
 assert.match(html,/aria-label="Live studio"/);assert.match(html,/Private preview|Open private preview/);
 assert.match(html,/Live control/);assert.match(html,/OBS disconnected/);
});

test('signed-in administrator can open the audit through the actual dashboard route',()=>{
 const html=renderToStaticMarkup(createElement(EchoAdmin,{user:{isAdmin:true,email:'studio@example.invalid'},isSessionReady:true,search:new URL(liveStudioAuditGuideRoute,'https://echo.invalid').search}));
 assert.match(html,/Live Studio — Architecture/);assert.match(html,/id="guide-recording-monitor"/);
});
