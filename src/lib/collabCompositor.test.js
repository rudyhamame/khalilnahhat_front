import test from 'node:test';import assert from 'node:assert/strict';
import {collabRects,fitRect,drawCollab} from './collabCompositor.js';
test('the portrait source fills one third of the width at full height, flush with the chosen edge',()=>{
  const [main,right]=collabRects(1280,720),[,left]=collabRects(1280,720,{side:'left'});
  assert.deepEqual([main.source,main.w,main.h],['a',1280,720]);
  assert.deepEqual([right.source,right.x,right.y,right.w,right.h],['b',853,0,427,720]);assert.equal(right.x+right.w,1280);
  assert.deepEqual([left.x,left.y,left.w,left.h],[0,0,427,720]);
});
test('minimized: a small 9:16 window in the bottom corner, inside a margin, never leaving the frame',()=>{
  const [,br]=collabRects(1280,720,{side:'mini-br'}),[,bl]=collabRects(1280,720,{side:'mini-bl'});
  assert.equal(br.h,302);assert.equal(br.w,170);assert.equal(br.x+br.w+32,1280);assert.equal(br.y+br.h+32,720);assert.equal(bl.x,32);assert.equal(bl.y,br.y);
  assert.ok(br.h<720&&bl.x>=0);assert.equal(Math.round(br.w/br.h*1000),563);
});
test('cover crops without stretching, pan slides the crop, contain letterboxes',()=>{
  const cover=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover');assert.equal(Math.round(cover.sw/cover.sh*100),Math.round(405/720*100));
  const left=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover',0),right=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover',1);assert.equal(left.sx,0);assert.equal(Math.round(right.sx+right.sw),1920);
  const contain=fitRect(1920,1080,{x:0,y:0,w:640,h:720},'contain');assert.equal(contain.dw,640);assert.equal(Math.round(contain.dh),360);
});
test('the pan only crops the overlay, never the landscape picture; a source that is not ready leaves its box dark',()=>{
  const seen=[];const ctx={fillRect(){},drawImage:(v,sx)=>seen.push([v.name,Math.round(sx)])};
  const video=name=>({name,readyState:4,videoWidth:1920,videoHeight:1080});
  drawCollab(ctx,{a:video('A'),b:video('B')},collabRects(1280,720),1280,720,0);
  assert.equal(seen[0][1],0);assert.equal(seen[1][1],0);
  seen.length=0;drawCollab(ctx,{a:video('A'),b:{name:'B',readyState:0,videoWidth:0,videoHeight:0}},collabRects(1280,720),1280,720,1);assert.deepEqual(seen.map(s=>s[0]),['A']);
});
