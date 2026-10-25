import OLAProcessor from './vendor/phaze/ola-processor.js';
import FFT from 'fft.js';
import { VOCAL_DEFAULTS, normalizeVocalSettings, createVocalDetector, vocalTarget } from '../lib/vocalPitch.js';

class VocalCorrectionWorklet extends OLAProcessor {
  constructor(options) {
    const settings = options.processorOptions?.settings;
    options.processorOptions = { blockSize: 2048 };
    super(options);
    this.fft = new FFT(this.blockSize);
    this.spectrum = this.fft.createComplexArray();
    this.shifted = this.fft.createComplexArray();
    this.inverse = this.fft.createComplexArray();
    this.window = Float32Array.from({length:this.blockSize},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/this.blockSize));
    this.previousPhase = new Float64Array(this.blockSize/2+1);
    this.phase = new Float64Array(this.previousPhase.length);
    this.magnitude = new Float64Array(this.previousPhase.length);
    this.frequency = new Float64Array(this.previousPhase.length);
    this.settings = normalizeVocalSettings(settings || VOCAL_DEFAULTS);
    this.detect = createVocalDetector(this.blockSize);
    this.pitch = null;
    this.factor = new Float32Array([1]);
    this.targetSemitones = 0;
    this.semitones = 0;
    this.frames = 0;
    this.port.onmessage = event => { this.settings = normalizeVocalSettings(event.data); };
  }
  processOLA(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (!input) { for (const channels of outputs) for (const output of channels) output.fill(0); return; }
    if (!this.settings.enabled) {
      for (let i=0;i<outputs.length;i++) for (let j=0;j<outputs[i].length;j++) outputs[i][j].set(inputs[i]?.[j] || input);
      this.targetSemitones = 0; this.semitones = 0;
      return;
    }
    if (this.frames++ % 8 === 0) {
      this.pitch = this.detect(input, sampleRate);
      const target = this.pitch ? vocalTarget(this.pitch.frequency,this.settings) : null;
      this.targetSemitones = target ? Math.max(-2,Math.min(2,target.cents/100))*this.settings.amount : 0;
      if (this.frames % 64 === 1) this.port.postMessage({ frequency:this.pitch?.frequency || 0, targetMidi:target?.midi ?? null, cents:target?.cents || 0, confidence:this.pitch?.confidence || 0 });
    }
    this.semitones += (this.targetSemitones-this.semitones) * (1-Math.exp(-this.hopSize / (sampleRate * this.settings.speed / 1000)));
    this.factor[0] = 2 ** (this.semitones / 12);
    // Estimate true bin frequencies from phase advance, then resynthesise at
    // fractional target frequencies. This retains sub-semitone precision.
    for(let i=0;i<input.length;i++) input[i] *= this.window[i];
    this.fft.realTransform(this.spectrum,input);
    this.magnitude.fill(0); this.frequency.fill(0); this.shifted.fill(0);
    const advance = 2*Math.PI*this.hopSize/this.blockSize;
    for(let bin=0;bin<this.previousPhase.length;bin++) {
      const real=this.spectrum[bin*2], imaginary=this.spectrum[bin*2+1];
      const magnitude=Math.hypot(real,imaginary), angle=Math.atan2(imaginary,real);
      let delta=angle-this.previousPhase[bin]-bin*advance;
      this.previousPhase[bin]=angle;
      delta-=2*Math.PI*Math.round(delta/(2*Math.PI));
      const frequency=(bin+delta/advance)*this.factor[0];
      const destination=Math.round(bin*this.factor[0]);
      if(destination>=this.magnitude.length) continue;
      this.magnitude[destination]+=magnitude;
      this.frequency[destination]+=magnitude*frequency;
    }
    for(let bin=0;bin<this.magnitude.length;bin++) {
      if(!this.magnitude[bin]) continue;
      this.phase[bin]=(this.phase[bin]+advance*this.frequency[bin]/this.magnitude[bin])%(2*Math.PI);
      this.shifted[bin*2]=this.magnitude[bin]*Math.cos(this.phase[bin]);
      this.shifted[bin*2+1]=this.magnitude[bin]*Math.sin(this.phase[bin]);
    }
    this.fft.completeSpectrum(this.shifted);
    this.fft.inverseTransform(this.inverse,this.shifted);
    for(const channels of outputs) for(const output of channels) {
      for(let i=0;i<output.length;i++) output[i]=this.inverse[i*2]*this.window[i]*8/3;
    }
  }
}
registerProcessor('echo-vocal-correction',VocalCorrectionWorklet);
