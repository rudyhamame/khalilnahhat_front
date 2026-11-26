import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {clientWorkspaceView} from '../lib/clientWorkspaceRoutes.js';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Dashboard}=await server.ssrLoadModule('/src/components/DashboardPage.jsx');
const {MeetingRoomJoinButton}=await server.ssrLoadModule('/src/echo/MeetingPage.jsx');
test('meeting route and sidebar open the existing browser meeting feature inside the client workspace in both languages',()=>{
 assert.equal(clientWorkspaceView('/dashboard/meetings'),'meetings');
 for(const ar of [false,true]){
  const html=renderToStaticMarkup(createElement(Dashboard,{user:{firstName:'Client'},authToken:'example-token',activeView:'meetings',lang:{lang:ar?'ar':'en'}}));
  assert.match(html,/href="\/dashboard\/meetings"[^>]*aria-current="page"/);
  assert.match(html,/class="client-meetings"/);
  assert.ok(html.includes(ar?'اجتمع معنا':'Meet with us'));
  assert.ok(html.includes(ar?'جارٍ تحميل الاجتماعات':'Loading meetings'));
  assert.doesNotMatch(html,/No times are open|href="\/admin/);
 }
});
test('joining a booked browser meeting opens its existing room ID; phone and in-person meetings have no browser-call button',()=>{
 let joined=null;
 const props={meeting:{id:'existing-room',mode:'online'},onJoin:id=>{joined=id;},embedded:true};
 const button=MeetingRoomJoinButton(props);
 assert.match(renderToStaticMarkup(button),/Join browser voice \/ video meeting/);
 assert.equal(joined,null);button.props.onClick();assert.equal(joined,'existing-room');
 assert.equal(MeetingRoomJoinButton({...props,meeting:{...props.meeting,mode:'phone'}}),null);
 assert.equal(MeetingRoomJoinButton({...props,meeting:{...props.meeting,mode:'in-person'}}),null);
 assert.ok(renderToStaticMarkup(createElement(MeetingRoomJoinButton,{...props,ar:true})).includes('في المتصفح'));
});

const {default:Workspace}=await server.ssrLoadModule('/src/echo/ClientMeetingWorkspace.jsx');
const renderMeetings=props=>renderToStaticMarkup(createElement(Workspace,props));
test('available times are prominent date/time rows, and upcoming browser meetings retain their join action',()=>{
 const html=renderMeetings({slots:[{id:'online',mode:'online',start:'2099-06-20T14:00:00Z',durationMin:30},{id:'phone',mode:'phone',start:'2099-06-21T14:00:00Z',durationMin:30}],meetings:[{id:'saved',mode:'online',start:'2099-06-22T14:00:00Z',durationMin:30}]});
 assert.match(html,/Available meeting times/);assert.match(html,/2 available/);
 assert.equal((html.match(/class="cm-slot"/g)||[]).length,2);
 assert.match(html,/Book this time/);assert.match(html,/Open booking/);assert.match(html,/Join meeting/);
 assert.match(html,/maxLength="500"|maxlength="500"/);assert.match(html,/cm-topic/);
});
test('empty and failed availability are distinct and do not show an unusable topic form',()=>{
 const empty=renderMeetings({slots:[],meetings:[]});assert.match(empty,/No meeting times available yet/);assert.match(empty,/Check availability/);assert.doesNotMatch(empty,/<textarea|Book this time/);
 const failed=renderMeetings({error:'Service unavailable'});assert.match(failed,/Availability could not be loaded/);assert.doesNotMatch(failed,/No meeting times available yet/);
 const loading=renderMeetings({loading:true});assert.match(loading,/Loading meetings/);assert.doesNotMatch(loading,/No meeting times available yet/);
});
test('past meetings are archived without showing a live join button',()=>{
 const html=renderMeetings({meetings:[{id:'old',mode:'online',start:'2000-01-01T12:00:00Z',durationMin:30}]});
 assert.match(html,/Past meetings/);assert.doesNotMatch(html,/>Join meeting</);
});
