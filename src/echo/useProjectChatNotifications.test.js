import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 const slots=[],effects=[],timers=new Map(),heartbeats=[],receipts=[],offline=[],deliveries=[];
 const heldReads=new Map(),readTopics=[];let holdReads=false;
 let cursor=0,pendingHeartbeat=null,holdHeartbeat=false,nextStatus={unreadCount:3,onlineAdmins:[{id:'other',name:'Other admin'}],deliveryItems:[{id:'message',senderId:'other'}]};
 const window=new EventTarget(),document=new EventTarget();document.hidden=false;
 window.setInterval=fn=>{timers.set(timers.size+1,fn);return timers.size;};window.clearInterval=id=>timers.delete(id);
 const source=fs.readFileSync(new URL('./useProjectChatNotifications.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 const Hook=vm.runInNewContext(source+';useProjectChatNotifications',{
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
  window,document,crypto,CustomEvent,apiBaseUrl:'https://unit.invalid/api',fetch:async(url,request)=>{offline.push(JSON.parse(request.body));return {};},
  updateEchoProjectChatPresence:async payload=>{heartbeats.push(payload);if(holdHeartbeat)return new Promise(resolve=>pendingHeartbeat=resolve);return nextStatus;},
  markEchoProjectChatRead:async(messageId,_token,topicId)=>{receipts.push(messageId);readTopics.push(topicId);if(holdReads)return new Promise(resolve=>heldReads.set(messageId,resolve));return {unreadCount:0,onlineAdmins:nextStatus.onlineAdmins};},
 });
 const render=(open=false)=>{cursor=0;return Hook({userId:'me',token:'admin-test',open,onDelivery:(items,seen)=>deliveries.push({items,seen})});};
 render();
 return {render,window,document,timers,heartbeats,receipts,offline,deliveries,readTopics,holdReads(){holdReads=true;},releaseRead(id,status){heldReads.get(id)(status);},mount:()=>effects[0](),hold(){holdHeartbeat=true;},release(status){holdHeartbeat=false;pendingHeartbeat(status);},setStatus(status){nextStatus=status;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a closed chat polls unread counts and presence; read receipts are only sent for an open visible chat',async()=>{
 const f=fixture(),cleanup=f.mount();await flush();assert.equal(f.heartbeats.length,1);assert.equal(f.deliveries[0].items[0].id,'message');assert.equal(f.deliveries[0].seen,false,'closed chat receives Delivered but never Seen');assert.equal(f.render().unreadCount,3);assert.equal(f.render().onlineAdmins[0].name,'Other admin');
 await f.render(false).markRead('message');assert.equal(f.receipts.length,0);
 await f.render(true).markRead('message');assert.equal(f.receipts.length,1);assert.equal(f.render().unreadCount,0);
 await f.render(true).markRead('message');assert.equal(f.receipts.length,1,'the same snapshot is not repeatedly marked read');
 f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));await f.render(true).markRead('hidden-message');assert.equal(f.receipts.length,1);assert.equal(f.offline.at(-1).online,false);
 cleanup();assert.equal(f.timers.size,0);
});
test('a delayed heartbeat cannot resurrect an unread badge after another chat instance marks it read',async()=>{
 const f=fixture();f.hold();const cleanup=f.mount();
 f.window.dispatchEvent(new CustomEvent('echo:project-chat-read',{detail:{userId:'other-user',status:{unreadCount:99,onlineAdmins:[]}}}));assert.equal(f.render().unreadCount,0);
 f.window.dispatchEvent(new CustomEvent('echo:project-chat-read',{detail:{userId:'me',status:{unreadCount:0,onlineAdmins:[]}}}));
 f.release({unreadCount:7,onlineAdmins:[]});await flush();assert.equal(f.render().unreadCount,0);cleanup();
});
test('a pending online response is ignored after the page becomes hidden',async()=>{
 const f=fixture();f.hold();const cleanup=f.mount();f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));
 f.release({unreadCount:9,onlineAdmins:[{id:'stale',name:'Stale'}]});await flush();assert.equal(f.render().onlineAdmins.length,0);assert.equal(f.render().unreadCount,0);cleanup();
});

test('late read responses from another topic cannot restore obsolete unread badges',async()=>{
 const f=fixture(),cleanup=f.mount();await flush();f.holdReads();
 const old=f.render(true).markRead('general-message','general');
 const latest=f.render(true).markRead('topic-message','111111111111111111111111');
 f.releaseRead('topic-message',{unreadCount:1,onlineAdmins:[],topicUnreadCounts:{general:1,'111111111111111111111111':0}});await latest;
 f.releaseRead('general-message',{unreadCount:2,onlineAdmins:[],topicUnreadCounts:{general:0,'111111111111111111111111':2}});await old;
 assert.equal(f.render().unreadCount,1);assert.equal(f.render().topicUnreadCounts['111111111111111111111111'],0);
 assert.deepEqual(f.readTopics,['general','111111111111111111111111']);cleanup();
});
