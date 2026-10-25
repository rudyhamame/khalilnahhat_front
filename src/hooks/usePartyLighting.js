import { useCallback, useEffect, useRef } from 'react';
import { createMusicPulse, readMusicBands } from '../lib/musicPulse';
import { recordingBeatGrid } from '../lib/recordingBeatGrid';
import { connectEqualizer, equalizerGain, flatEqualizer } from '../lib/audioEqualizer';

export default function usePartyLighting(audioRef, enabled) {
  const lighting = useRef(null);
  const graph = useRef(null);
  const equalizer = useRef(flatEqualizer());
  const setEqualizerBand = useCallback((band, value) => {
    if (!Object.hasOwn(equalizer.current, band)) return;
    const gain = equalizerGain(value);
    equalizer.current[band] = gain;
    const current = graph.current;
    current?.filters?.[band]?.gain.setTargetAtTime(gain, current.context.currentTime, .025);
  }, []);
  const meter = useRef(null);
  const channelMeter = useRef(null);
  const player = useRef(null);
  const unlock = useCallback(() => {
    const element = audioRef.current;
    if (!element) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (graph.current?.element !== element) {
        graph.current?.context.close().catch(() => {});
        const context = new AudioContext();
        const source = context.createMediaElementSource(element);
        // Keep sound connected even if the optional analyser cannot initialise.
        source.connect(context.destination);
        graph.current = { element, context, source };
        const originalGain = context.createGain();
        const stemInput = context.createGain();
        source.connect(originalGain);
        originalGain.connect(stemInput);
        stemInput.connect(context.destination);
        source.disconnect(context.destination);
        graph.current.originalGain = originalGain;
        graph.current.stemInput = stemInput;
        let signalSource = stemInput;
        try {
          const { filters, output } = connectEqualizer(context, stemInput, equalizer.current);
          graph.current.filters = filters;
          signalSource = output;
        } catch { /* Keep the direct sound path if tone filters are unavailable. */ }
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = .3;
        signalSource.connect(analyser);
        graph.current.analyser = analyser;
      }
      graph.current.context.resume().catch(() => {});
    } catch { /* Audio playback remains available without decorative lighting. */ }
  }, [audioRef]);

  useEffect(() => {
    const element = audioRef.current;
    if (!enabled || !element) return undefined;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastFrame = 0;
    let tracker = createMusicPulse();
    let frequencies;
    let waveform;
    let running = false;
    const clear = event => {
      running = false;
      window.dispatchEvent(new CustomEvent('echo:music-frame', { detail: { playing: false, stopped: ['pause', 'ended', 'error'].includes(event?.type) } }));
      cancelAnimationFrame(frame);
      frame = 0;
      lighting.current?.classList.remove('is-playing');
      channelMeter.current?.style.setProperty('--channel-level', '0');
      player.current?.style.setProperty('--music-energy', '0');
      player.current?.style.setProperty('--music-pulse', '0');
      for (const bar of meter.current?.children || []) bar.style.setProperty('--level', '.04');
    };
    const tick = time => {
      if (!running) return;
      frame = requestAnimationFrame(tick);
      if (time - lastFrame < 32) return;
      lastFrame = time;
      const current = graph.current;
      const layer = lighting.current;
      if (!current?.analyser || current.element !== element || !layer) return;
      const analyser = current.analyser;
      frequencies ||= new Uint8Array(analyser.frequencyBinCount);
      waveform ||= new Float32Array(analyser.fftSize);
      analyser.getByteFrequencyData(frequencies);
      analyser.getFloatTimeDomainData(waveform);
      let squares = 0;
      for (const value of waveform) squares += value * value;
      const signal = tracker.sample({ ...readMusicBands(frequencies, current.context.sampleRate, analyser.fftSize), rms: Math.sqrt(squares / waveform.length), time: element.currentTime * 1000, volume: element.muted ? 0 : element.volume });
      const recordingGrid = recordingBeatGrid({trackId:element.dataset.trackId, audioUrl:element.currentSrc || element.src, time:element.currentTime});
      window.dispatchEvent(new CustomEvent('echo:music-frame', { detail: { ...signal, ...recordingGrid, playing: true, trackId: element.dataset.trackId, time: element.currentTime, audible: !element.muted && element.volume > .001 } }));
      const reduced = motion.matches;
      const strength = reduced ? Math.min(.28, signal.energy * .45) : signal.energy;
      layer.style.setProperty('--party-energy', strength.toFixed(3));
      layer.style.setProperty('--party-pulse', (reduced ? 0 : signal.pulse).toFixed(3));
      layer.style.setProperty('--party-bass', signal.bass.toFixed(3));
      layer.style.setProperty('--party-high', signal.high.toFixed(3));
      layer.style.setProperty('--party-hue', String(245 + signal.beats % 12 * 5));
      layer.style.setProperty('--party-sweep', `${reduced ? 0 : Math.sin(time / 3700) * 22}deg`);
      layer.style.setProperty('--party-cross', `${reduced ? 0 : Math.cos(time / 4900) * 28}deg`);
      layer.classList.toggle('is-playing', strength > .008);
      channelMeter.current?.style.setProperty('--channel-level', strength.toFixed(3));
      player.current?.style.setProperty('--music-energy', strength.toFixed(3));
      player.current?.style.setProperty('--music-pulse', (reduced ? 0 : signal.pulse).toFixed(3));
      const bars = meter.current?.children;
      if (bars) for (let index = 0; index < bars.length; index++) {
        const frequency = 45 * Math.pow(280, index / Math.max(1, bars.length - 1));
        const bin = Math.min(frequencies.length - 1, Math.round(frequency * analyser.fftSize / current.context.sampleRate));
        const level = reduced ? .08 : Math.max(.04, frequencies[bin] / 255 * (element.muted ? 0 : element.volume));
        bars[index].style.setProperty('--level', level.toFixed(3));
      }
    };
    const start = () => {
      if (element.paused || element.ended || document.hidden || running || !graph.current?.analyser) return;
      running = true;
      lastFrame = 0;
      frame = requestAnimationFrame(tick);
    };
    const reset = () => { clear(); tracker = createMusicPulse(); };
    const visible = () => { if (document.hidden) clear(); else start(); };
    const seek = () => { reset(); };
    element.addEventListener('playing', start);
    for (const event of ['pause', 'waiting', 'ended', 'error']) element.addEventListener(event, clear);
    element.addEventListener('loadstart', reset);
    element.addEventListener('seeking', seek);
    element.addEventListener('seeked', start);
    document.addEventListener('visibilitychange', visible);
    start();
    return () => {
      clear();
      element.removeEventListener('playing', start);
      for (const event of ['pause', 'waiting', 'ended', 'error']) element.removeEventListener(event, clear);
      element.removeEventListener('loadstart', reset);
      element.removeEventListener('seeking', seek);
      element.removeEventListener('seeked', start);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [audioRef, enabled]);

  useEffect(() => () => {
    graph.current?.source.disconnect();
    graph.current?.context.close().catch(() => {});
    graph.current = null;
  }, []);
  return { lighting, unlock, meter, player, setEqualizerBand, channelMeter, audioGraph:graph };
}

