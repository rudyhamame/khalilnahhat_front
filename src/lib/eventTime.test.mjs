import test from 'node:test';
import assert from 'node:assert/strict';
import {pickSlot} from '../lib/eventTime.mjs';
test('first click starts, second ends (also after midnight), third restarts',()=>{
  let state={start:null,end:null};
  state=pickSlot(state,18*60);assert.deepEqual(state,{start:1080,end:null});
  state=pickSlot(state,1440+60);assert.deepEqual(state,{start:1080,end:1500});
  state=pickSlot(state,600);assert.deepEqual(state,{start:600,end:null});
  state=pickSlot(state,540);assert.deepEqual(state,{start:540,end:null});
});
