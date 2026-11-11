import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Maximize,Minimize,Volume2,VolumeX,RotateCcw,RotateCw} from 'lucide-react';
const SPEEDS=[.75,1,1.25,1.5,2];
const clock=value=>{const t=Math.max(0,Math.floor(value||0)),h=Math.floor(t/3600),m=Math.floor(t/60)%60,sec=t%60;return `${h?h+':':''}${h?String(m).padStart(2,'0'):m}:${String(sec).padStart(2,'0')}`;};
// A control bar docked under the picture (never over it): seek line on top, then one clean row of controls.
export default function RecordingControls({boxRef,playing,time,length,onToggle,onSeek,onSkip,volume,muted,onVolume,onMute,rate,onRate}){
  const [full,setFull]=useState(false),[hover,setHover]=useState(null),bar=useRef(null);
  useEffect(()=>{const sync=()=>setFull(document.fullscreenElement===boxRef.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[boxRef]);
  const fullscreen=()=>{const box=boxRef.current;if(!box)return;if(document.fullscreenElement)void document.exitFullscreen();else void box.requestFullscreen?.();};
  const pointerTime=event=>{const rect=bar.current?.getBoundingClientRect();if(!rect||!length)return 0;return Math.max(0,Math.min(length,((event.clientX-rect.left)/rect.width)*length));};
  const key=event=>{
    if(event.target.tagName==='INPUT')return;
    if(event.key===' '||event.key==='k'){event.preventDefault();onToggle();}
    else if(event.key==='ArrowRight'){event.preventDefault();onSkip(5);}else if(event.key==='ArrowLeft'){event.preventDefault();onSkip(-5);}
    else if(event.key==='f'){event.preventDefault();fullscreen();}else if(event.key==='m'){event.preventDefault();onMute();}
  };
  const pct=length?Math.min(100,time/length*100):0,quiet=muted||volume===0;
  return <div className="rp" role="group" aria-label="Recording player controls" tabIndex={0} onKeyDown={key}>
    <div className="rp-seek" ref={bar} onPointerMove={event=>setHover({x:event.clientX-(bar.current?.getBoundingClientRect().left||0),t:pointerTime(event)})} onPointerLeave={()=>setHover(null)}>
      <div className="rp-track"><i style={{width:`${pct}%`}}/></div>
      <input type="range" min="0" max={length||0} step="0.1" value={Math.min(time,length||0)} aria-label="Seek" onChange={event=>onSeek(Number(event.target.value))}/>
      {hover&&<em className="rp-hover" style={{left:hover.x}}>{clock(hover.t)}</em>}
    </div>
    <div className="rp-row">
      <button type="button" className="rp-play" aria-label={playing?'Pause':'Play'} title={playing?'Pause (Space)':'Play (Space)'} onClick={onToggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
      <button type="button" className="rp-skip" aria-label="Back 10 seconds" title="Back 10 seconds" onClick={()=>onSkip(-10)}><RotateCcw size={16}/><b>10</b></button>
      <button type="button" className="rp-skip" aria-label="Forward 10 seconds" title="Forward 10 seconds" onClick={()=>onSkip(10)}><RotateCw size={16}/><b>10</b></button>
      <span className="rp-time"><strong>{clock(time)}</strong><i>/</i>{clock(length)}</span>
      <span className="rp-gap"/>
      <span className="rp-volume"><button type="button" aria-label={quiet?'Unmute':'Mute'} title={quiet?'Unmute (M)':'Mute (M)'} onClick={onMute}>{quiet?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><input type="range" min="0" max="1" step="0.05" value={muted?0:volume} aria-label="Volume" onChange={event=>onVolume(Number(event.target.value))}/></span>
      <button type="button" className="rp-speed" aria-label={`Playback speed ${rate}×`} title="Playback speed" onClick={()=>onRate(SPEEDS[(SPEEDS.indexOf(rate)+1)%SPEEDS.length])}>{rate}×</button>
      <button type="button" aria-label={full?'Exit full screen':'Full screen'} title={full?'Exit full screen (F)':'Full screen (F)'} onClick={fullscreen}>{full?<Minimize size={17}/>:<Maximize size={17}/>}</button>
    </div>
  </div>;
}
