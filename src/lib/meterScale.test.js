import test from 'node:test';import assert from 'node:assert/strict';
import {formatDb,meterPosition,segmentTone,toDb} from './meterScale.js';
test('amplitude maps to decibels and to a 0..1 meter position',()=>{
  assert.equal(toDb(1),0);assert.equal(Math.round(toDb(.5)*10)/10,-6);assert.equal(toDb(0),-Infinity);
  assert.equal(meterPosition(1),1);assert.equal(meterPosition(0),0);assert.equal(meterPosition(.001),0);assert.equal(Math.round(meterPosition(.5)*100),90);
});
test('readout and segment colours follow decibels',()=>{
  assert.equal(formatDb(0),'-∞');assert.equal(formatDb(1),'0.0');assert.equal(formatDb(.5),'-6.0');
  assert.equal(segmentTone(1),'hot');assert.equal(segmentTone(meterPosition(.5)),'warm');assert.equal(segmentTone(meterPosition(.1)),'ok');
});
