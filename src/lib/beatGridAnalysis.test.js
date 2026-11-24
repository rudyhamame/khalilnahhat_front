import test from 'node:test';
import assert from 'node:assert/strict';
import {createBeatGridAnalysis,measuredTrack,verifiedGridAt} from './beatGridAnalysis.js';
const track={id:'song',audioUrl:`https://media.example/khalil-media/private/${'a'.repeat(64)}.mp3?expires=1&signature=one`};
const grid={bpm:123,tempoVerified:true,verified:true,firstDownbeat:.37,analyzedFrom:.37,analyzedTo:48,reason:'Audio checked'};
test('one background job is reused through signature refreshes and results remain bound to exact media',async()=>{
 let calls=0;const service=createBeatGridAnalysis({resultCache:new Map(),run:async()=>{calls++;return grid;}});
 const first=await service.analyze(track,{duration:48});const next={...track,audioUrl:track.audioUrl.replace('signature=one','signature=two')};assert.equal(await service.analyze(next,{duration:48}),first);assert.equal(calls,1);
 assert.equal(service.get({...track,audioUrl:'replacement.mp3'}).grid,undefined);assert.equal(measuredTrack(track,first).audioBeatGrid,grid);service.dispose();
});
test('jobs run serially and cancellation resolves queued work without publishing a stale verified result',async()=>{
 let finish,started=0;const resultCache=new Map();const service=createBeatGridAnalysis({resultCache,run:()=>{started++;return new Promise(resolve=>{finish=resolve;});}});
 const a=service.analyze(track,{duration:48}),b=service.analyze({...track,id:'next'},{duration:48});assert.equal(started,1);service.dispose();assert.equal((await a).status,'cancelled');assert.equal((await b).status,'cancelled');finish(grid);await new Promise(resolve=>setImmediate(resolve));assert.equal(resultCache.size,0);
});
test('duration and memory guardrails leave playback untouched and never launch oversized jobs',async()=>{
 let calls=0;const service=createBeatGridAnalysis({resultCache:new Map(),run:async()=>{calls++;return grid;}});
 assert.equal((await service.analyze(track,{duration:0})).status,'waiting');assert.equal((await service.analyze(track,{duration:601})).status,'unavailable');assert.equal(calls,0);service.dispose();
});
test('verification is valid only inside the analyzed recording span',()=>{
 const measured=measuredTrack(track,{grid});assert.equal(verifiedGridAt(measured,2),grid);assert.equal(verifiedGridAt(measured,60),null);assert.equal(verifiedGridAt(measured,0),null);assert.equal(verifiedGridAt({...track,audioBeatGrid:{...grid,verified:false}},2),null);
});

test('a stalled analysis has a bounded wait and cannot later publish a stale verification',async()=>{
 let finish;const resultCache=new Map();const service=createBeatGridAnalysis({resultCache,timeoutMs:10,run:()=>new Promise(resolve=>{finish=resolve;})});
 const state=await service.analyze(track,{duration:48});assert.equal(state.status,'unavailable');assert.match(state.stage,/timed out/);finish(grid);await new Promise(resolve=>setImmediate(resolve));assert.equal(resultCache.size,0);service.dispose();
});
