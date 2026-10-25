import test from 'node:test';
import assert from 'node:assert/strict';
import { connectEqualizer, EQUALIZER_BANDS, flatEqualizer, equalizerGain } from './audioEqualizer.js';
test('seven real frequency filters replace the direct path with one serial path', () => {
  const destination = {};
  const source = { connections: [destination], connect(node) { this.connections.push(node); }, disconnect(node) { this.connections = this.connections.filter(value => value !== node); } };
  const context = { sampleRate: 48000, destination, createBiquadFilter: () => ({ frequency: {}, gain: {}, Q: {}, connections: [], connect(node) { this.connections.push(node); } }) };
  const result = connectEqualizer(context, source, { ...flatEqualizer(), sub: 6, air: -4 });
  const nodes = Object.values(result.filters);
  assert.equal(nodes.length, 7);
  assert.deepEqual(source.connections, [nodes[0]]);
  nodes.forEach((node, index) => assert.deepEqual(node.connections, [nodes[index + 1] || destination]));
  assert.equal(result.filters.sub.gain.value, 6);
  assert.equal(result.filters.air.gain.value, -4);
  assert.equal(result.output, nodes.at(-1));
  assert.deepEqual(nodes.map(node => node.frequency.value), EQUALIZER_BANDS.map(band => band.frequency));
});
test('flat tone starts at zero and gain rejects non-finite values and overdrive requests', () => {
  assert.ok(Object.values(flatEqualizer()).every(value => value === 0));
  assert.equal(equalizerGain(NaN), 0);
  assert.equal(equalizerGain(30), 12);
  assert.equal(equalizerGain(-30), -12);
});
