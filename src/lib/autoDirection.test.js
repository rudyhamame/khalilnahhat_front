import test from 'node:test';
import assert from 'node:assert/strict';
import {autoDirection} from './autoDirection.js';
// A minimal DOM: only what autoDirection touches.
const field=(tag,type)=>{const attrs=new Map();return {nodeType:1,tagName:tag,attrs,hasAttribute:k=>attrs.has(k),setAttribute:(k,v)=>attrs.set(k,v),closest(){return FREE(this)?this:null;},querySelectorAll(){return [];},type};};
const FREE=n=>n.tagName==='TEXTAREA'||(n.tagName==='INPUT'&&(n.type===undefined||n.type==='text'||n.type==='search'));
test('free-text fields get dir=auto and other inputs are left alone',()=>{
 const text=field('INPUT','text'),area=field('TEXTAREA'),date=field('INPUT','date'),tagged=field('INPUT','text');tagged.attrs.set('dir','ltr');
 let callback;globalThis.MutationObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){}};
 const root={querySelectorAll:()=>[text,area,date,tagged],documentElement:{}};
 autoDirection(root);
 assert.equal(text.attrs.get('dir'),'auto');assert.equal(area.attrs.get('dir'),'auto');assert.equal(tagged.attrs.get('dir'),'ltr');
 // field added later
 const late=field('TEXTAREA');callback([{addedNodes:[late]}]);assert.equal(late.attrs.get('dir'),'auto');
});
