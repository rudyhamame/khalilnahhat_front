import { useCallback, useEffect, useRef, useState } from 'react';
import { microphoneCapture, createMicrophoneMonitor } from '../lib/microphoneAudio';

// Microphone channel state shared by the sidebar channel card and the archive controller.
export default function useMicChannel({ master, minimized, masterMeter }) {
  const [micGain, setMicGain] = useState(.75);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [monitor, setMonitor] = useState(false);
  const [notice, setNotice] = useState('');
  const [latency, setLatency] = useState(null);
  const channel = useRef(null);
  const micMeter = useRef(null);
  const generation = useRef(0);
  const settings = useRef({ master, micGain, monitor });
  useEffect(() => {
    settings.current = { master, micGain, monitor };
    const graph = channel.current;
    if (!graph) return;
    graph.gain.gain.setTargetAtTime(micGain, graph.context.currentTime, .025);
    graph.output.gain.setTargetAtTime(monitor ? master : 0, graph.context.currentTime, .025);
  }, [master, micGain, monitor]);
  const release = useCallback(() => {
    generation.current++;
    const graph = channel.current;
    channel.current = null;
    if (graph) {
      cancelAnimationFrame(graph.frame);
      clearInterval(graph.latencyTimer);
      graph.stream.getTracks().forEach(track => track.stop());
      graph.source.disconnect();
      graph.context.close().catch(() => {});
    }
    setLatency(null);
    micMeter.current?.style.setProperty('--channel-level', '0');
    masterMeter.current?.style.setProperty('--mic-level', '0');
  }, [masterMeter]);
  const stop = () => { release(); setActive(false); setPending(false); setMonitor(false); };
  useEffect(() => () => release(), [release]);
  useEffect(() => { if (minimized) { release(); setActive(false); setPending(false); setMonitor(false); } }, [minimized, release]);
  const enable = async () => {
    if (pending || active) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setNotice('Microphone access needs HTTPS or localhost.'); return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { setNotice('Audio mixing is unavailable in this browser.'); return; }
    setNotice(''); setPending(true);
    const request = ++generation.current;
    let context;
    let stream;
    try {
      // Request the minimum buffer; 'interactive' still used 512 frames here.
      context = new AudioContext({ latencyHint: 0 });
      await context.resume();
      stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneCapture({ sampleRate: context.sampleRate }), video: false });
      if (generation.current !== request) { stream.getTracks().forEach(track => track.stop()); await context.close(); return; }
      const source = context.createMediaStreamSource(stream);
      const { gain, analyser, output } = createMicrophoneMonitor(context, source, settings.current.micGain);
      const graph = { context, stream, source, gain, output, frame: 0 };
      channel.current = graph;
      // The browser's own report of its audio path; the hardware/OS floor is included in outputLatency where supported.
      const readLatency = () => setLatency({ base: context.baseLatency ?? null, output: context.outputLatency ?? null, rate: context.sampleRate });
      readLatency();
      graph.latencyTimer = setInterval(readLatency, 1000);
      const samples = new Float32Array(analyser.fftSize);
      let previous = 0;
      const tick = time => {
        if (channel.current !== graph) return;
        graph.frame = requestAnimationFrame(tick);
        if (time - previous < 40) return;
        previous = time;
        analyser.getFloatTimeDomainData(samples);
        let energy = 0; for (const sample of samples) energy += sample * sample;
        const level = Math.min(1, Math.sqrt(energy / samples.length) * 4);
        micMeter.current?.style.setProperty('--channel-level', String(level));
        masterMeter.current?.style.setProperty('--mic-level', String(settings.current.monitor ? level * settings.current.master : 0));
      };
      graph.frame = requestAnimationFrame(tick);
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (channel.current === graph) { stop(); setNotice('Microphone disconnected.'); } }, { once: true }));
      setActive(true);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      context?.close().catch(() => {});
      if (generation.current === request) setNotice(error.name === 'NotAllowedError' ? 'Microphone permission was not granted.' : error.name === 'NotFoundError' ? 'No microphone was found.' : 'Microphone could not be started.');
    } finally { if (generation.current === request) setPending(false); }
  };
  return { micGain, setMicGain, active, pending, monitor, setMonitor, notice, enable, stop, micMeter, latency };
}
