export const VOCAL_DEFAULTS = Object.freeze({ enabled: false, key: 0, scale: 'chromatic', amount: .85, speed: 80 });
export const VOCAL_NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SCALES = { chromatic: [0,1,2,3,4,5,6,7,8,9,10,11], major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10] };
const bounded = (value, low, high, fallback) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Number(value))) : fallback;
export function normalizeVocalSettings(value = {}) {
  return { enabled: value.enabled === true, key: Math.round(bounded(value.key,0,11,0)), scale: Object.hasOwn(SCALES,value.scale) ? value.scale : 'chromatic', amount: bounded(value.amount,0,1,.85), speed: bounded(value.speed,10,300,80) };
}
export function vocalTarget(frequency, settings) {
  if (!Number.isFinite(frequency) || frequency < 65 || frequency > 1200) return null;
  const midi = 69 + 12 * Math.log2(frequency / 440);
  let target = Math.round(midi); let distance = Infinity;
  for (let candidate = Math.floor(midi) - 12; candidate <= Math.ceil(midi) + 12; candidate++) {
    if (SCALES[settings.scale].includes(((candidate - settings.key) % 12 + 12) % 12) && Math.abs(candidate-midi) < distance) { target = candidate; distance = Math.abs(candidate-midi); }
  }
  return { midi: target, frequency: 440 * 2 ** ((target - 69) / 12), cents: (target-midi)*100 };
}
export function vocalNote(midi) { return Number.isFinite(midi) ? `${VOCAL_NOTES[((Math.round(midi)%12)+12)%12]}${Math.floor(Math.round(midi)/12)-1}` : '—'; }

// YIN difference detector, downsampled to keep work bounded on the audio thread.
export function createVocalDetector(size = 2048) {
  const values = new Float32Array(size / 4);
  const difference = new Float32Array(size / 8);
  return (input, sampleRate) => {
    let mean = 0; let power = 0;
    for (let index = 0; index < values.length; index++) {
      const offset = index * 4;
      values[index] = (input[offset] + input[offset+1] + input[offset+2] + input[offset+3]) * .25;
      mean += values[index];
    }
    mean /= values.length;
    for (let index = 0; index < values.length; index++) { values[index] -= mean; power += values[index] ** 2; }
    const rms = Math.sqrt(power / values.length);
    if (!Number.isFinite(rms) || rms < .008) return null;
    const rate = sampleRate / 4;
    const min = Math.max(2, Math.floor(rate / 1100));
    const max = Math.min(difference.length-2, Math.ceil(rate / 70));
    let sum = 0; difference[0] = 1;
    for (let lag = 1; lag <= max+1; lag++) {
      let squared = 0;
      for (let index = 0; index < values.length-max-1; index++) squared += (values[index] - values[index+lag]) ** 2;
      sum += squared;
      difference[lag] = sum ? squared * lag / sum : 1;
    }
    for (let lag = min; lag <= max; lag++) {
      if (difference[lag] > .13) continue;
      while (lag < max && difference[lag+1] < difference[lag]) lag++;
      const left = difference[lag-1]; const center = difference[lag]; const right = difference[lag+1];
      const denominator = 2 * (2*center-right-left);
      const refined = lag + (denominator ? (right-left)/denominator : 0);
      const frequency = rate / refined;
      if (frequency < 70 || frequency > 1100) return null;
      return { frequency, confidence: 1-center, rms };
    }
    return null;
  };
}
