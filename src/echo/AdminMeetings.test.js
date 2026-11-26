import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Admin}=await server.ssrLoadModule('/src/echo/EchoAdmin.jsx');
const {AdminMeetingList}=await server.ssrLoadModule('/src/echo/AdminMeetings.jsx');
test('meeting workspace stays behind the admin gate and shows schedule tools alongside the availability editor',()=>{
 const props={search:'?tab=meetings',isSessionReady:true};
 assert.match(renderToStaticMarkup(createElement(Admin,props)),/Admin sign-in required/);
 const html=renderToStaticMarkup(createElement(Admin,{...props,user:{isAdmin:true,email:'admin@example.test'}}));
 for(const text of ['Meeting schedule','Publish availability','Times to publish','Toronto time','Browser voice / video','Upcoming booked','Search clients and topics'])assert.ok(html.includes(text),text);
 assert.match(html,/Loading meetings/);assert.match(html,/aria-pressed="true">30 min/);
 assert.doesNotMatch(html,/meeting-slot-form/);
 assert.match(html,/aria-label="Hour, 1 to 12"/);assert.match(html,/aria-label="Minute, 0 to 59"/);
 assert.match(html,/aria-label="AM or PM"/);assert.match(html,/aria-label="Next day"/);
});
test('booked browser appointments expose join and cancel; open times expose remove without private client fields',()=>{
 const items=[{id:'booked',status:'booked',mode:'online',start:'2099-06-20T14:00:00Z',durationMin:30,bookedByName:'Ana Client',bookedByEmail:'ana@example.test',topic:'Planning our wedding'},{id:'open',status:'open',mode:'phone',start:'2099-06-21T14:00:00Z',durationMin:30}];
 const html=renderToStaticMarkup(createElement(AdminMeetingList,{items}));
 for(const text of ['Ana Client','ana@example.test','Planning our wedding','Open room','Cancel','Remove open time','Available appointment'])assert.ok(html.includes(text),text);
 const filtered=renderToStaticMarkup(createElement(AdminMeetingList,{items,filter:'open'}));assert.doesNotMatch(filtered,/ana@example.test|Open room|>Cancel</);
 const empty=renderToStaticMarkup(createElement(AdminMeetingList,{items,query:'no match'}));assert.match(empty,/No matching meetings/);
});
