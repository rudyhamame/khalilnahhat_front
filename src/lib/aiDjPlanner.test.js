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
