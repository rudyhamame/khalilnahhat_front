import test from 'node:test';import assert from 'node:assert/strict';
import {collabRects,fitRect,drawCollab} from './collabCompositor.js';
test('side by side splits the canvas in two full-height halves',()=>{
  const [a,b]=collabRects('split',1280,720);assert.deepEqual([a.source,a.x,a.w,a.h],['a',0,640,720]);assert.deepEqual([b.source,b.x,b.w],['b',640,640]);
});
test('picture in picture: main fills the frame, the inset sits in the chosen corner inside a margin',()=>{
  const [main,inset]=collabRects('pip-a',1280,720,{corner:'br',pip:.25});assert.equal(main.source,'a');assert.equal(inset.source,'b');
  assert.equal(inset.w,320);assert.equal(inset.h,180);assert.equal(inset.x+inset.w+32,1280);assert.equal(inset.y+inset.h+32,720);
  const swapped=collabRects('pip-b',1280,720,{corner:'tl'});assert.equal(swapped[0].source,'b');assert.deepEqual([swapped[1].x,swapped[1].y],[32,32]);
});
test('pip size is clamped so the inset can neither vanish nor cover the frame',()=>{assert.equal(collabRects('pip-a',1000,562,{pip:.9})[1].w,500);assert.equal(collabRects('pip-a',1000,562,{pip:0})[1].w,150);});
test('cover crops without stretching and contain letterboxes',()=>{
  const cover=fitRect(1920,1080,{x:0,y:0,w:640,h:720},'cover');assert.equal(Math.round(cover.sw/cover.sh*100),Math.round(640/720*100));
  const contain=fitRect(1920,1080,{x:0,y:0,w:640,h:720},'contain');assert.equal(contain.dw,640);assert.equal(Math.round(contain.dh),360);assert.equal(Math.round(contain.dy),180);
});
test('a source that is not ready leaves its box dark and does not stop the other',()=>{
  const calls=[];const ctx={fillRect:()=>calls.push('fill'),drawImage:(v)=>calls.push(v.name),strokeRect:()=>{}};
  drawCollab(ctx,{a:{name:'A',readyState:4,videoWidth:1920,videoHeight:1080},b:{name:'B',readyState:0,videoWidth:0,videoHeight:0}},collabRects('split',1280,720),1280,720);
  assert.deepEqual(calls,['fill','A']);
});
