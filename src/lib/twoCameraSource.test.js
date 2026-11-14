import test from 'node:test';import assert from 'node:assert/strict';
import {cropPixels,overlayBox,placeOverlay,DEFAULT_OVERLAY} from './twoCameraSource.js';
const near=(a,b,eps=.5)=>assert.ok(Math.abs(a-b)<=eps,`${a} vs ${b}`);
test('the crop is any rectangle of camera 2; a circle cuts the biggest centred square',()=>{
  const free=cropPixels(1280,720,{x:.1,y:.2,w:.5,h:.4},'rect');
  assert.deepEqual([free.sx,free.sy,free.sw,free.sh],[128,144,640,288]);
  const circle=cropPixels(1280,720,{x:.1,y:.2,w:.5,h:.4},'circle');
  near(circle.sw,288);near(circle.sh,288);near(circle.sx,128+(640-288)/2);near(circle.sy,144);
  const tiny=cropPixels(1280,720,{x:0,y:0,w:.01,h:.01},'rect');near(tiny.sw,1280*.12);near(tiny.sh,720*.12);
});
test('the overlay keeps the crop shape (nothing is stretched) and stays inside the 16:9 frame',()=>{
  const {src,dest}=overlayBox(1280,720,{shape:'rect',x:.9,y:.9,w:.3,crop:{x:0,y:0,w:.5,h:.5}},1280,720);
  near(dest.w/dest.h,src.sw/src.sh,.01);
  assert.ok(dest.x>=0&&dest.y>=0&&dest.x+dest.w<=1280.001&&dest.y+dest.h<=720.001);
  const tall=overlayBox(1280,720,{shape:'rect',x:0,y:0,w:.7,crop:{x:0,y:0,w:.12,h:1}},1280,720);
  assert.ok(tall.dest.h<=720*.9+.001);
  const circle=overlayBox(1280,720,{...DEFAULT_OVERLAY,shape:'circle'},1280,720);near(circle.dest.w,circle.dest.h,.01);
});
test('corner presets put the overlay in the chosen corner with a margin',()=>{
  const bl=placeOverlay(DEFAULT_OVERLAY,'bl',1280,720),tr=placeOverlay(DEFAULT_OVERLAY,'tr',1280,720);
  assert.ok(bl.x<.05&&bl.y>.5);assert.ok(tr.x>.5&&tr.y<.1);
  const box=overlayBox(1280,720,tr,1280,720);assert.ok(box.dest.x+box.dest.w<=1280);
});
