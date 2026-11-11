import test from 'node:test';import assert from 'node:assert/strict';
import {cropRect,fitZoom,frameFromImage,loadPausePhoto,pausePhotoBox,preparePausePhoto} from './pausePhoto.js';
test('the pause photo is fitted into a 16:9 frame without stretching, centred',()=>{
  assert.deepEqual(pausePhotoBox(1920,1080),{x:0,y:0,w:1280,h:720});
  const portrait=pausePhotoBox(1080,1920);assert.equal(portrait.h,720);assert.equal(portrait.w,405);assert.equal(portrait.x,Math.round((1280-405)/2));
});
test('the frame is a clean 1280 x 720 canvas with the photo drawn inside it',()=>{
  const calls=[];const canvas={getContext:()=>({fillRect:(...a)=>calls.push(['fill',...a]),drawImage:(...a)=>calls.push(['image',...a.slice(1)]),set fillStyle(v){}})};
  const frame=frameFromImage({naturalWidth:1000,naturalHeight:1000},{createElement:()=>canvas});
  assert.deepEqual([frame.width,frame.height],[1280,720]);assert.deepEqual(calls.at(-1).slice(1).map(Math.round),[280,0,720,720]);
});
test('choosing a gallery photo remembers only its reference; loading restores it, and a bad link gives nothing',async()=>{
  const store=new Map(),storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  const image={naturalWidth:800,naturalHeight:600},load=async()=>image,frame=photo=>({from:photo});
  const chosen=await preparePausePhoto({id:'p1',title:'Be right back',mediaUrl:'https://cdn.example/p1.jpg'},{storage,load,frame});
  assert.equal(chosen.id,'p1');assert.equal(chosen.frame.from,image);assert.match(store.get('echo-pause-photo'),/cdn.example\/p1.jpg/);assert.ok(!store.get('echo-pause-photo').includes('data:'));
  const restored=await loadPausePhoto({storage,load,frame});assert.equal(restored.title,'Be right back');
  assert.equal(await loadPausePhoto({storage,load:async()=>{throw new Error('blocked');},frame}),null);
  assert.equal(await loadPausePhoto({storage:{getItem:()=>null},load,frame}),null);
});

test('crop: fit shows the whole photo, fill covers the frame, zoom crops in and panning never leaves a gap',()=>{
  const minZoom=fitZoom(1000,1000);assert.equal(Math.round(minZoom*1000),563);
  const fit=cropRect(1000,1000,{zoom:minZoom,cx:.5,cy:.5});assert.deepEqual([Math.round(fit.w),Math.round(fit.h),Math.round(fit.x)],[720,720,280]);
  const fill=cropRect(1000,1000,{zoom:1,cx:.5,cy:.5});assert.deepEqual([fill.w,fill.h,fill.x,Math.round(fill.y)],[1280,1280,0,-280]);
  const zoomed=cropRect(1000,1000,{zoom:2,cx:0,cy:0});assert.equal(zoomed.x,0);assert.equal(zoomed.y,0);
  const far=cropRect(1000,1000,{zoom:2,cx:1,cy:1});assert.equal(Math.round(far.x),1280-2560);assert.equal(Math.round(far.y),720-2560);
  assert.equal(cropRect(1000,1000,{zoom:99}).zoom,4);
});
