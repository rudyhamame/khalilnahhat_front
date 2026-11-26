import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Settings}=await server.ssrLoadModule('/src/echo/MeetingDeviceSettings.jsx');
const props={devices:{audio:[{id:'usb',label:'USB microphone'}],video:[{id:'webcam',label:'Desk camera'}]},selected:{audio:'usb',video:'webcam'},ready:true,busy:false};
test('microphone and camera selectors are available before and during calls, with preview only before calling',()=>{
 const before=renderToStaticMarkup(createElement(Settings,props));
 assert.match(before,/aria-label="Microphone"/);assert.match(before,/aria-label="Camera"/);assert.match(before,/USB microphone/);assert.match(before,/Desk camera/);assert.match(before,/Preview camera/);
 const during=renderToStaticMarkup(createElement(Settings,{...props,calling:true}));assert.match(during,/aria-label="Microphone"/);assert.match(during,/aria-label="Camera"/);assert.doesNotMatch(during,/Test mic|Preview camera/);
 const locked=renderToStaticMarkup(createElement(Settings,{...props,ready:false}));assert.match(locked,/<select[^>]*disabled/);
});
test('unplugged selections remain identifiable, and Arabic device labels are available',()=>{
 const html=renderToStaticMarkup(createElement(Settings,{...props,devices:{audio:[],video:[]}}));assert.match(html,/Unavailable device/);
 const arabic=renderToStaticMarkup(createElement(Settings,{...props,ar:true}));assert.ok(arabic.includes('الميكروفون'));assert.ok(arabic.includes('الكاميرا'));
});
