import test from 'node:test';
import assert from 'node:assert/strict';
import {browserBeatAnalysis,GRID_MAX_BYTES} from './beatGridAnalysis.js';
function environment(t,{large=false,hold=false}={}){
 const saved={fetch:globalThis.fetch,OfflineAudioContext:globalThis.OfflineAudioContext,Worker:globalThis.Worker};let decodes=0,worker,terminated=0;
 t.after(()=>Object.assign(globalThis,saved));
 globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-length':String(large?GRID_MAX_BYTES+1:3)}});
 globalThis.OfflineAudioContext=class{
  constructor(channels,length,rate){assert.equal(channels,1);assert.equal(length,1);assert.equal(rate,11025);}
  async decodeAudioData(){decodes++;return {duration:30,length:256,sampleRate:11025,numberOfChannels:2,getChannelData:c=>new Float32Array(256).fill(c?.5:1)};}
 };
 globalThis.Worker=class{
  constructor(url,options){assert.match(String(url),/audioBeatGrid.worker.js$/);assert.equal(options.type,'module');worker=this;}
  postMessage(message,transfer){assert.equal(message.sampleRate,11025);assert.equal(transfer[0],message.samples);assert.equal(new Float32Array(message.samples)[0],.75);if(!hold)setImmediate(()=>this.onmessage({data:{type:'result',grid:{bpm:123,verified:true}}}));}
  terminate(){terminated++;}
 };
 return {get decodes(){return decodes;},get terminated(){return terminated;},get worker(){return worker;}};
}
test('analysis decodes a separate low-rate buffer and transfers mono data to a worker without a playback source',async t=>{
 const env=environment(t),stages=[];const grid=await browserBeatAnalysis({audioUrl:'https://audio.example/song.mp3'},{signal:new AbortController().signal,progress:stage=>stages.push(stage)});
 assert.equal(grid.bpm,123);assert.equal(env.decodes,1);assert.equal(env.terminated,1);assert.ok(stages.includes('Decoding audio'));
});
test('oversized files are rejected before decode and worker allocation',async t=>{
 const env=environment(t,{large:true});await assert.rejects(()=>browserBeatAnalysis({audioUrl:'https://audio.example/song.mp3'},{signal:new AbortController().signal,progress(){}}),/analysis limit/);assert.equal(env.decodes,0);assert.equal(env.worker,undefined);
});
test('cancellation terminates background analysis and cannot publish a late verified result',async t=>{
 const env=environment(t,{hold:true}),abort=new AbortController();const pending=browserBeatAnalysis({audioUrl:'https://audio.example/song.mp3'},{signal:abort.signal,progress(){}});
 const rejected=assert.rejects(pending,{name:'AbortError'});for(let i=0;i<20&&!env.worker;i++)await new Promise(done=>setTimeout(done,1));assert.ok(env.worker);abort.abort();await rejected;assert.equal(env.terminated,1);
 env.worker.onmessage({data:{type:'result',grid:{verified:true}}});assert.equal(env.terminated,1);
});
