import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Maximize,Minimize,Volume2,VolumeX,RotateCcw,RotateCw} from 'lucide-react';
const SPEEDS=[1,1.25,1.5,2,.75];
const clock=value=>{const t=Math.max(0,Math.floor(value||0)),h=Math.floor(t/3600),m=Math.floor(t/60)%60,sec=t%60;return `${h?h+':':''}${h?String(m).padStart(2,'0'):m}:${String(sec).padStart(2,'0')}`;};
// One control bar over the picture: big play, seek with a hover time, ±10 s, volume, speed, fullscreen. Hides itself while playing.
export default function RecordingControls({boxRef,playing,time,length,onToggle,onSeek,onSkip,volume,muted,onVolume,onMute,rate,onRate}){
  const [shown,setShown]=useState(true),[full,setFull]=useState(false),[hover,setHover]=useState(null),timer=useRef(null),bar=useRef(null);
  const wake=()=>{setShown(true);clearTimeout(timer.current);if(playing)timer.current=setTimeout(()=>setShown(false),2600);};
  useEffect(()=>{wake();return()=>clearTimeout(timer.current);},[playing]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const sync=()=>setFull(document.fullscreenElement===boxRef.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[boxRef]);
  const fullscreen=()=>{const box=boxRef.current;if(!box)return;if(document.fullscreenElement)void document.exitFullscreen();else void box.requestFullscreen?.();};
  const pointerTime=event=>{const rect=bar.current?.getBoundingClientRect();if(!rect||!length)return 0;return Math.max(0,Math.min(length,((event.clientX-rect.left)/rect.width)*length));};
  const key=event=>{
    if(event.target.tagName==='INPUT')return;
    if(event.key===' '||event.key==='k'){event.preventDefault();onToggle();}
    else if(event.key==='ArrowRight'){event.preventDefault();onSkip(5);}else if(event.key==='ArrowLeft'){event.preventDefault();onSkip(-5);}
    else if(event.key==='f'){event.preventDefault();fullscreen();}else if(event.key==='m'){event.preventDefault();onMute();}
  };
  const pct=length?Math.min(100,time/length*100):0;
  return <div className={`rp${shown||!playing?' is-shown':''}`} onPointerMove={wake} onPointerLeave={()=>playing&&setShown(false)} onKeyDown={key} tabIndex={0} aria-label="Recording player">
    <button type="button" className="rp-center" aria-label={playing?'Pause':'Play'} onClick={onToggle}>{playing?<Pause size={28}/>:<Play size={28}/>}</button>
    <div className="rp-bar">
      <div className="rp-seek" ref={bar} onPointerMove={event=>setHover({x:event.clientX-(bar.current?.getBoundingClientRect().left||0),t:pointerTime(event)})} onPointerLeave={()=>setHover(null)}>
        <div className="rp-track"><i style={{width:`${pct}%`}}/></div>
        <input type="range" min="0" max={length||0} step="0.1" value={Math.min(time,length||0)} aria-label="Seek" onChange={event=>onSeek(Number(event.target.value))}/>
        {hover&&<em className="rp-hover" style={{left:hover.x}}>{clock(hover.t)}</em>}
      </div>
      <div className="rp-row">
        <button type="button" aria-label={playing?'Pause':'Play'} onClick={onToggle}>{playing?<Pause size={16}/>:<Play size={16}/>}</button>
        <button type="button" aria-label="Back 10 seconds" onClick={()=>onSkip(-10)}><RotateCcw size={15}/></button>
        <button type="button" aria-label="Forward 10 seconds" onClick={()=>onSkip(10)}><RotateCw size={15}/></button>
        <span className="rp-time">{clock(time)} <b>/</b> {clock(length)}</span>
        <span className="rp-gap"/>
        <span className="rp-volume"><button type="button" aria-label={muted?'Unmute':'Mute'} onClick={onMute}>{muted||volume===0?<VolumeX size={16}/>:<Volume2 size={16}/>}</button><input type="range" min="0" max="1" step="0.05" value={muted?0:volume} aria-label="Volume" onChange={event=>onVolume(Number(event.target.value))}/></span>
        <button type="button" className="rp-speed" aria-label="Playback speed" onClick={()=>onRate(SPEEDS[(SPEEDS.indexOf(rate)+1)%SPEEDS.length])}>{rate}×</button>
        <button type="button" aria-label={full?'Exit full screen':'Full screen'} onClick={fullscreen}>{full?<Minimize size={16}/>:<Maximize size={16}/>}</button>
      </div>
    </div>
  </div>;
}
