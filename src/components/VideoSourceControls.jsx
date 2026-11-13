import {useEffect,useState} from 'react';
import {Play,Pause,RotateCcw,Repeat} from 'lucide-react';
const clock=seconds=>{const total=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;};
// The player for a video file used as the live input: play/pause, restart, seek bar, time and loop. It drives the file's own element.
export default function VideoSourceControls({getElement}){
  const [state,setState]=useState({time:0,duration:0,playing:false,loop:true,seeking:false});
  useEffect(()=>{
    const read=()=>{const element=getElement();if(!element)return;setState(current=>current.seeking?current:{...current,time:element.currentTime||0,duration:Number.isFinite(element.duration)?element.duration:0,playing:!element.paused&&!element.ended,loop:element.loop});};
    read();const timer=setInterval(read,250);return()=>clearInterval(timer);
  },[getElement]);
  const element=getElement();if(!element)return null;
  const toggle=()=>{if(element.paused)void element.play();else element.pause();};
  return <div className="studio-video-player" role="group" aria-label="Video player">
    <button type="button" aria-label={state.playing?'Pause video':'Play video'} title={state.playing?'Pause':'Play'} onClick={toggle}>{state.playing?<Pause size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}</button>
    <button type="button" aria-label="Restart video" title="Restart" onClick={()=>{element.currentTime=0;void element.play();}}><RotateCcw size={15} aria-hidden="true"/></button>
    <span className="studio-video-time">{clock(state.time)}</span>
    <input type="range" min="0" max={state.duration||1} step="0.1" value={Math.min(state.time,state.duration||1)} aria-label="Seek" disabled={!state.duration}
      onPointerDown={()=>setState(current=>({...current,seeking:true}))}
      onChange={event=>{const time=Number(event.target.value);setState(current=>({...current,time}));element.currentTime=time;}}
      onPointerUp={()=>setState(current=>({...current,seeking:false}))} onBlur={()=>setState(current=>({...current,seeking:false}))}/>
    <span className="studio-video-time">{clock(state.duration)}</span>
    <button type="button" aria-label="Loop" aria-pressed={state.loop} title="Loop the video" onClick={()=>{element.loop=!element.loop;setState(current=>({...current,loop:element.loop}));}}><Repeat size={15} aria-hidden="true"/></button>
  </div>;
}
