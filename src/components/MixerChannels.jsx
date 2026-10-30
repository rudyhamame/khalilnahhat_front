import { useId } from 'react';
import useMicChannel from '../hooks/useMicChannel';
import VocalCorrectionControl from './VocalCorrectionControl';
import StemChannels, { StemChannelControls } from './StemChannels';
import { Headphones, Mic, MicOff } from 'lucide-react';

export default function MixerChannels({ master, onMasterChange, masterMeter, minimized, masterDisabled = false, stems, inlineMonitor = false }) {
  const headingId=useId();
  const { micGain, setMicGain, active, pending, monitor, setMonitor, notice, enable, stop, micMeter, latency } = useMicChannel({ master, minimized, masterMeter });
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
    {active && latency && <p className="echo-mic-help" role="status" aria-label="Browser audio latency">{(() => { const ms = value => value == null ? 'n/a' : `${(value * 1000).toFixed(1)} ms`; const total = latency.base == null && latency.output == null ? null : (latency.base || 0) + (latency.output || 0); return `Browser latency: ${ms(total)} (buffer ${ms(latency.base)} + output ${ms(latency.output)}) · ${latency.rate} Hz`; })()}</p>}
    {notice && <p className="echo-channel-notice" role="status">{notice}</p>}
  </section>;
}
