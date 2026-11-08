import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('chat uses socket authentication, change events and reconnect instead of history polling',()=>{
 const sockets=[],timers=[],changes=[],errors=[];
 class Socket{constructor(url){this.url=url;sockets.push(this);}send(value){this.sent=JSON.parse(value);}close(){this.closed=true;}}
 const source=fs.readFileSync(new URL('./projectChatSocket.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const connect=vm.runInNewContext(source+';connectProjectChatSocket',{apiBaseUrl:'/api',window:{location:{href:'http://localhost:5176/admin'}},URL,setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){}});
 const close=connect({token:'private-token',Socket,onChange:event=>changes.push(event),onError:error=>errors.push(error)});
 assert.equal(sockets[0].url,'ws://localhost:5176/api/echo-project-chat/socket');assert.ok(!sockets[0].url.includes('private-token'));
 sockets[0].onopen();assert.equal(sockets[0].sent.token,'private-token');
 sockets[0].onmessage({data:'{"type":"ready"}'});sockets[0].onmessage({data:'{"type":"changed","reason":"messages"}'});assert.equal(changes.length,2);assert.equal(timers.length,0);
 sockets[0].onclose({code:1006});assert.equal(timers.length,1);timers[0]();assert.equal(sockets.length,2);
 close();assert.equal(sockets[1].closed,true);assert.equal(sockets[1].onmessage,null);
});
