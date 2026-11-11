import test from 'node:test';import assert from 'node:assert/strict';
import {duckStep,DUCK_DEFAULTS} from './autoDuck.js';
test('speaking lowers the audio input at once; it returns only after a short pause of silence',()=>{
  let state={factor:1,speakingUntil:0};
  state=duckStep(state,.01,0);assert.equal(state.factor,1);assert.equal(state.changed,false);
  state=duckStep(state,.2,100);assert.equal(state.factor,DUCK_DEFAULTS.depth);assert.equal(state.changed,true);
  state=duckStep(state,.01,600);assert.equal(state.factor,DUCK_DEFAULTS.depth);assert.equal(state.changed,false);
  state=duckStep(state,.01,900);assert.equal(state.factor,DUCK_DEFAULTS.depth);
  state=duckStep(state,.01,100+DUCK_DEFAULTS.holdMs);assert.equal(state.factor,1);assert.equal(state.changed,true);
});
test('a breath between words does not make the level pump',()=>{
  let state={factor:1,speakingUntil:0},changes=0;
  for(const [peak,time] of [[.3,0],[.01,200],[.3,400],[.01,600],[.3,800],[.01,1000]]){state=duckStep(state,peak,time);if(state.changed)changes++;}
  assert.equal(changes,1);
});
