import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {canScrollWithinViewport} from './viewportScroll.js';

const original=globalThis.getComputedStyle;
before(()=>{globalThis.getComputedStyle=element=>element.style;});
after(()=>{if(original)globalThis.getComputedStyle=original;else delete globalThis.getComputedStyle;});
function chapter(overrides={}){
 const doc={body:{},documentElement:{}};
 const node={ownerDocument:doc,parentElement:doc.body,clientHeight:600,scrollHeight:1200,scrollTop:0,clientWidth:320,scrollWidth:320,scrollLeft:0,style:{overflowY:'auto',overflowX:'hidden',direction:'ltr'},...overrides};
 return node;
}
test('a portrait chapter can scroll to its controls below the fold',()=>{
 assert.equal(canScrollWithinViewport(chapter(),100),true);
});
test('an exhausted inner panel can continue through its chapter',()=>{
 const parent=chapter();const panel={...chapter({scrollTop:600}),ownerDocument:parent.ownerDocument,parentElement:parent};
 assert.equal(canScrollWithinViewport(panel,100),true);
});
test('chapter edges stop document scrolling in either direction',()=>{
 const node=chapter();assert.equal(canScrollWithinViewport(node,-100),false);
 node.scrollTop=600;assert.equal(canScrollWithinViewport(node,100),false);
 assert.equal(canScrollWithinViewport(node,-100),true);
});
test('clipped artwork does not consume scrolling gestures',()=>{
 assert.equal(canScrollWithinViewport(chapter({style:{overflowY:'hidden'}}),100),false);
});
test('Arabic horizontal rails scroll from the right edge to the left',()=>{
 const node=chapter({scrollWidth:640,style:{overflowY:'hidden',overflowX:'auto',direction:'rtl'}});
 assert.equal(canScrollWithinViewport(node,-100,'x'),true);
 assert.equal(canScrollWithinViewport(node,100,'x'),false);
 node.scrollLeft=-320;
 assert.equal(canScrollWithinViewport(node,-100,'x'),false);
 assert.equal(canScrollWithinViewport(node,100,'x'),true);
});
