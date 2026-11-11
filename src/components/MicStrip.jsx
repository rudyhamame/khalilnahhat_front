import {useEffect,useState} from 'react';
import {Mic,MicOff} from 'lucide-react';
// A slim strip left of the landscape preview: the voice microphone, an extra input isolated from the rest.
// On/off with the mic icon, a vertical level control, and a live meter so you can see it is picking you up.
function useMeter(stream,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext){
  const [level,setLevel]=useState(0);
  useEffect(()=>{
    if(!stream||!AudioContextClass){setLevel(0);return undefined;}
    const context=new AudioContextClass(),analyser=context.createAnalyser(),source=context.createMediaStreamSource(stream);analyser.fftSize=512;source.connect(analyser);
    const data=new Uint8Array(analyser.fftSize);let frame=0,stopped=false;
    const tick=()=>{if(stopped)return;analyser.getByteTimeDomainData(data);let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value-128)/128);setLevel(previous=>peak>previous?peak:previous*.8+peak*.2);frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    return()=>{stopped=true;cancelAnimationFrame(frame);try{source.disconnect();}catch{/* Closed. */}void context.close().catch(()=>{});setLevel(0);};
  },[stream,AudioContextClass]);
  return level;
}
export default function MicStrip({on,level,stream,onToggle,onLevel,disabled}){
  const meter=Math.min(100,Math.round(useMeter(on?stream:null)*140)),percent=Math.round(level*100);
  return <aside className={`mic-strip${on?' is-on':''}`} aria-label="Voice microphone">
    <button type="button" className="ms-toggle" aria-pressed={on} disabled={disabled} onClick={onToggle} title={disabled?'Open the preview to use the voice microphone':on?'Microphone on. Click to turn it off.':'Turn the voice microphone on'} aria-label={on?'Turn the voice microphone off':'Turn the voice microphone on'}>{on?<Mic size={17} aria-hidden="true"/>:<MicOff size={17} aria-hidden="true"/>}</button>
    <div className="ms-body">
      <div className="ms-meter" role="meter" aria-label="Voice microphone level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={meter}><i style={{height:`${meter}%`}}/></div>
      <input className="ms-fader" type="range" min="0" max="2" step="0.01" value={level} disabled={disabled||!on} onChange={event=>onLevel(event.target.value)} aria-label="Voice microphone level" aria-valuetext={`${percent} percent`}/>
    </div>
    <span className="ms-value" aria-hidden="true">{on?percent:'--'}<small>%</small></span>
    <span className="ms-label">MIC</span>
  </aside>;
}
