import test from 'node:test';
import assert from 'node:assert/strict';
import { createVocalDetector, normalizeVocalSettings, vocalTarget, VOCAL_DEFAULTS } from './vocalPitch.js';
import { VocalCorrectionProcessor } from './VocalCorrectionProcessor.js';

const sine = (hz, rate = 48000, length = 2048) => Float32Array.from({ length }, (_, i) => .2 * Math.sin(2 * Math.PI * hz * i / rate));
test('vocal detector follows detuned voices at common sample rates, rejects silence and noise', () => {
  const detect = createVocalDetector();
  for (const rate of [44100, 48000]) for (const hz of [110, 220, 431.2, 660, 880]) {
    const result = detect(sine(hz, rate), rate);
    assert.ok(result && Math.abs(1200 * Math.log2(result.frequency / hz)) < 12, `${rate} / ${hz}`);
  }
  assert.equal(detect(new Float32Array(2048), 48000), null);
  let seed = 12345;
  const noise = Float32Array.from({ length: 2048 }, () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - .5) * .3; });
  assert.equal(detect(noise, 48000), null);
});
test('target follows the selected root and scale, configuration stays bounded', () => {
  assert.equal(vocalTarget(431, VOCAL_DEFAULTS).midi, 69);
  const cSharp = 440 * 2 ** ((61 - 69) / 12);
  assert.equal(vocalTarget(cSharp * 1.001, { ...VOCAL_DEFAULTS, key: 0, scale: 'major' }).midi, 62);
  assert.equal(vocalTarget(cSharp, { ...VOCAL_DEFAULTS, key: 1, scale: 'major' }).midi, 61);
  assert.equal(vocalTarget(NaN, VOCAL_DEFAULTS), null);
  assert.deepEqual(normalizeVocalSettings({ key: -10, scale: 'invalid', speed: 0, amount: 2, enabled: 'yes' }), { key: 0, scale: 'chromatic', speed: 10, amount: 1, enabled: false });
});

globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {} }; } };
let Worklet;
globalThis.registerProcessor = (_, Processor) => { Worklet = Processor; };
await import('../audio/vocal-worklet.js');
test('real worklet corrects detuned tones without muting or producing invalid samples', () => {
  for (const rate of [44100, 48000]) for (const [note, cents] of [[110, -30], [220, 35], [440, -35], [440, 20], [660, 45]]) {
    globalThis.sampleRate = rate;
    const processor = new Worklet({ numberOfInputs: 1, numberOfOutputs: 1, processorOptions: { settings: { ...VOCAL_DEFAULTS, enabled: true, amount: 1, speed: 30 } } });
    const hz = note * 2 ** (cents / 1200);
    const output = new Float32Array(2048);
    for (let frame = 0; frame < Math.ceil(rate * 1.5 / 128); frame++) {
      const input = Float32Array.from({ length: 128 }, (_, i) => .2 * Math.sin(2 * Math.PI * hz * (frame * 128 + i) / rate));
      const block = new Float32Array(128);
      processor.process([[input]], [[block]], {});
      assert.ok(block.every(Number.isFinite));
      output.copyWithin(0, 128); output.set(block, 1920);
    }
    const measured = createVocalDetector()(output, rate);
    const target = vocalTarget(hz, VOCAL_DEFAULTS).frequency;
    assert.ok(measured && Math.abs(1200 * Math.log2(measured.frequency / target)) < 18, `${rate}/${hz}: ${JSON.stringify(measured)}`);
    assert.ok(measured.rms > .025, `audible output for ${hz}`);
  }
});

function setupGraph(t) {
  const connections = [];
  const original = { stop() { throw new Error('Must never stop the borrowed raw microphone'); } };
  let outputStopped = 0;
  const output = { stop() { outputStopped++; } };
  function node(label) { return { label, connect(next) { connections.push([label, next.label]); return next; }, disconnect() {}, gain: { value: 0, cancelScheduledValues() {}, setValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.value = value; } } }; }
  const destination = { ...node('stream destination'), stream: { getAudioTracks: () => [output] } };
  const context = { currentTime: 0, audioWorklet: { async addModule() {} }, createMediaStreamSource: () => node('source'), createMediaStreamDestination: () => destination, createGain: () => node('gain'), destination: node('speakers') };
  t.mock.method(globalThis, 'MediaStream', class { constructor(tracks) { this.tracks = tracks; } });
  t.mock.method(globalThis, 'AudioWorkletNode', class { constructor() { Object.assign(this, node('worklet'), { port: { postMessage() {}, close() {} } }); } });
  return { context, original, output, connections, stopped: () => outputStopped };
}
globalThis.MediaStream = class {};
globalThis.AudioWorkletNode = class {};
test('processor has a true dry bypass, routes only to broadcast output and releases owned tracks', async t => {
  const graph = setupGraph(t);
  const statuses = [];
  const processor = new VocalCorrectionProcessor(VOCAL_DEFAULTS, { workletUrl: 'test.js', onStatus: status => statuses.push(status) });
  await processor.init({ audioContext: graph.context, track: graph.original });
  assert.equal(processor.processedTrack, graph.output);
  assert.equal(processor.dry.gain.value, 1); assert.equal(processor.wet.gain.value, 0);
  processor.configure({ ...VOCAL_DEFAULTS, enabled: true });
  assert.equal(processor.dry.gain.value, 0); assert.equal(processor.wet.gain.value, 1);
  processor.node.onprocessorerror();
  assert.equal(processor.dry.gain.value, 1); assert.equal(processor.wet.gain.value, 0);
  assert.match(statuses.at(-1), /unprocessed microphone is still live/);
  assert.ok(graph.connections.every(([, target]) => target !== 'speakers'));
  await processor.destroy(); await processor.destroy();
  assert.equal(graph.stopped(), 1);
});
test('failed worklet initialization preserves the borrowed input and releases partial output', async t => {
  const graph = setupGraph(t);
  graph.context.audioWorklet.addModule = async () => { throw new Error('load failed'); };
  const processor = new VocalCorrectionProcessor(VOCAL_DEFAULTS);
  await assert.rejects(processor.init({ audioContext: graph.context, track: graph.original }), /load failed/);
  assert.equal(graph.stopped(), 0);
  await assert.rejects(processor.init({ audioContext: {}, track: graph.original }), /AudioWorklet/);
});

const { publishVocalMicrophone } = await import('./publishVocalMicrophone.js');
test('broadcast publishes processed audio once; load failure falls back to raw audio', async () => {
  for (const fail of [false, true]) {
    const events = [];
    const microphone = { kind: 'audio', async setProcessor() { events.push('process'); if (fail) throw new Error('unsupported'); }, stop() { events.push('stop'); } };
    const processor = { async destroy() { events.push('destroy'); } };
    const participant = { async createTracks() { events.push('capture'); return [microphone]; }, async publishTrack(track, options) { assert.equal(track, microphone); assert.equal(options.source, 'microphone'); events.push('publish'); return { track }; } };
    const result = await publishVocalMicrophone(participant, { audio: true, processor, onFallback: () => events.push('fallback') });
    assert.equal(result.processed, !fail);
    assert.deepEqual(events, fail ? ['capture', 'process', 'destroy', 'fallback', 'publish'] : ['capture', 'process', 'publish']);
  }
});
test('failed publication and canceled capture release the microphone without publishing stale audio', async () => {
  for (const cancel of [false, true]) {
    const events = [];
    const microphone = { kind: 'audio', async setProcessor() {}, stop() { events.push('stop'); } };
    const participant = { async createTracks() { return [microphone]; }, async publishTrack() { events.push('publish'); throw new Error('failed'); } };
    await assert.rejects(publishVocalMicrophone(participant, { audio: true, processor: { async destroy() { events.push('destroy'); } }, isCurrent: () => !cancel }));
    assert.deepEqual(events, cancel ? ['stop', 'destroy'] : ['publish', 'stop', 'destroy']);
  }
});
test('a suspended audio context cannot silently replace the raw microphone', async t => {
  const graph = setupGraph(t);
  graph.context.state = 'suspended';
  graph.context.resume = async () => {};
  const processor = new VocalCorrectionProcessor(VOCAL_DEFAULTS, { workletUrl: 'test.js' });
  await assert.rejects(processor.init({ audioContext: graph.context, track: graph.original }), /could not start/);
  assert.equal(processor.processedTrack, undefined);
  assert.equal(graph.stopped(), 0);
});
