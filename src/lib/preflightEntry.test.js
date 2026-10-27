import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enterAfterPreflight } from './preflightEntry.js';

for (const [name, audio] of [
  ['blocked autoplay', { play: () => Promise.reject(new Error('NotAllowedError')) }],
  ['stalled audio', { play: () => new Promise(() => {}) }],
  ['missing audio', null],
  ['synchronous audio failure', { play: () => { throw new Error('unavailable'); } }],
  ['working audio', { play: () => Promise.resolve() }],
]) {
  test(`preflight enters immediately with ${name}`, async () => {
    let entered = 0;
    enterAfterPreflight(audio, () => { entered++; });
    assert.equal(entered, 1);
    await Promise.resolve();
    assert.equal(entered, 1);
  });
}
