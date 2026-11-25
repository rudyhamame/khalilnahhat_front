import test from 'node:test';
import assert from 'node:assert/strict';
import {installAccessViewport} from './accessViewport.js';
function fixture(){
 const listeners=new Map(),frames=new Map(),timers=new Map(),properties=new Map(),attrs=new Set();let id=0,top=600;
 const events=name=>({addEventListener:(type,fn)=>listeners.set(`${name}:${type}`,fn),removeEventListener:type=>listeners.delete(`${name}:${type}`)});
 class Element{}
 const root={style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)},classList:{add(){},remove(){}},hasAttribute:key=>attrs.has(key),toggleAttribute:(key,on)=>on?attrs.add(key):attrs.delete(key),removeAttribute:key=>attrs.delete(key)};
 const scroll={parentElement:root,scrollHeight:1200,clientHeight:350,scrollTop:0,overflowY:'auto'};
 const field={getBoundingClientRect:()=>({top:top-scroll.scrollTop,bottom:top+56-scroll.scrollTop})};
 const input=Object.assign(new Element(),{tagName:'INPUT',parentElement:scroll,closest:()=>field,scrollIntoView:()=>{throw Error('The form should scroll without panning the whole scene.');}});
 const viewport={height:800,offsetTop:0,scale:1,...events('viewport')};
 const win={innerHeight:800,visualViewport:viewport,HTMLElement:Element,getComputedStyle:node=>({zoom:'1',overflowY:node.overflowY||'visible'}),requestAnimationFrame:fn=>{const key=++id;frames.set(key,fn);return key;},cancelAnimationFrame:key=>frames.delete(key),setTimeout:fn=>{const key=++id;timers.set(key,fn);return key;},clearTimeout:key=>timers.delete(key),...events('window')};
 const doc={documentElement:root,activeElement:null,...events('document')};
 const cleanup=installAccessViewport(win,doc);
 const flush=()=>{for(const [key,fn]of [...frames]){frames.delete(key);fn();}};
 return {win,doc,viewport,input,root,scroll,properties,attrs,listeners,frames,timers,cleanup,flush,emit:key=>{listeners.get(key)?.();flush();},position:value=>{top=value;}};
}
test('opening the keyboard sizes the form to the visible screen and reveals the focused input without translation feedback',()=>{
 const h=fixture();h.doc.activeElement=h.input;h.viewport.height=360;h.emit('viewport:resize');
 assert.ok(h.attrs.has('data-access-keyboard'));assert.equal(h.properties.get('--echo-access-height'),'800px');assert.equal(h.properties.get('--echo-access-visible-height'),'360px');assert.equal(h.properties.get('--echo-kb-lift'),'0px');assert.equal(h.scroll.scrollTop,316);
 h.emit('viewport:scroll');assert.equal(h.scroll.scrollTop,316);h.cleanup();
});
test('changing input while the keyboard is open scrolls the next field into view and closing restores the normal layout',()=>{
 const h=fixture();h.doc.activeElement=h.input;h.viewport.height=360;h.emit('viewport:resize');h.position(950);h.emit('document:focusin');assert.equal(h.scroll.scrollTop,666);
 h.viewport.height=800;h.doc.activeElement=null;h.emit('viewport:resize');assert.ok(!h.attrs.has('data-access-keyboard'));assert.equal(h.properties.get('--echo-access-visible-height'),'800px');h.cleanup();
});
test('pinch zoom does not change the page geometry, and cleanup cancels pending focus work',()=>{
 const h=fixture();h.viewport.scale=2;h.viewport.height=300;h.doc.activeElement=h.input;h.emit('viewport:resize');assert.equal(h.properties.get('--echo-access-visible-height'),'800px');
 h.emit('document:focusin');assert.equal(h.timers.size,1);h.cleanup();assert.equal(h.listeners.size,0);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.properties.size,0);assert.equal(h.attrs.size,0);
});


test('gradual keyboard animation cannot shrink the baseline away before detection',()=>{
 const h=fixture();h.doc.activeElement=h.input;
 for(const height of [760,720,680,640,360]){h.viewport.height=height;h.emit('viewport:resize');}
 assert.ok(h.attrs.has('data-access-keyboard'));assert.equal(h.properties.get('--echo-access-height'),'800px');h.cleanup();
});
test('scroll distances account for the site CSS zoom',()=>{
 const h=fixture();h.win.getComputedStyle=node=>({zoom:'0.5',overflowY:node.overflowY||'visible'});
 h.doc.activeElement=h.input;h.viewport.height=360;h.emit('viewport:resize');assert.equal(h.scroll.scrollTop,632);assert.equal(h.properties.get('--echo-access-visible-height'),'720px');h.cleanup();
});


test('focusing a field unlocks native page scrolling even before the browser reports a keyboard resize',()=>{
 const h=fixture();h.doc.activeElement=h.input;h.emit('document:focusin');assert.ok(h.attrs.has('data-access-editing'));assert.equal(h.properties.get('--echo-access-keyboard-inset'),'0px');
 h.viewport.height=360;h.emit('viewport:resize');assert.equal(h.properties.get('--echo-access-keyboard-inset'),'440px');
 h.doc.activeElement=null;h.emit('document:focusout');assert.ok(!h.attrs.has('data-access-editing'));h.cleanup();
});
test('user scrolling while the keyboard is open is not pulled back to the input',()=>{
 const h=fixture();h.doc.activeElement=h.input;h.viewport.height=360;h.emit('viewport:resize');h.scroll.scrollTop=700;h.emit('viewport:scroll');assert.equal(h.scroll.scrollTop,700);h.cleanup();
});
test('the unlocked document can use native focus scrolling when no nested scroll area exists',()=>{
 const h=fixture();let calls=0;h.scroll.overflowY='visible';h.input.scrollIntoView=()=>{calls++;};h.doc.activeElement=h.input;h.emit('document:focusin');
 h.viewport.height=360;h.emit('viewport:resize');assert.ok(calls>0);h.cleanup();
});


test('Chromium layout viewport resizing and Safari visual viewport panning keep the input above the keyboard',()=>{
 const chrome=fixture();chrome.doc.activeElement=chrome.input;chrome.win.innerHeight=360;chrome.viewport.height=360;chrome.emit('window:resize');assert.equal(chrome.properties.get('--echo-access-visible-height'),'360px');assert.ok(chrome.attrs.has('data-access-keyboard'));chrome.cleanup();
 const safari=fixture();safari.doc.activeElement=safari.input;safari.viewport.height=360;safari.viewport.offsetTop=90;safari.emit('viewport:resize');assert.equal(safari.win.innerHeight,800);assert.equal(safari.scroll.scrollTop,226);assert.equal(safari.properties.get('--echo-access-visible-height'),'360px');safari.cleanup();
});
