import test from 'node:test';import assert from 'node:assert/strict';
import {createProgramOutput,fitBox} from './programOutput.js';
test('contain keeps the whole input and centres it; cover fills the frame',()=>{
  const wide=fitBox(1920,1080,1280,720),tall=fitBox(1080,1920,1280,720),fill=fitBox(1080,1920,1280,720,'cover');
  assert.deepEqual([wide.x,wide.y,wide.w,wide.h],[0,0,1280,720]);assert.equal(Math.round(tall.h),720);assert.ok(tall.x>0&&tall.w<1280);
  assert.equal(Math.round(fill.w),1280);assert.ok(fill.h>720);
});
function fixture(){
  const draws=[],stops=[];let clockStopped=0,tick;
  const stream={getVideoTracks:()=>[track],getTracks:()=>[track]},track={requestFrame(){},stop(){stops.push('track');}};
  const ctx={fillRect(){draws.push('clear');},drawImage:(media)=>draws.push(media.name),set fillStyle(v){}};
  const video={name:'input',readyState:4,videoWidth:1920,videoHeight:1080,muted:false,pause(){},play:async()=>{},set srcObject(v){this.stream=v;}};
  const canvas={getContext:()=>ctx,captureStream:()=>stream};
  const doc={createElement:kind=>kind==='video'?video:canvas};
  const output=createProgramOutput({doc,clock:fn=>{tick=fn;return()=>{clockStopped++;};},MediaStreamClass:class{constructor(tracks){this.tracks=tracks;}}});
  return {output,draws,video,track,tick:()=>tick(),stops,clockStopped:()=>clockStopped};
}
test('the program track is steady: the input can change, a hold photo replaces it, and clearing it returns the input',()=>{
  const f=fixture();assert.equal(f.output.track,f.track);
  const first={id:'camera'},second={id:'tab'};
  f.output.setInput(first);assert.deepEqual(f.video.stream.tracks,[first]);f.draws.length=0;f.tick();assert.deepEqual(f.draws,['clear','input']);
  f.output.setInput(second);assert.deepEqual(f.video.stream.tracks,[second]);assert.equal(f.output.track,f.track);
  const photo={name:'photo',naturalWidth:1000,naturalHeight:500};f.output.setHold(photo);assert.equal(f.output.holding,true);f.draws.length=0;f.tick();assert.deepEqual(f.draws,['clear','photo']);
  f.output.setHold(null);f.draws.length=0;f.tick();assert.deepEqual(f.draws,['clear','input']);
});
test('an input that is not ready leaves the frame black and stopping releases the track and the clock',()=>{
  const f=fixture();f.video.readyState=0;f.draws.length=0;f.tick();assert.deepEqual(f.draws,['clear']);
  f.output.stop();assert.deepEqual(f.stops,['track']);assert.equal(f.clockStopped(),1);
});
