import test from 'node:test';import assert from 'node:assert/strict';
import {effectiveFormat,formatAllows,formatBlockedReason,normalizeFormat} from './outputFormat.js';
test('two sources always send both outputs; one source follows the choice',()=>{assert.equal(effectiveFormat(2,'portrait'),'both');assert.equal(effectiveFormat(1,'portrait'),'portrait');assert.equal(normalizeFormat('nonsense'),'both');});
test('destinations follow the orientation they send',()=>{
  assert.equal(formatAllows('landscape','youtube'),true);assert.equal(formatAllows('landscape','instagram'),false);assert.equal(formatAllows('landscape','tiktok'),false);
  assert.equal(formatAllows('portrait','youtube'),false);assert.equal(formatAllows('portrait','tiktok'),true);assert.equal(formatAllows('both','instagram'),true);
  assert.match(formatBlockedReason('landscape','tiktok'),/Landscape only/);assert.equal(formatBlockedReason('both','tiktok'),'');
});
