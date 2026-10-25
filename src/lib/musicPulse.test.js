import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMusicPulse, readMusicBands, createBeatClock, createMeasureClock } from './musicPulse.js';

test('measure phase ignores pickup beats, waits for a downbeat and preserves position over a missed hit', () => {
  const clock = createMeasureClock();
  let signal;
  for (let index = 0; index <= 18; index++) {
    signal = clock.sample({ beat:true, bpm:120, confidence:1, time:index * 500, accent:index % 4 === 2 ? 1 : .2 });
    if (index < 18) assert.equal(signal.measureLocked,false);
  }
  assert.equal(signal.downbeat,true);
  assert.equal(signal.beatsFromDownbeat,0);
  for (let index = 19; index <= 34; index++) {
    if (index === 25) continue;
    signal = clock.sample({ beat:true, bpm:120, confidence:1, time:index * 500, accent:index % 4 === 2 ? 1 : .2 });
  }
  assert.equal(signal.beatsFromDownbeat,16);
  assert.equal(signal.downbeat,true);
});
test('uniform accents cannot establish the first beat of a measure', () => {
  const clock = createMeasureClock();
  for (let index = 0; index < 80; index++) {
    assert.equal(clock.sample({beat:true, bpm:120, confidence:1, time:index*500, accent:.5}).measureLocked,false);
  }
});

test('extra percussion and a drifting BPM estimate cannot bring the second switch forward', () => {
  const clock = createMeasureClock();
  for (let index = 0; index <= 16; index++) {
    clock.sample({beat:true, bpm:120, confidence:1, time:index*500, accent:index%4===0 ? 1 : .2});
  }
  // Lock at 8000 ms, then feed quarter-beat fills and a wrong faster estimate.
  const boundaries = [];
  for (let time = 8125; time <= 24000; time += 125) {
    const signal = clock.sample({beat:true, bpm:140, confidence:.4, time, accent:.4});
    if (signal.downbeat && signal.beatsFromDownbeat%16===0) boundaries.push(time);
  }
  assert.deepEqual(boundaries,[16000,24000]);
});

test('locked phrases advance when the exact boundary onset is missed', () => {
  const clock = createMeasureClock();
  for (let index = 0; index <= 16; index++) {
    clock.sample({beat:true,bpm:120,confidence:1,time:index*500,accent:index%4===0 ? 1 : .2});
  }
  const boundaries = [];
  let previousPhrase = 0;
  for (let time = 8020; time <= 24020; time += 20) {
    // Late onsets, with no onset at either photo boundary.
    const signal = clock.sample({beat:time%500===100,bpm:120,confidence:1,time,active:true});
    const phrase = Math.floor(signal.beatsFromDownbeat/16);
    if (phrase > previousPhrase) { boundaries.push(time); previousPhrase = phrase; }
  }
  assert.deepEqual(boundaries,[16000,24000]);
});

test('silence and muted audio never create a beat or visible energy', () => {
  const signal = createMusicPulse();
  for (let time = 0; time < 3000; time += 33) {
    const sample = signal.sample({ bass: time % 2, rms: 0, time });
    assert.equal(sample.beat, false); assert.equal(sample.energy, 0);
  }
  const muted = signal.sample({ bass: 1, rms: .5, volume: 0, time: 3100 });
  assert.equal(muted.beat, false); assert.equal(muted.energy, 0); assert.equal(muted.pulse, 0);
});
test('steady sustained bass does not produce fabricated repeating beats', () => {
  const signal = createMusicPulse(); let hits = 0;
  for (let time = 0; time < 3000; time += 33) if (signal.sample({ bass: .7, rms: .2, time }).beat) hits++;
  assert.equal(hits, 1);
});
test('bass onsets follow irregular musical hits and ignore rapid duplicate onsets', () => {
  const signal = createMusicPulse();
  signal.sample({ bass: 0, rms: .1, time: 0 });
  assert.equal(signal.sample({ bass: .8, rms: .2, time: 100 }).beat, true);
  signal.sample({ bass: .1, rms: .1, time: 140 });
  assert.equal(signal.sample({ bass: .9, rms: .2, time: 180 }).beat, false);
  signal.sample({ bass: .1, rms: .1, time: 700 });
  assert.equal(signal.sample({ bass: .9, rms: .3, time: 800 }).beat, true);
});
test('intensity responds to quiet/loud passages, decays after silence and stays bounded', () => {
  const low = createMusicPulse(); const high = createMusicPulse(); let quiet; let loud;
  for (let time = 0; time < 1000; time += 33) {
    quiet = low.sample({ bass: .4, rms: .02, time });
    loud = high.sample({ bass: .8, rms: .22, time });
  }
  assert.ok(loud.energy > quiet.energy * 5);
  const previous = loud.energy;
  for (let time = 1000; time < 4000; time += 33) loud = high.sample({ bass: 0, rms: 0, time });
  assert.ok(loud.energy < previous / 100);
  const bounded = high.sample({ bass: Infinity, rms: NaN, mid: -1, high: 999, time: 4100 });
  for (const name of ['energy', 'pulse', 'bass', 'mid', 'high']) assert.ok(bounded[name] >= 0 && bounded[name] <= 1, name);
});
test('frequency bands separate bass from higher-frequency energy at different sample rates', () => {
  for (const sampleRate of [44100, 48000]) {
    const data = new Uint8Array(1024);
    data[Math.round(90 * 2048 / sampleRate)] = 255;
    const bass = readMusicBands(data, sampleRate, 2048);
    assert.ok(bass.bass > 0); assert.equal(bass.mid, 0); assert.equal(bass.high, 0);
    data.fill(0); data[Math.round(6000 * 2048 / sampleRate)] = 255;
    const treble = readMusicBands(data, sampleRate, 2048);
    assert.equal(treble.bass, 0); assert.ok(treble.high > 0);
  }
});

test('tempo locks to measured 90, 120 and 150 BPM with timing jitter', () => {
  for (const bpm of [90, 120, 150]) {
    const clock = createBeatClock();
    let signal;
    for (let index = 0; index < 24; index++) signal = clock.onset(index * 60000 / bpm + (index % 3 - 1) * 8);
    assert.ok(Math.abs(signal.bpm - bpm) < 2, `${bpm}: ${signal.bpm}`);
    assert.ok(signal.confidence > .8);
    assert.equal(signal.beats, 24);
  }
});
test('locked clock rejects subdivisions, never invents missed beats and relearns tempo changes', () => {
  const clock = createBeatClock();
  for (let time = 0; time <= 5000; time += 500) clock.onset(time);
  const before = clock.state().beats;
  assert.equal(clock.onset(5250).beat, false);
  assert.equal(clock.onset(5500).beat, true);
  assert.equal(clock.onset(6500).beats, before + 2);
  let signal;
  for (let index = 1; index <= 24; index++) signal = clock.onset(6500 + index * 400);
  assert.ok(Math.abs(signal.bpm - 150) < 2);
  assert.ok(signal.confidence > .8);
  const silent = clock.expire(20000);
  assert.equal(silent.bpm, 0);
  assert.equal(silent.confidence, 0);
  assert.equal(silent.beat, false);
  assert.equal(clock.onset(21000).beat, true);
});
test('quiet midrange percussion establishes tempo without a bass kick', () => {
  const tracker = createMusicPulse();
  let signal;
  let detected = 0;
  for (let time = 0; time < 10000; time += 20) {
    const hit = time % 500 === 0;
    signal = tracker.sample({ bass: .01, mid: hit ? .18 : .01, high: hit ? .3 : .01, rms: hit ? .018 : .004, time });
    if (signal.beat) detected++;
  }
  assert.equal(detected, 20);
  assert.ok(Math.abs(signal.bpm - 120) < 1);
  assert.ok(signal.confidence > .8);
});
