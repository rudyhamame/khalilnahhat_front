const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// Estimate a 4/4 bar phase from recurring low-frequency accents across measures.
// An isolated loud hit is insufficient: ambiguous rhythms remain unlocked.
export function createMeasureClock() {
  let history = [];
  let lastTime;
  let position = -1;
  let phase = null;
  let origin = null;
  let originTime;
  let lockedPeriod;
  let beatsFromDownbeat = 0;
  return {
    sample({ beat, bpm, confidence, time, accent = 0, active = true }) {
      if (lastTime !== undefined && time - lastTime > 2500) {
        history = []; lastTime = undefined; position = -1; phase = null; origin = null;
        originTime = undefined; lockedPeriod = undefined; beatsFromDownbeat = 0;
      }
      let downbeat = false;
      if (origin !== null) {
        // Once locked, follow the audio playhead every frame. Requiring another
        // transient exactly at the boundary can miss it and freeze the photos.
        if (beat) lastTime = time;
        const elapsedBeats = (time - originTime) / lockedPeriod;
        const gridBeat = Math.floor(elapsedBeats + 1e-6);
        if (active && gridBeat > beatsFromDownbeat) {
          downbeat = Math.floor(gridBeat / 4) > Math.floor(beatsFromDownbeat / 4);
          beatsFromDownbeat = gridBeat;
        }
        return { measureLocked:true, downbeat, beatsFromDownbeat };
      }
      if (beat) {
        const period = bpm > 0 ? 60000 / bpm : 0;
        // Preserve musical position across an unobserved beat once tempo is known.
        position += lastTime === undefined || !period ? 1 : Math.max(1, Math.round((time - lastTime) / period));
        lastTime = time;
        history.push({ position, accent });
        history = history.filter(hit => hit.position > position - 24);
        if (phase === null && confidence >= .6 && history.length >= 16) {
          const scores = Array.from({ length: 4 }, (_, slot) => {
            const hits = history.filter(hit => hit.position % 4 === slot);
            return { slot, hits: hits.length, score: hits.reduce((sum, hit) => sum + hit.accent, 0) / Math.max(1, hits.length) };
          }).sort((a, b) => b.score - a.score);
          if (scores.every(score => score.hits >= 3) && scores[0].score > .02 && scores[0].score > scores[1].score * 1.2) {
            phase = scores[0].slot;
          }
        }
        downbeat = phase !== null && position % 4 === phase;
        // Start on the next observed first beat of a measure after phase lock.
        if (downbeat && origin === null) {
          origin = position;
          originTime = time;
          lockedPeriod = period;
        }
        if (origin !== null) beatsFromDownbeat = position - origin;
      }
      return { measureLocked: origin !== null, downbeat, beatsFromDownbeat };
    },
  };
}

// Infer a pulse from recent onsets. Tempo is an estimate, not a time-signature
// or downbeat claim. Never run a free clock through silence or sustained tones.
export function createBeatClock() {
  let previousOnset;
  let lastBeat = -Infinity;
  let intervals = [];
  let period = 0;
  let confidence = 0;
  let beats = 0;
  return {
    onset(time) {
      if (previousOnset !== undefined && time - previousOnset > 2500) {
        intervals = []; period = 0; confidence = 0;
      }
      if (previousOnset !== undefined && time - previousOnset < 180) return this.state(false);
      if (previousOnset !== undefined) {
        let interval = time - previousOnset;
        // Fold subdivisions and occasional missed hits into a practical DJ range.
        while (interval < 60000 / 180) interval *= 2;
        while (interval > 60000 / 70) interval /= 2;
        intervals.push(interval);
        if (intervals.length > 9) intervals.shift();
        const candidate = median(intervals);
        const support = intervals.filter(value => Math.abs(value - candidate) < candidate * .12);
        confidence = support.length / intervals.length * Math.min(1, intervals.length / 5);
        if (support.length >= 3 && confidence >= .6) period = support.reduce((a, b) => a + b, 0) / support.length;
      }
      previousOnset = time;
      const elapsed = time - lastBeat;
      const steps = period ? Math.max(1, Math.round(elapsed / period)) : 1;
      // Once locked, reject off-grid fills/subdivisions. A new consistent tempo
      // updates the recent-interval estimate, allowing the clock to relock.
      const aligned = !period || confidence < .6 || !Number.isFinite(lastBeat)
        || (elapsed >= period * .65 && Math.abs(elapsed - steps * period) <= period * .22);
      if (!aligned) return this.state(false);
      // Count only this detected hit; missing audio evidence cannot add beats.
      beats += 1;
      lastBeat = time;
      return this.state(true);
    },
    state(beat = false) { return { beat, beats, bpm: period ? 60000 / period : 0, confidence }; },
    expire(time) {
      if (previousOnset !== undefined && time - previousOnset > 2500) {
        intervals = []; period = 0; confidence = 0; previousOnset = undefined; lastBeat = -Infinity;
      }
      return this.state();
    },
  };
}

// Adaptive positive spectral flux across bass, body and treble. A soft song
// gets its own onset floor; constant energy is never treated as repeated beats.
export function createMusicPulse() {
  let previousBands = [0, 0, 0];
  let onsetFloor = 0;
  let energy = 0;
  let pulse = 0;
  let previousTime;
  const clock = createBeatClock();
  const measures = createMeasureClock();
  return {
    sample({ bass, rms, mid = 0, high = 0, time, volume = 1 }) {
      const elapsed = previousTime === undefined ? 33 : Math.max(1, Math.min(100, time - previousTime));
      previousTime = time;
      const bands = [clamp(bass), clamp(mid), clamp(high)];
      const audible = clamp(volume);
      const rawEnergy = clamp(rms * 4) * audible;
      const flux = bands.map((value, index) => Math.max(0, value - previousBands[index]));
      // Bass anchors the beat, while midrange percussion can carry lighter songs.
      const onset = flux[0] + flux[1] * .55 + flux[2] * .15;
      const candidate = rawEnergy > .015 && Math.max(bands[0], bands[1]) > .045
        && onset > Math.max(.018, onsetFloor * 1.8);
      const signal = candidate ? clock.onset(time) : clock.expire(time);
      const measure = measures.sample({ ...signal, time, active: rawEnergy > .015, accent: flux[0] + flux[1] * .25 });
      onsetFloor += (onset - onsetFloor) * (1 - Math.exp(-elapsed / 1400));
      previousBands = bands;
      energy += (rawEnergy - energy) * (1 - Math.exp(-elapsed / (rawEnergy > energy ? 65 : 320)));
      pulse *= Math.exp(-elapsed / 210);
      if (signal.beat) pulse = Math.min(1, rawEnergy * 1.4);
      if (!audible) { energy = 0; pulse = 0; }
      return { energy: clamp(energy), pulse: clamp(pulse), bass: bands[0] * audible, mid: bands[1] * audible, high: bands[2] * audible, ...signal, ...measure };
    },
  };
}

export function readMusicBands(frequencies, sampleRate, fftSize) {
  const average = (low, high) => {
    const start = Math.max(1, Math.ceil(low * fftSize / sampleRate));
    const end = Math.min(frequencies.length - 1, Math.floor(high * fftSize / sampleRate));
    if (end < start) return 0;
    let sum = 0;
    for (let index = start; index <= end; index++) sum += frequencies[index];
    return sum / ((end - start + 1) * 255);
  };
  return { bass: average(40, 180), mid: average(180, 2400), high: average(2400, 12000) };
}
