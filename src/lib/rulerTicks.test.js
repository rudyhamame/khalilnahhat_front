import test from 'node:test';import assert from 'node:assert/strict';
import {rulerTicks} from './rulerTicks.js';
test('ruler ticks are in output pixels, from 0 to the full length, with labelled major ticks',()=>{
  const {step,ticks}=rulerTicks(1280);assert.equal(step,160);assert.equal(ticks[0].value,0);assert.equal(ticks.at(-1).value,1280);assert.equal(ticks.at(-1).percent,100);
  assert.deepEqual(ticks.filter(tick=>tick.major).map(tick=>tick.value),[0,160,320,480,640,800,960,1120,1280]);
});
test('every picture length gets about eight major ticks',()=>{
  for(const length of [720,1280,1920,1080,640,360])assert.ok(rulerTicks(length).ticks.filter(tick=>tick.major).length<=9,String(length));
});
