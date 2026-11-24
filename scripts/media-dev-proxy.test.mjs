import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaDevProxy} from './media-dev-proxy.mjs';
test('fixed media proxy removes only the local same-origin header and preserves range/signature forwarding',()=>{
 const config=mediaDevProxy();assert.equal(config.target,'https://vps-ba7fb4cb.vps.ovh.ca');assert.equal(config.changeOrigin,true);let callback;
 config.configure({on:(event,fn)=>{assert.equal(event,'proxyReq');callback=fn;}});
 const removed=[];callback({removeHeader:key=>removed.push(key)},{headers:{origin:'http://localhost:5176',host:'localhost:5176',range:'bytes=0-1023'}});assert.deepEqual(removed,['origin']);
 removed.length=0;callback({removeHeader:key=>removed.push(key)},{headers:{origin:'https://unrelated.example',host:'localhost:5176'}});assert.deepEqual(removed,[]);
});
