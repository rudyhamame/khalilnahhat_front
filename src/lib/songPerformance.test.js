import test from 'node:test';
import assert from 'node:assert/strict';
import { performancePose, preparePerformer } from './songPerformance.js';
import { createMusicPulse } from './musicPulse.js';
const profile = { trackId: 'test', beatsFromDownbeat: Array.from({ length: 1024 }, (_, i) => i * .5), energy: Array(1600).fill(.8), energyStep: .1, energyLoud: .7 };
const frame = time => ({ trackId: 'test', time, playing: true, measureLocked: true, energy: .5 });
test('audio onsets drive a new photo only at the 16th, 32nd and 48th detected beat', () => {
  const detector = createMusicPulse();
  let previous = 6;
  const changes = [];
  for (let time = 0; time < 40000; time += 20) {
    const hit = time % 500 === 0;
    const accent = (time / 500) % 4 === 2 ? .9 : .3;
    const signal = detector.sample({ bass: hit ? accent : .01, rms: hit ? .2 : .004, time });
    const pose = performancePose(profile, { ...signal, playing:true, time:time / 1000, trackId:'test' });
    if (pose !== previous) {
      assert.equal(signal.beat,true);
      assert.equal(signal.downbeat,true);
      changes.push(signal.beatsFromDownbeat);
      previous = pose;
    }
  }
  assert.deepEqual(changes,[16,32,48]);
});
test('unlocked measure never switches photos even after many detected hits', () => {
  assert.equal(performancePose(profile, {...frame(100), measureLocked:false, beatsFromDownbeat:64}),6);
});
test('all songs use detected beats, never an old map or elapsed playhead', () => {
  assert.deepEqual([0,8,16,24].map(time => performancePose(profile, frame(time))), [6,6,6,6]);
  performancePose(profile, frame(20));
  assert.equal(performancePose(profile, {...frame(8), beatsFromDownbeat:16}), 8);
  assert.equal(performancePose(profile, {...frame(1), playing:false}), 0);
  assert.equal(performancePose(profile, {...frame(1), audible:false, beatsFromDownbeat:16}), 8);
  assert.equal(performancePose(profile, {...frame(1), trackId:'other'}), 6);
});
test('imported songs follow live measured onsets without needing the test track map', () => {
  const imported = { ...frame(10), trackId: 'youtube-import' };
  assert.deepEqual([0, 16, 32, 48].map(beats => performancePose(profile, { ...imported, measureLocked: true, beatsFromDownbeat: beats })), [6, 8, 9, 10]);
  for (const beats of Array.from({ length: 16 }, (_, i) => 16 + i)) assert.equal(performancePose(profile, { ...imported, measureLocked: true, beatsFromDownbeat: beats }), 8);
  // Elapsed playback alone never fabricates a beat or changes the held gesture.
  assert.equal(performancePose(profile, { ...imported, time: 100, beatsFromDownbeat: 16 }), 8);
  for (const stop of [{ playing: false }]) {
    assert.equal(performancePose(profile, { ...imported, beatsFromDownbeat: 24, ...stop }), 0);
  }
  assert.equal(performancePose(profile, { ...imported, beatsFromDownbeat: NaN }), 6);
});
test('photo holds for every full group and changes exactly on beats 16, 32 and 48', () => {
  const poses = [6,8,9,10];
  for (let beats = 0; beats < 64; beats++) {
    assert.equal(performancePose(profile,{...frame(beats * .5), measureLocked: true, beatsFromDownbeat: beats}), poses[Math.floor(beats / 16)]);
  }
});
test('quiet passages and muting hold the current photo instead of causing off-beat changes', () => {
  for (const energy of [0,.001,.01,.8]) {
    assert.equal(performancePose(profile, {...frame(128), beatsFromDownbeat:20, energy}),8);
  }
});
test('audio admission waits for matching headphones completion; cancellation rejects stale completion', async () => {
  const target = new EventTarget();
  const documentRoot = { querySelector: () => true };
  let id;
  target.addEventListener('echo:performer-prepare', event => { id = event.detail.requestId; });
  let completed = false;
  const promise = preparePerformer({target, documentRoot}).then(result => {completed = true; return result;});
  await Promise.resolve();
  assert.equal(completed,false);
  target.dispatchEvent(new CustomEvent('echo:performer-ready',{detail:{requestId:'stale'}}));
  await Promise.resolve(); assert.equal(completed,false);
  target.dispatchEvent(new CustomEvent('echo:performer-ready',{detail:{requestId:id}}));
  assert.equal(await promise,true);
  const controller = new AbortController();
  const canceled = preparePerformer({target, documentRoot, signal:controller.signal});
  controller.abort();
  target.dispatchEvent(new CustomEvent('echo:performer-ready',{detail:{requestId:id}}));
  assert.equal(await canceled,false);
});
