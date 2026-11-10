import test from 'node:test';
import assert from 'node:assert/strict';
import {startLocalRecording,recordingFrame,localRecordingMime} from './localLiveRecording.js';
function fixture(){
 const recorders=[],canvases=[],sessions=new Map(),parts=new Map(),messages=[],files=[];
 class Stream{constructor(tracks){this.tracks=tracks;}}
 class Recorder{
  static isTypeSupported(type){return type.startsWith('video/webm');}
  constructor(stream,options){this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';recorders.push(this);}
  start(timeslice){this.timeslice=timeslice;this.state='recording';}
  emit(bytes){this.ondataavailable({data:new Blob([new Uint8Array(bytes)])});}
  stop(){this.state='inactive';this.emit([recorders.indexOf(this)+1]);queueMicrotask(()=>this.onstop());}
 }
 const camera={kind:'video',readyState:'live',getSettings:()=>({height:720}),stop:()=>assert.fail('Source camera must stay alive')},audio={kind:'audio',stop:()=>assert.fail('Source audio must stay alive')};
 const doc={createElement:type=>{
  if(type==='video')return{videoWidth:1920,videoHeight:1080,play:async()=>{},pause(){}};
  const track={kind:'video',stop(){this.stopped=true;}},canvas={track,getContext:()=>({fillRect(){},drawImage(...args){canvas.draw=args;}}),captureStream:()=>({getVideoTracks:()=>[track]})};canvases.push(canvas);return canvas;
 }};
 const store={async put(session){sessions.set(session.id,{...session});parts.set(session.id,[]);},async append(id,bytes){parts.get(id).push([...new Uint8Array(bytes)]);const s=sessions.get(id);s.count++;s.bytes+=bytes.byteLength;},async markStopped(id,complete){Object.assign(sessions.get(id),{stopped:true,complete});},async sessions(){return [...sessions.values()];}};
 return{recorders,canvases,sessions,parts,messages,files,options:{tracks:[camera,audio],Recorder,Stream,document:doc,store,onStatus:message=>messages.push(message),onFiles:value=>files.push(...value)},audio};
}
test('landscape contains the full frame; portrait center-crops without stretching',()=>{
 assert.deepEqual(recordingFrame(1920,1080,1280,720),{x:0,y:0,width:1280,height:720});
 const portrait=recordingFrame(1920,1080,720,1280,true);assert.equal(portrait.height,1280);assert.ok(portrait.x<0);assert.equal(portrait.y,0);
});
test('one landscape encoder saves live audio in ordered disk parts without a portrait copy',async()=>{
 const f=fixture(),pair=await startLocalRecording(f.options);
 assert.deepEqual(f.canvases.map(c=>[c.width,c.height]),[[1280,720]]);
 assert.equal(f.recorders.length,1);assert.ok(f.recorders.every(r=>r.timeslice===4000&&r.stream.tracks.includes(f.audio)));
 f.recorders[0].emit([9,8]);await pair.stop(true);
 assert.equal(f.files.length,1);assert.ok(f.files.every(file=>file.complete&&file.count===2));
 assert.deepEqual([...f.parts.values()],[[[9,8],[1]]]);assert.ok(f.canvases.every(c=>c.track.stopped));
 // Double stop must not duplicate parts or finalization.
 await pair.stop(true);assert.equal(f.files.length,1);
});
test('unexpected disconnect keeps partial captures available for recovery',async()=>{
 const f=fixture(),pair=await startLocalRecording(f.options);await pair.stop(false);assert.ok(f.files.every(file=>file.stopped&&!file.complete));
});
test('local recording requires video and does not accept audio-only encoders',async()=>{
 assert.equal(localRecordingMime({isTypeSupported:()=>false}),undefined);
 const f=fixture();await assert.rejects(startLocalRecording({...f.options,tracks:[f.audio]}),/active video/);assert.equal(f.recorders.length,0);
});
test('a disconnected/full disk stops the encoder and reports the failure without stopping source tracks',async()=>{
 const f=fixture();f.options.store.append=async()=>{throw Error('USB drive disconnected');};
 const pair=await startLocalRecording(f.options);f.recorders[0].emit([1,2]);
 await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(pair.stop(true),/USB drive disconnected/);
 assert.ok(f.recorders.every(recorder=>recorder.state==='inactive'));assert.ok(f.canvases.every(canvas=>canvas.track.stopped));
 assert.ok(f.messages.some(message=>message.includes('USB drive disconnected')));
});
