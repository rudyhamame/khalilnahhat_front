import test from 'node:test';import assert from 'node:assert/strict';
import {cropRect,fitZoom,frameFromImage,loadPausePhoto,pausePhotoBox,preparePausePhoto,restorePausePhoto,drawMessage,wrapLines,normalizeMessage,portraitBand,PAUSE_PORTRAIT_WIDTH,PAUSE_PORTRAIT_HEIGHT} from './pausePhoto.js';
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

test('the pause photo comes back from the reference saved with the live on the server, and is remembered in this browser',async()=>{
  const store={};const storage={setItem:(k,v)=>{store[k]=v;},getItem:k=>store[k]??null};
  const photo=await restorePausePhoto({id:'p1',title:'Halt',url:'https://example.com/halt.jpg',crop:{zoom:2,cx:.4,cy:.6}},{storage,load:async url=>({naturalWidth:100,naturalHeight:100,src:url}),frame:()=>'frame'});
  assert.deepEqual([photo.id,photo.url,photo.frame,photo.crop.zoom],['p1','https://example.com/halt.jpg','frame',2]);
  assert.match(store['echo-pause-photo'],/halt\.jpg/);
  assert.equal(await restorePausePhoto(null),null);
});

test('the pause message is wrapped, kept inside the frame and drawn over the photo; empty text draws nothing',()=>{
  assert.deepEqual(wrapLines(text=>text.length*10,'one two three four',90),['one two','three','four']);
  assert.deepEqual(wrapLines(text=>text.length,'a\nb',100),['a','b']);
  assert.equal(drawMessage({},{text:'   '}),null);
  const drawn=[];const ctx={save(){},restore(){},measureText:text=>({width:text.length*20}),fillRect:(...a)=>drawn.push(['plate',...a]),fillText:(...a)=>drawn.push(['text',...a])};
  const box=drawMessage(ctx,{text:'Back in 5 minutes',x:0,y:1,size:8,color:'#e6d6ac'});
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=1280&&box.y+box.h<=720,'the message block stays inside the frame');
  assert.ok(drawn.some(call=>call[0]==='plate')&&drawn.some(call=>call[0]==='text'&&call[1]==='Back in 5 minutes'));
  assert.deepEqual(normalizeMessage({text:'x',size:99,color:'red',x:2}),{text:'x',x:1,y:.82,px:.5,py:.78,size:20,color:'#ffffff',safe:true});
});

test('a portrait (9:16) frame is built with its own crop and its own message position; the portrait band of a landscape frame is 405 wide',()=>{
  assert.deepEqual(portraitBand(.5),{x:437.5,w:405});assert.equal(portraitBand(0).x,0);assert.equal(portraitBand(1).x,875);
  const sizes=[];const doc={createElement:()=>{const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){},save(){},restore(){},measureText:()=>({width:10}),fillText(){}})};sizes.push(canvas);return canvas;}};
  const portrait=frameFromImage({naturalWidth:100,naturalHeight:100},doc,undefined,{text:'Hi',x:.1,y:.1,px:.9,py:.9},true);
  assert.deepEqual([portrait.width,portrait.height],[PAUSE_PORTRAIT_WIDTH,PAUSE_PORTRAIT_HEIGHT]);
  // the message lands where the portrait position says, not the landscape one
  const drawn=[];const ctx={save(){},restore(){},measureText:()=>({width:100}),fillRect(){},fillText:(...a)=>drawn.push(a)};
  drawMessage(ctx,{text:'Hi',x:.1,y:.1,px:.9,py:.9},720,1280);
  assert.ok(drawn[0][1]>600&&drawn[0][2]>1000,'portrait uses px/py');
});
