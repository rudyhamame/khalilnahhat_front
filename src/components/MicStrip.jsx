import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Mic,MicOff,AudioLines,Lightbulb} from 'lucide-react';
// A slim strip left of the landscape preview: the voice microphone, an extra input isolated from the rest.
// On/off with the mic icon, a vertical level control, and a live meter so you can see it is picking you up.
// Pro metering: peak level in dBFS (-60..0 mapped to 0..1), fast attack and slow release, a peak marker that lingers, and a clip lamp that latches.
const FLOOR=-60,norm=db=>Math.max(0,Math.min(1,(db-FLOOR)/-FLOOR));
export const METER_TICKS=[[0,'0'],[-6,'-6'],[-12,'-12'],[-24,'-24'],[-48,'-48']];
export const gainToDb=gain=>gain<=.001?-Infinity:20*Math.log10(gain);
export const formatDb=gain=>{const db=gainToDb(gain);return db===-Infinity?'-∞':`${db>0?'+':''}${db.toFixed(1)}`;};
// The fader snaps to unity (0 dB) when close to it.
export const snapGain=value=>{const gain=Number(value);return Math.abs(gain-1)<.04?1:gain;};
function useMeter(stream,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext){
  const [state,setState]=useState({level:0,peak:0,clip:false});
  const clip=useRef(false);
  useEffect(()=>{
    clip.current=false;
    if(!stream||!AudioContextClass){setState({level:0,peak:0,clip:false});return undefined;}
    const context=new AudioContextClass(),analyser=context.createAnalyser(),source=context.createMediaStreamSource(stream);analyser.fftSize=1024;source.connect(analyser);
    const data=new Uint8Array(analyser.fftSize);let frame=0,stopped=false,level=0,peak=0,hold=0;
    const tick=()=>{
      if(stopped)return;
      analyser.getByteTimeDomainData(data);let top=0;for(const value of data)top=Math.max(top,Math.abs(value-128)/128);
      if(top>=.99)clip.current=true;
      const now=norm(top>0?20*Math.log10(top):-120);
      level=now>level?now:Math.max(now,level-.02);
      if(now>=peak){peak=now;hold=75;}else if(hold>0)hold--;else peak=Math.max(now,peak-.012);
      setState({level,peak,clip:clip.current});frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{stopped=true;cancelAnimationFrame(frame);try{source.disconnect();}catch{/* Closed. */}void context.close().catch(()=>{});setState({level:0,peak:0,clip:false});};
  },[stream,AudioContextClass]);
  return {...state,resetClip:()=>{clip.current=false;setState(previous=>({...previous,clip:false}));}};
}
// One mixer channel: clip lamp, segmented LED meter with a peak marker, a dB scale and a fader with a unity mark.
function Channel({label,icon:Icon,iconButton=null,gain,onGain,stream,live,disabled,ducking=false,scale=true,className=''}){
  const meter=useMeter(live?stream:null);
  return <div className={`ms-channel ${className}${ducking?' is-ducking':''}`}>
    <button type="button" className={`ms-clip${meter.clip?' is-clipping':''}`} onClick={meter.resetClip} title={meter.clip?'Clipped. Click to clear.':'No clipping'} aria-label={`${label} clip lamp`} aria-pressed={meter.clip}/>
    <div className="ms-body">
      <div className="ms-meter" role="meter" aria-label={`${label} level`} aria-valuemin="-60" aria-valuemax="0" aria-valuenow={Math.round(meter.level*60-60)}>
        <i className="ms-led" style={{height:`${meter.level*100}%`}}/><b className="ms-peak" style={{bottom:`${meter.peak*100}%`}}/>
        {METER_TICKS.map(([db])=><u key={db} className="ms-tick" style={{bottom:`${norm(db)*100}%`}}/>)}
      </div>
      {scale&&<div className="ms-scale" aria-hidden="true">{METER_TICKS.map(([db,text])=><span key={db} style={{bottom:`${norm(db)*100}%`}}>{text}</span>)}</div>}
      <div className="ms-fader-wrap"><input className="ms-fader" type="range" min="0" max="2" step="0.01" value={gain} disabled={disabled} onChange={event=>onGain?.(snapGain(event.target.value))} aria-label={`${label} level`} aria-valuetext={`${formatDb(gain)} dB`}/><u className="ms-unity" aria-hidden="true"/></div>
    </div>
    <span className="ms-value" aria-hidden="true">{formatDb(gain)}<small>dB</small></span>
    {iconButton?<button type="button" className={`ms-label ms-icon-button ${iconButton.className||''}`} aria-pressed={iconButton.pressed} disabled={iconButton.disabled} onClick={iconButton.onClick} title={iconButton.title} aria-label={iconButton.label}><Icon size={17} aria-hidden="true"/></button>:<span className="ms-label" title={label} role="img" aria-label={label}><Icon size={14} aria-hidden="true"/></span>}
  </div>;
}
export default function MicStrip({on,level,stream,onToggle,onLevel,disabled,master=1,onMaster,auto=false,onAuto,ducking=false,inputStream=null,actions=null,status=null,devices=[],deviceId='',onPickDevice}){
  const [menu,setMenu]=useState(null);
  useEffect(()=>{
    if(!menu)return undefined;
    const close=event=>{if(event.type==='keydown'&&event.key!=='Escape')return;if(event.type==='pointerdown'&&event.target.closest?.('.ms-device-menu,.ms-toggle'))return;setMenu(null);};
    window.addEventListener('pointerdown',close,true);window.addEventListener('keydown',close,true);window.addEventListener('resize',close);
    return()=>{window.removeEventListener('pointerdown',close,true);window.removeEventListener('keydown',close,true);window.removeEventListener('resize',close);};
  },[menu]);
  // Turning the microphone on first asks which microphone; turning it off needs no question.
  const toggleMic=event=>{
    if(on||!onPickDevice){onToggle?.();return;}
    const rect=event.currentTarget.getBoundingClientRect();setMenu({left:rect.left,top:rect.top});
  };
  return <aside className={`mic-strip${on?' is-on':''}`} aria-label="Voice microphone and audio input level">
    {status&&<div className="ms-lamps" role="group" aria-label="Status lamps">
      {[['PRE','Preview',status.preview],['LIVE','Live',status.live]].map(([short,name,state])=><span key={name} className="ms-lamp" data-state={state} role="status" title={`${name}: ${{off:'off',busy:'starting',on:'on',paused:'paused'}[state]||state}`} aria-label={`${name}: ${{off:'off',busy:'starting',on:'on',paused:'paused'}[state]||state}`}><Lightbulb size={18} aria-hidden="true"/><small>{short}</small></span>)}
    </div>}
    {actions&&<div className="ms-actions" role="group" aria-label="Preview and broadcast actions">{actions}</div>}
    <div className="ms-channels">
      <Channel label="Voice microphone" icon={on?Mic:MicOff} iconButton={{pressed:on,disabled,onClick:toggleMic,className:'ms-toggle',title:disabled?'Open the preview to use the voice microphone':on?'Microphone on. Click to turn it off.':'Turn the voice microphone on',label:on?'Turn the voice microphone off':'Turn the voice microphone on'}} gain={level} onGain={onLevel} stream={stream} live={on} disabled={disabled||!on} className="is-mic" scale={false}/>
      <Channel label="Audio input" icon={AudioLines} iconButton={{pressed:auto,disabled:disabled||!on,onClick:()=>onAuto?.(!auto),className:`ms-auto${auto?' is-on':''}${ducking?' is-ducking':''}`,title:!on?'Turn the microphone on to use auto leveling':auto?(ducking?'Auto level is lowering the audio input because you are speaking. Click to turn it off.':'Auto level on: the audio input is lowered while you speak. Click to turn it off.'):'Auto level: lower the audio input while you speak in the microphone',label:'Auto level while I speak'}} gain={master} onGain={onMaster} stream={inputStream} live={Boolean(inputStream)} disabled={disabled} ducking={ducking} className="is-input"/>
    </div>
    {menu&&createPortal(<ul className="ms-device-menu" role="listbox" aria-label="Choose the voice microphone" style={{left:menu.left,bottom:window.innerHeight-menu.top+6}}>
      <li role="presentation" className="ms-device-title">Choose the microphone</li>
      {[{deviceId:'',label:'Default microphone'},...devices.map((device,index)=>({deviceId:device.deviceId,label:device.label||`Microphone ${index+1}`}))].map(device=><li key={device.deviceId||'default'} role="presentation"><button type="button" role="option" aria-selected={device.deviceId===deviceId} className={device.deviceId===deviceId?'is-current':''} onClick={()=>{setMenu(null);void onPickDevice(device.deviceId);}}><Mic size={14} aria-hidden="true"/><span>{device.label}</span></button></li>)}
    </ul>,document.body)}
  </aside>;
}
