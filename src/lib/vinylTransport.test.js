import test from 'node:test';
import assert from 'node:assert/strict';
import { recordTurnDelta, recordSeekTime } from './vinylTransport.js';
test('record dragging crosses the angle seam without jumping or reversing', () => {
  const radians = degrees => degrees * Math.PI / 180;
  assert.ok(Math.abs(recordTurnDelta(radians(179), radians(-179)) - radians(2)) < 1e-9);
  assert.ok(Math.abs(recordTurnDelta(radians(-179), radians(179)) - radians(-2)) < 1e-9);
});
test('vinyl seeking maps one rotation to 30 seconds and stays inside the track', () => {
  assert.equal(recordSeekTime(10, Math.PI * 2, 100), 40);
  assert.equal(recordSeekTime(10, -Math.PI * 2, 100), 0);
  assert.equal(recordSeekTime(90, Math.PI * 2, 100), 100);
  assert.equal(recordSeekTime(0, 1, NaN), 0);
});
