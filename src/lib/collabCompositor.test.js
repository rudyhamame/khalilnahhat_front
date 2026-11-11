import test from 'node:test';import assert from 'node:assert/strict';
import {collabRects,fitRect,drawCollab} from './collabCompositor.js';
test('two sources fill the 16:9 frame: the landscape source takes two thirds, the portrait source one third, side by side',()=>{
  const [land,port]=collabRects(1280,720),[landL,portL]=collabRects(1280,720,{side:'left'});
  assert.deepEqual([land.source,land.x,land.y,land.w,land.h],['a',0,0,853,720]);
  assert.deepEqual([port.source,port.x,port.y,port.w,port.h],['b',853,0,427,720]);assert.equal(land.x+land.w,port.x);assert.equal(port.x+port.w,1280);
  assert.deepEqual([portL.x,portL.w],[0,427]);assert.deepEqual([landL.x,landL.w],[427,853]);assert.equal(portL.x+portL.w,landL.x);
});
test('minimized: the landscape source keeps the whole frame and a small 9:16 window in the bottom corner, inside a margin, never leaving the frame',()=>{
  const [,br]=collabRects(1280,720,{side:'mini-br'}),[,bl]=collabRects(1280,720,{side:'mini-bl'});
  assert.equal(br.h,302);assert.equal(br.w,170);assert.equal(br.x+br.w+32,1280);assert.equal(br.y+br.h+32,720);assert.equal(bl.x,32);assert.equal(bl.y,br.y);
  assert.ok(br.h<720&&bl.x>=0);assert.equal(Math.round(br.w/br.h*1000),563);
});
test('cover crops without stretching, pan slides the crop, contain letterboxes',()=>{
  const cover=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover');assert.equal(Math.round(cover.sw/cover.sh*100),Math.round(405/720*100));
  const left=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover',0),right=fitRect(1920,1080,{x:0,y:0,w:405,h:720},'cover',1);assert.equal(left.sx,0);assert.equal(Math.round(right.sx+right.sw),1920);
  const contain=fitRect(1920,1080,{x:0,y:0,w:640,h:720},'contain');assert.equal(contain.dw,640);assert.equal(Math.round(contain.dh),360);
});
test('the pan only crops the portrait source; the landscape source is centred; a source that is not ready leaves its box dark',()=>{
  const seen=[];const ctx={fillRect(){},drawImage:(v,sx)=>seen.push([v.name,Math.round(sx)])};
  const video=name=>({name,readyState:4,videoWidth:1920,videoHeight:1080});
  drawCollab(ctx,{a:video('A'),b:video('B')},collabRects(1280,720),1280,720,0);
  assert.deepEqual(seen,[['A',320],['B',0]]);
  seen.length=0;drawCollab(ctx,{a:video('A'),b:video('B')},collabRects(1280,720),1280,720,1);assert.equal(seen[0][1],320);assert.ok(seen[1][1]>1000);
  seen.length=0;drawCollab(ctx,{a:video('A'),b:{name:'B',readyState:0,videoWidth:0,videoHeight:0}},collabRects(1280,720),1280,720,1);assert.deepEqual(seen.map(x=>x[0]),['A']);
});

test('the logo is drawn once, top-left of the landscape source area, on either side, and never over the portrait source',()=>{
  const logo={complete:true,naturalWidth:240,naturalHeight:90,name:'logo'},video=name=>({name,readyState:4,videoWidth:1920,videoHeight:1080});
  for(const [side,expectedX] of [['right',18],['left',427+18]]){
    const calls=[];const ctx={fillRect(){},drawImage:(v,...args)=>calls.push([v.name,...args]),set globalAlpha(v){}};
    drawCollab(ctx,{a:video('A'),b:video('B')},collabRects(1280,720,{side}),1280,720,.5,logo);
    const logos=calls.filter(call=>call[0]==='logo');assert.equal(logos.length,1);assert.deepEqual([logos[0][1],logos[0][2],logos[0][3]],[expectedX,18,144]);
  }
  const none=[];drawCollab({fillRect(){},drawImage:v=>none.push(v.name),set globalAlpha(v){}},{a:video('A'),b:video('B')},collabRects(1280,720),1280,720,.5,null);assert.ok(!none.includes('logo'));
});
