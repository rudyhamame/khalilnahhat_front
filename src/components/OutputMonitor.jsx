import {Headphones,HeadphoneOff} from 'lucide-react';
import {useOutputMonitor} from '../hooks/useOutputMonitor';
import {formatDb,meterPosition,segmentTone} from '../lib/meterScale';
const SEGMENTS=24,SCALE=[[0,'0'],[-6,'6'],[-12,'12'],[-24,'24'],[-48,'48']];
// A slim, pro-style strip left of the preview: segmented dB meter with peak hold and clip lamp, scale, monitor fader and a listen switch.
export default function OutputMonitor({track}){
  const monitor=useOutputMonitor(track),position=meterPosition(monitor.level),hold=meterPosition(monitor.peak),lit=Math.round(position*SEGMENTS),holdSegment=Math.min(SEGMENTS-1,Math.round(hold*SEGMENTS)-1);
  const percent=Math.round(monitor.volume*100);
  return <aside className={`output-monitor${monitor.muted?' is-muted':''}${monitor.active?'':' is-idle'}`} aria-label="Live output monitor">
    <button type="button" className={`om-clip${monitor.clip?' is-on':''}`} title="Clip: the output reached full scale. Click to clear." aria-label="Clip indicator" tabIndex={-1} onClick={event=>event.currentTarget.blur()}/>
    <div className="om-readout" aria-hidden="true">{monitor.active?formatDb(monitor.peak):'--'}<small>dB</small></div>
    <div className="om-body">
      <div className="om-scale" aria-hidden="true">{SCALE.map(([db,label])=><span key={db} style={{bottom:`${meterPosition(Math.pow(10,db/20))*100}%`}}>{label}</span>)}</div>
      <div className="om-meter" role="meter" aria-label="Live output level (dB)" aria-valuemin="-60" aria-valuemax="0" aria-valuenow={Math.round(-60+position*60)}>
        {Array.from({length:SEGMENTS},(_,index)=>{const place=(index+1)/SEGMENTS;return <i key={index} className={`om-seg is-${segmentTone(place)}${index<lit?' is-lit':''}${index===holdSegment&&monitor.active?' is-hold':''}`}/>;})}
      </div>
      <div className="om-fader-wrap"><input className="om-fader" type="range" min="0" max="1" step="0.01" value={monitor.volume} disabled={!monitor.active} onChange={event=>monitor.setVolume(event.target.value)} aria-label="Monitor level" aria-valuetext={`${percent} percent`} title={`Monitor level ${percent}%`}/></div>
    </div>
    <div className="om-vol" aria-hidden="true">{percent}<small>%</small></div>
    <button type="button" className="om-toggle" disabled={!monitor.active} aria-pressed={!monitor.muted} onClick={monitor.toggleMute} title={monitor.active?(monitor.muted?'Listen to the live output (use headphones)':'Stop listening'):'Open the preview to monitor the output'} aria-label={monitor.muted?'Listen to the live output':'Mute the live output monitor'}>{monitor.muted?<HeadphoneOff size={16} aria-hidden="true"/>:<Headphones size={16} aria-hidden="true"/>}</button>
    <span className="om-label">OUT</span>
  </aside>;
}
