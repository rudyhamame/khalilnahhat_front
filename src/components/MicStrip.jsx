import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Mic,MicOff,AudioLines,Lightbulb,Volume2,VolumeX,Headphones} from 'lucide-react';
import {createMicrophoneMonitor} from '../lib/microphoneMonitor';
import {adminToast} from './adminToast';
import useStudioMeter from '../hooks/useStudioMeter';
import {formatDb,gainToFader,faderToGain,meterPosition} from '../lib/studioMeter';
import './studioAudioLevels.css';
export {gainToDb,formatDb,snapGain} from '../lib/studioMeter';
export const METER_TICKS=[[0,'0'],[-12,'−12'],[-24,'−24'],[-48,'−48'],[-60,'−60']];
// One mixer channel: clip lamp, segmented LED meter with a peak marker, a dB scale and a fader with a unity mark.
function Channel({label,icon:Icon,iconButton=null,extraButtons=[],gain,onGain,stream,live,disabled,ducking=false,className=''}){
  const meter=useStudioMeter(live?stream:null);
  const short=className==='is-output'?'OUT':className==='is-input'?'IN':'MIC';
  const signal=meter.db===-Infinity?'−∞':Math.min(0,meter.db).toFixed(1);
  const tone=meter.clip?'clip':meter.levelDb>=-3?'hot':meter.levelDb>=-12?'warm':'normal';
  const status=meter.status==='unavailable'?'Unavailable':meter.status==='waiting'?'Tap to start':!live?'Off':meter.db===-Infinity?'Silent':'';
  return <div className={`ms-channel ms-audio-level ${className}${ducking?' is-ducking':''}`} data-tone={tone}>
    <span className="ms-channel-name" title={label}>{short}</span>
    <button type="button" className={`ms-overload${meter.clip?' is-clipping':''}`} onClick={meter.resetClip} title={meter.clip?'Signal reached 0 dBFS. Click to reset.':'No clipping detected'} aria-label={`${label}: ${meter.clip?'clipped, reset indicator':'no clipping'}`} aria-pressed={meter.clip}>CLIP</button>
    <div className="ms-level-controls">
      <div className="ms-signal" role="meter" aria-label={`${label} signal`} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(meter.levelDb)} aria-valuetext={status||`${signal} dBFS`}>
        <i className="ms-signal-fill" style={{transform:`scaleY(${meter.level})`}}/>
        {meter.peak>0&&<b className="ms-signal-peak" style={{bottom:`calc(${meter.peak*100}% - 1px)`}}/>}
      </div>
      <div className="ms-signal-scale" aria-hidden="true">{METER_TICKS.map(([db,text])=><span key={db} style={{bottom:`${meterPosition(db)*100}%`}}>{text}</span>)}</div>
      <div className="ms-gain-control"><input className="ms-gain-fader" type="range" min="0" max="1000" step="1" value={Math.round(gainToFader(gain))} disabled={disabled} onChange={event=>onGain?.(faderToGain(event.target.value))} onDoubleClick={()=>onGain?.(1)} title="Gain. Double-click for 0 dB." aria-label={`${label} gain`} aria-valuetext={`${formatDb(gain)} dB`}/><span className="ms-gain-unity" style={{bottom:`${gainToFader(1)/10}%`}} aria-hidden="true"/></div>
    </div>
    <div className="ms-signal-readout" title={status||`Sample peak ${signal} dBFS`}><strong>{status||signal}</strong><small>dBFS</small></div>
    <div className="ms-gain-readout" title={`${label} gain`}><strong>{formatDb(gain)}</strong><small>gain dB</small></div>
    <div className="ms-label-row">{iconButton?<button type="button" className={`ms-label ms-icon-button ${iconButton.className||''}`} aria-pressed={iconButton.pressed} disabled={iconButton.disabled} onClick={iconButton.onClick} title={iconButton.title} aria-label={iconButton.label}><Icon size={17} aria-hidden="true"/></button>:<span className="ms-label" title={label} role="img" aria-label={label}><Icon size={14} aria-hidden="true"/></span>}{extraButtons.map(({icon:ExtraIcon,...button})=><button key={button.label} type="button" className={`ms-label ms-icon-button ${button.className||''}`} aria-pressed={button.pressed} disabled={button.disabled} onClick={button.onClick} title={button.title} aria-label={button.label}><ExtraIcon size={17} aria-hidden="true"/></button>)}</div>
  </div>;
}
export function OutputStrip({stream,listenStream=stream,level=1,onLevel,muted=false,onMute,disabled=false}){
  const monitor=useRef(null),[listening,setListening]=useState(false);
  useEffect(()=>{
    setListening(false);
    return()=>{monitor.current?.stop();monitor.current=null;};
  },[listenStream,disabled]);
  const toggleListen=async()=>{
    if(monitor.current){monitor.current.stop();monitor.current=null;setListening(false);return;}
    const track=listenStream?.getAudioTracks()[0];if(!track)return;
    let current;
    try{
      current=createMicrophoneMonitor(track);monitor.current=current;setListening(true);
      await current.ready;
    }catch(error){if(!current||monitor.current===current){monitor.current=null;setListening(false);adminToast(error.message||'Could not listen to the output.',true);}}
  };
  return <aside className="mic-strip output-strip" aria-label="Client audio output">
    <button type="button" className={`ms-output-heading ms-listen${listening?' is-listening':''}`} disabled={disabled||!listenStream} onClick={()=>void toggleListen()} aria-label={listening?'Stop listening to output':'Listen to output'} aria-pressed={listening} title={listening?'Listening locally, with your channel headphone mutes. Click to stop.':'Listen on this computer. Channel headphone buttons mute only your listening mix. Use headphones when the microphone is on.'}><Headphones size={14} aria-hidden="true"/><span>OUT</span></button>
    <div className="ms-channels"><Channel label="Client audio output" icon={muted?VolumeX:Volume2} iconButton={{pressed:muted,disabled,onClick:()=>onMute?.(!muted),className:`ms-mute${muted?' is-muted':''}`,title:muted?'Output muted. Click to unmute for all clients.':'Mute the output for all clients',label:muted?'Unmute client audio output':'Mute client audio output'}} gain={level} onGain={onLevel} stream={stream} live={Boolean(stream)} disabled={disabled} className="is-output"/></div>
  </aside>;
}
export default function MicStrip({on,level,stream,onToggle,onLevel,disabled,master=1,onMaster,auto=false,onAuto,ducking=false,inputStream=null,voiceMeter=null,muted=false,onMute,actions=null,status=null,devices=[],deviceId='',onPickDevice,showInput=true,localMonitor={voice:false,input:false},onLocalMute}){
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
    <button type="button" className={`ms-auto-control${auto?' is-on':''}${ducking?' is-ducking':''}`} aria-label="Auto level: prioritize the voice microphone" aria-pressed={auto} disabled={disabled} title="Keep speech clear and lower the audio input only while speaking" onClick={()=>onAuto?.(!auto)}><AudioLines size={14} aria-hidden="true"/><span>{ducking?'Speaking':'Auto level'}</span></button>
    <div className="ms-channels">
      <Channel label="Voice microphone" icon={on?Mic:MicOff} iconButton={{pressed:on,disabled,onClick:toggleMic,className:'ms-toggle',title:disabled?'Open the preview to use the voice microphone':on?'Microphone on. Click to turn it off.':'Turn the voice microphone on',label:on?'Turn the voice microphone off':'Turn the voice microphone on'}} extraButtons={onLocalMute?[{icon:localMonitor.voice?VolumeX:Headphones,pressed:localMonitor.voice,disabled,onClick:()=>onLocalMute('voice',!localMonitor.voice),className:`ms-local-mute${localMonitor.voice?' is-muted':''}`,title:localMonitor.voice?'Microphone muted only in your headphones. Click to hear it.':'Mute the microphone only in your headphones. Clients still hear it.',label:localMonitor.voice?'Hear microphone locally':'Mute microphone only for me'}]:[]} gain={level} onGain={onLevel} stream={voiceMeter} live={on} disabled={disabled||!on} className="is-mic"/>
      {showInput&&<Channel label="Audio input" icon={AudioLines} iconButton={{pressed:muted,disabled,onClick:()=>onMute?.(!muted),className:`ms-mute${muted?' is-muted':''}`,title:muted?'Audio input muted. Click to unmute.':'Mute the audio input',label:muted?'Unmute the audio input':'Mute the audio input'}} extraButtons={onLocalMute?[{icon:localMonitor.input?VolumeX:Headphones,pressed:localMonitor.input,disabled,onClick:()=>onLocalMute('input',!localMonitor.input),className:`ms-local-mute${localMonitor.input?' is-muted':''}`,title:localMonitor.input?'Audio input muted only in your headphones. Click to hear it.':'Mute the audio input only in your headphones. Clients still hear it.',label:localMonitor.input?'Hear audio input locally':'Mute audio input only for me'}]:[]} gain={master} onGain={onMaster} stream={inputStream} live={Boolean(inputStream)} disabled={disabled} ducking={ducking} className="is-input"/>}
    </div>
    {menu&&createPortal(<ul className="ms-device-menu" role="listbox" aria-label="Choose the voice microphone" style={{left:menu.left,bottom:window.innerHeight-menu.top+6}}>
      <li role="presentation" className="ms-device-title">Choose the microphone</li>
      {[{deviceId:'',label:'Default microphone'},...devices.map((device,index)=>({deviceId:device.deviceId,label:device.label||`Microphone ${index+1}`}))].map(device=><li key={device.deviceId||'default'} role="presentation"><button type="button" role="option" aria-selected={device.deviceId===deviceId} className={device.deviceId===deviceId?'is-current':''} onClick={()=>{setMenu(null);void onPickDevice(device.deviceId);}}><Mic size={14} aria-hidden="true"/><span>{device.label}</span></button></li>)}
    </ul>,document.body)}
  </aside>;
}
