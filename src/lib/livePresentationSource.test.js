import test from 'node:test';import assert from 'node:assert/strict';import {capturePresentationSource} from './livePresentationSource.js';
test('tab sharing asks for source audio and releases every captured track',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancel=globalThis.cancelAnimationFrame;let options,ended,stops=0;
 const video={contentHint:'',addEventListener(_name,fn){ended=fn;},stop(){stops++;}},audio={stop(){stops++;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getDisplayMedia(value){options=value;return {getVideoTracks:()=>[video],getTracks:()=>[video,audio]};}}}});globalThis.cancelAnimationFrame=()=>{};
 try{let notified=false;const source=await capturePresentationSource({kind:'display',width:1920,height:1080,onEnded:()=>{notified=true;}});assert.deepEqual(options.audio,{echoCancellation:false,noiseSuppression:false,autoGainControl:false});assert.equal(options.video.width.ideal,1920);assert.equal(options.video.frameRate.max,30);ended();assert.equal(notified,true);source.cleanup();assert.equal(stops,2);}finally{Object.defineProperty(globalThis,'navigator',saved);globalThis.cancelAnimationFrame=cancel;}
});
test('denied sharing propagates the permission error instead of opening camera capture',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancel=globalThis.cancelAnimationFrame;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getDisplayMedia:async()=>{throw new Error('Permission denied');}}}});globalThis.cancelAnimationFrame=()=>{};
 try{await assert.rejects(capturePresentationSource({kind:'display'}),/Permission denied/);}finally{Object.defineProperty(globalThis,'navigator',saved);globalThis.cancelAnimationFrame=cancel;}
});

for(const kind of ['image','video'])test(`${kind} source keeps drawing from worker ticks without animation frames and preserves source audio`,async()=>{
 const saved={document:globalThis.document,Image:globalThis.Image,MediaStream:globalThis.MediaStream,Worker:globalThis.Worker,window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame};
 let worker,draws=0,frames=0,stops=0,terminated=false;
 const output={requestFrame(){frames++;},stop(){stops++;}},audio={stop(){stops++;}};
 const element={tagName:'VIDEO',videoWidth:1280,videoHeight:720,play:async()=>{},pause(){},removeAttribute(){},load(){}};
 const stream=tracks=>({getTracks:()=>tracks,getVideoTracks:()=>tracks.filter(t=>t===output),getAudioTracks:()=>tracks.filter(t=>t===audio),addTrack(t){tracks.push(t);}});
 const canvas={getContext:()=>({fillRect(){},drawImage(){draws++;}}),captureStream:()=>stream([output])};
 globalThis.document={createElement:name=>name==='video'?element:canvas};
 globalThis.Image=class{naturalWidth=1280;naturalHeight=720;async decode(){}};
 globalThis.MediaStream=class{constructor(tracks=[]){return stream([...tracks]);}};
 globalThis.Worker=class{constructor(){worker=this;}terminate(){terminated=true;}};
 globalThis.requestAnimationFrame=()=>{throw Error('Hidden-tab animation scheduling must not drive the source');};
 globalThis.window={AudioContext:class{resume(){return Promise.resolve();}close(){}createMediaElementSource(){return {connect(){}};}createMediaStreamDestination(){return {stream:stream([audio])};}}};
 let source;
 try{
  source=await capturePresentationSource({kind,file:new Blob(['media'],{type:kind==='image'?'image/png':'video/mp4'})});
  assert.equal(source.stream.getAudioTracks().length,kind==='video'?1:0);
  const before=draws;worker.onmessage();assert.equal(draws,before+1);assert.equal(frames,1);
  source.cleanup();assert.equal(terminated,true);assert.equal(stops,kind==='video'?2:1);
  const after=draws;worker.onmessage();assert.equal(draws,after);
 }finally{if(source&&!terminated)source.cleanup();Object.assign(globalThis,saved);}
});
