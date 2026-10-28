import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { microphoneCapture, createMicrophoneMonitor } from '../lib/microphoneAudio';
import VocalCorrectionControl from './VocalCorrectionControl';
import StemChannels, { StemChannelControls } from './StemChannels';
import { Headphones, Mic, MicOff } from 'lucide-react';

export default function MixerChannels({ master, onMasterChange, masterMeter, minimized, masterDisabled = false, stems, inlineMonitor = false }) {
  const headingId=useId();
  const [micGain, setMicGain] = useState(.75);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [monitor, setMonitor] = useState(false);
  const [notice, setNotice] = useState('');
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
      graph.stream.getTracks().forEach(track => track.stop());
      graph.source.disconnect();
      graph.context.close().catch(() => {});
    }
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
  return <section className="echo-audio-channel-card" aria-labelledby={headingId}>
    <header><span>OUTPUT / INPUT</span><h2 id={headingId}>Channels</h2></header>
    {stems && <StemChannelControls stems={stems} />}
    <div className={`echo-channel-strips${stems ? ' has-stems' : ''}`}>
      <div className="echo-channel-strip"><h3>Master</h3><div className="echo-channel-fader"><div className="echo-channel-meter" ref={masterMeter} aria-hidden="true"><i /></div><input type="range" min="0" max="1" step=".01" value={master} disabled={masterDisabled} onChange={event => onMasterChange(Number(event.target.value))} aria-label="Master channel volume" aria-orientation="vertical" /><span className="echo-channel-scale" aria-hidden="true">100<br />75<br />50<br />25<br />0</span></div><output>{Math.round(master * 100)}<small>%</small></output><button type="button" className="echo-channel-master-mute" disabled={masterDisabled} onClick={() => onMasterChange(master ? 0 : .75)} aria-label={master ? 'Mute master channel' : 'Unmute master channel'} aria-pressed={!master}>{master ? 'ON' : 'MUTE'}</button></div>
      <div className="echo-channel-strip"><h3>Mic <VocalCorrectionControl /></h3><div className="echo-channel-fader"><div className="echo-channel-meter" ref={micMeter} aria-hidden="true"><i /></div><input type="range" min="0" max="1" step=".01" value={micGain} onChange={event => setMicGain(Number(event.target.value))} aria-label="Microphone channel gain" aria-orientation="vertical" /><span className="echo-channel-scale" aria-hidden="true">100<br />75<br />50<br />25<br />0</span></div><output>{Math.round(micGain * 100)}<small>%</small></output><div className="echo-mic-actions"><button type="button" className={`echo-mic-enable${active ? ' is-active' : ''}`} disabled={pending} onClick={active ? stop : enable} aria-label={active ? 'Disable browser microphone' : 'Enable browser microphone'} aria-pressed={active}>{active ? <Mic size={12} /> : <MicOff size={12} />}{!inlineMonitor&&<span>{pending ? '…' : active ? 'ON' : 'OFF'}</span>}</button>{inlineMonitor&&<button type="button" className="echo-mic-monitor-inline" disabled={!active} onClick={() => setMonitor(value => !value)} aria-label={monitor ? 'Turn microphone monitoring off' : 'Monitor microphone'} title={monitor ? 'Monitoring on' : 'Monitor mic'} aria-pressed={monitor}><Headphones size={12}/></button>}</div></div>
      {stems && <StemChannels stems={stems} />}
    </div>
    {!inlineMonitor&&<button type="button" className="echo-mic-monitor" disabled={!active} onClick={() => setMonitor(value => !value)} aria-pressed={monitor}><Headphones size={13} /><span>{monitor ? 'Monitoring on' : 'Monitor mic'}</span></button>}
    <p className="echo-mic-help">{active ? 'Use headphones for monitoring. Closing the sidebar stops the mic.' : 'Mic stays off until you enable it.'}</p>
    {notice && <p className="echo-channel-notice" role="status">{notice}</p>}
  </section>;
}
