import { normalizeVocalSettings } from './vocalPitch.js';

const modules = new WeakMap();
// A LiveKit processor: the output goes only to the published microphone track.
export class VocalCorrectionProcessor {
  name = 'echo-vocal-correction';
  constructor(settings, { onStatus = () => {}, onPitch = () => {}, workletUrl } = {}) {
    this.workletUrl = workletUrl;
    this.settings = normalizeVocalSettings(settings);
    this.onStatus = onStatus;
    this.onPitch = onPitch;
  }
  async init({ audioContext, track }) {
    this.context = audioContext;
    if (!audioContext?.audioWorklet) throw new Error('Pitch correction needs a browser with AudioWorklet support and HTTPS or localhost.');
    try {
      if (!modules.has(audioContext)) {
        const pending = audioContext.audioWorklet.addModule(this.workletUrl).catch(error => { modules.delete(audioContext); throw error; });
        modules.set(audioContext, pending);
      }
      await modules.get(audioContext);
      if (audioContext.state === 'suspended') {
        await Promise.race([audioContext.resume(), new Promise(resolve => setTimeout(resolve, 250))]);
        if (audioContext.state !== 'running') throw new Error('Audio processing could not start.');
      }
      if (this.disposed) throw new Error('Microphone processing was closed.');
      this.source = audioContext.createMediaStreamSource(new MediaStream([track]));
      this.destination = audioContext.createMediaStreamDestination();
      this.dry = audioContext.createGain();
      this.wet = audioContext.createGain();
      this.node = new AudioWorkletNode(audioContext, 'echo-vocal-correction', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1,
        channelCountMode: 'explicit', processorOptions: { settings: this.settings },
      });
      this.source.connect(this.dry).connect(this.destination);
      this.source.connect(this.node).connect(this.wet).connect(this.destination);
      this.node.port.onmessage = event => this.onPitch(event.data);
      this.node.onprocessorerror = () => {
        this.failed = true;
        this.dry.gain.setValueAtTime(1, audioContext.currentTime);
        this.wet.gain.setValueAtTime(0, audioContext.currentTime);
        this.onStatus('Pitch correction stopped. Your unprocessed microphone is still live.');
      };
      this.processedTrack = this.destination.stream.getAudioTracks()[0];
      this.configure(this.settings, true);
    } catch (error) { await this.destroy(); throw error; }
  }
  configure(settings, immediate = false) {
    this.settings = normalizeVocalSettings(settings);
    if (!this.node || this.failed) return;
    this.node.port.postMessage(this.settings);
    const enabled = this.settings.enabled;
    for (const [parameter, value] of [[this.dry.gain, enabled ? 0 : 1], [this.wet.gain, enabled ? 1 : 0]]) {
      parameter.cancelScheduledValues(this.context.currentTime);
      if (immediate) parameter.setValueAtTime(value, this.context.currentTime);
      else parameter.setTargetAtTime(value, this.context.currentTime, .015);
    }
    this.onStatus(enabled ? 'Pitch correction is active on your live microphone.' : 'Live microphone: pitch correction is off.');
  }
  async restart(options) { await this.destroy(); this.disposed = false; this.failed = false; await this.init(options); }
  async destroy() {
    this.disposed = true;
    if (this.node) { this.node.port.onmessage = null; this.node.onprocessorerror = null; this.node.port.close(); }
    for (const node of [this.source, this.node, this.dry, this.wet]) node?.disconnect();
    this.processedTrack?.stop();
    this.source = this.node = this.dry = this.wet = this.destination = undefined;
    this.processedTrack = undefined;
  }
}
