import test from 'node:test';
import assert from 'node:assert/strict';
import {pickSlot,slotInside} from './eventTime.mjs';
test('start, end (wrapping past midnight), clear and restart',()=>{
  let state={start:null,end:null};
  state=pickSlot(state,18*60);assert.deepEqual(state,{start:1080,end:null});
  state=pickSlot(state,60);assert.deepEqual(state,{start:1080,end:1500});
  state=pickSlot(state,600);assert.deepEqual(state,{start:600,end:null});
  state=pickSlot(state,600);assert.deepEqual(state,{start:null,end:null});
  state=pickSlot({start:600,end:null},1200);assert.deepEqual(state,{start:600,end:1200});
});
test('range membership wraps around midnight',()=>{
  assert.equal(slotInside(690,600,1200),true);assert.equal(slotInside(1200,600,1200),false);
  assert.equal(slotInside(1380,1080,1500),true);assert.equal(slotInside(30,1080,1500),true);assert.equal(slotInside(60,1080,1500),false);assert.equal(slotInside(600,1080,1500),false);
});
