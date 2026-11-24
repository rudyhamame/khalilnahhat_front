import test from 'node:test';
import assert from 'node:assert/strict';
import {localDjPlan,nextPhraseStart,safeDjPlan,trackBpm} from './aiDjPlanner.js';

test('AI DJ fallback chooses the nearest unplayed tempo and reads atom BPM',()=>{
 const current={id:'a',bpm:120},candidates=[{id:'b',bpm:90},{id:'c',atoms:[{sound:{bpm:122}}]},{id:'d',bpm:121}];
 assert.equal(trackBpm(candidates[1]),122);
 assert.equal(localDjPlan({current,candidates,played:['d']}).nextTrackId,'c');
});

test('AI DJ rejects invented tracks and clamps unsafe model timing',()=>{
 const input={current:{id:'a',bpm:120},candidates:[{id:'b',bpm:121}],played:[]};
 assert.equal(safeDjPlan({nextTrackId:'invented'},input).nextTrackId,'b');
 assert.deepEqual(safeDjPlan({nextTrackId:'b',transitionBars:999,cueSeconds:-5,targetBpm:999,style:'unknown'},input),{nextTrackId:'b',transitionBars:32,cueSeconds:0,targetBpm:200,style:'smooth',reason:'AI selected a compatible transition.',source:'local'});
});

test('transition starts on a phrase boundary without running past the recording',()=>{
 const normal=nextPhraseStart({position:10,duration:300,bpm:120,transitionBars:8});
 assert.equal(normal.startAt,280);
 assert.equal(normal.duration,16);
 const ending=nextPhraseStart({position:290,duration:300,bpm:120,transitionBars:8});
 assert.equal(ending.startAt,290);
 assert.equal(ending.duration,10);
});

test('measured audio BPM takes precedence over conflicting metadata only after tempo validation',()=>{
 assert.equal(trackBpm({bpm:120,audioBeatGrid:{tempoVerified:true,bpm:103}}),103);
 assert.equal(trackBpm({bpm:120,audioBeatGrid:{tempoVerified:false,bpm:103}}),120);
});
test('verified downbeat offsets schedule media-grid cues while playback speed controls real fade duration',()=>{
 const timing=nextPhraseStart({position:17,duration:300,bpm:100,rate:2,transitionBars:8,firstDownbeat:.37,gridVerified:true});
 assert.ok(Math.abs((timing.startAt-.37)/2.4-Math.round((timing.startAt-.37)/2.4))<1e-6);assert.equal(timing.gridAligned,true);assert.ok(Math.abs(timing.duration-9.6)<1e-6);
});

test('partial-song mode cues the next phrase early, allowing both decks to overlap',()=>{
 const timing=nextPhraseStart({position:10,duration:300,bpm:120,transitionBars:8,mixAt:70});
 assert.equal(timing.startAt,72);assert.equal(timing.duration,16);assert.ok(timing.startAt+timing.duration<300);
});
test('partial-song timing honors measured downbeats, playback speed and short-track headroom',()=>{
 const timing=nextPhraseStart({position:10,duration:300,bpm:100,rate:2,transitionBars:8,mixAt:130,firstDownbeat:.37,gridVerified:true});
 assert.ok(timing.startAt>=130&&timing.startAt<140);assert.ok(timing.gridAligned);assert.equal(timing.duration,9.6);
 const short=nextPhraseStart({position:10,duration:40,bpm:120,transitionBars:8,mixAt:70});assert.equal(short.startAt,24);assert.equal(short.startAt+short.duration,40);
 const late=nextPhraseStart({position:290,duration:300,bpm:120,mixAt:60});assert.equal(late.startAt,290);assert.equal(late.duration,10);
});
