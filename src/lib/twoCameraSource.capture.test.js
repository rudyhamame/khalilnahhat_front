import test from 'node:test';import assert from 'node:assert/strict';
import {captureTwoCameras} from './twoCameraSource.js';
// Fakes: a camera stream, a canvas and a video element, enough for the capture to run.
const track=()=>({stop(){this.stopped=true;},addEventListener(){},requestFrame(){},contentHint:''});
const stream=()=>{const t=track();return {t,getTracks:()=>[t],getVideoTracks:()=>[t],getSettings:()=>({})};};
globalThis.MediaStream=class{constructor(tracks){this.tracks=tracks;}getVideoTracks(){return this.tracks;}getTracks(){return this.tracks;}};
const doc={createElement:tag=>tag==='canvas'?{width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),captureStream:()=>({getVideoTracks:()=>[track()]})}:{play:async()=>{},pause(){},readyState:0}};
const clock=()=>()=>{};
test('the same camera for both windows is opened once and feeds both',async()=>{
  const calls=[];const media={getUserMedia:async c=>{calls.push(c.video.deviceId?.exact);return stream();}};
  const source=await captureTwoCameras({cameraId:'cam1',overlayId:'cam1',windows:true,media,doc,clock});
  assert.deepEqual(calls,['cam1']);source.cleanup();
});
test('a camera that never answers ends with a clear error, not a hang',async()=>{
  const media={getUserMedia:()=>new Promise(()=>{})};
  const started=Date.now();
  await assert.rejects(captureTwoCameras({cameraId:'cam1',overlayId:'cam2',windows:true,media,doc,clock}),/did not respond/);
  assert.ok(Date.now()-started<15000);
});
