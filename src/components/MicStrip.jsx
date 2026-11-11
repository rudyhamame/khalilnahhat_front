import {useEffect,useState} from 'react';
import {Mic,MicOff,AudioLines} from 'lucide-react';
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
export default function MicStrip({on,level,stream,onToggle,onLevel,disabled,master=1,onMaster,auto=false,onAuto,ducking=false}){
  const meter=Math.min(100,Math.round(useMeter(on?stream:null)*140)),percent=Math.round(level*100);
  const masterPercent=Math.round(master*100);
  return <aside className={`mic-strip${on?' is-on':''}`} aria-label="Voice microphone and audio input level">
    <div className="ms-buttons">
      <button type="button" className="ms-toggle" aria-pressed={on} disabled={disabled} onClick={onToggle} title={disabled?'Open the preview to use the voice microphone':on?'Microphone on. Click to turn it off.':'Turn the voice microphone on'} aria-label={on?'Turn the voice microphone off':'Turn the voice microphone on'}>{on?<Mic size={17} aria-hidden="true"/>:<MicOff size={17} aria-hidden="true"/>}</button>
      <button type="button" className={`ms-auto${auto?' is-on':''}${ducking?' is-ducking':''}`} aria-pressed={auto} disabled={disabled||!on} onClick={()=>onAuto?.(!auto)} title={!on?'Turn the microphone on to use auto leveling':auto?(ducking?'Auto level is lowering the audio input because you are speaking. Click to turn it off.':'Auto level on: the audio input is lowered while you speak. Click to turn it off.'):'Auto level: lower the audio input while you speak in the microphone'} aria-label="Auto level while I speak"><AudioLines size={17} aria-hidden="true"/></button>
    </div>
    <div className="ms-channels">
      <div className="ms-channel">
        <div className="ms-body">
          <div className="ms-meter" role="meter" aria-label="Voice microphone level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={meter}><i style={{height:`${meter}%`}}/></div>
          <input className="ms-fader" type="range" min="0" max="2" step="0.01" value={level} disabled={disabled||!on} onChange={event=>onLevel(event.target.value)} aria-label="Voice microphone level" aria-valuetext={`${percent} percent`}/>
        </div>
        <span className="ms-value" aria-hidden="true">{on?percent:'--'}<small>%</small></span>
        <span className="ms-label">MIC</span>
      </div>
      <div className={`ms-channel is-input${ducking?' is-ducking':''}`}>
        <div className="ms-body"><input className="ms-fader" type="range" min="0" max="2" step="0.01" value={master} disabled={disabled} onChange={event=>onMaster?.(event.target.value)} aria-label="Audio input level" aria-valuetext={`${masterPercent} percent`}/></div>
        <span className="ms-value" aria-hidden="true">{masterPercent}<small>%</small></span>
        <span className="ms-label">IN</span>
      </div>
    </div>
  </aside>;
}
