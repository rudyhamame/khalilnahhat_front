import {useEffect,useRef,useState} from 'react';
import {Pause,Play,SkipBack,SkipForward} from 'lucide-react';
const clock=s=>Number.isFinite(s)?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'0:00';
// Compact custom player for the admin Recordings column; Prev/Next walk the visible list.
export default function ArchiveMiniPlayer({src,title,artist,cover,onPrev,onNext}){
 const audio=useRef(null),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0);
 useEffect(()=>{setPlaying(false);setTime(0);setDuration(0);},[src]);
 const toggle=()=>{const el=audio.current;if(!el)return;if(el.paused)el.play().catch(()=>setPlaying(false));else el.pause();};
 return <div className="mini-player" role="group" aria-label="Mini player">
  <div className="mini-player-track">{cover?<img src={cover} alt=""/>:<span aria-hidden="true">♫</span>}<div><strong>{title||'Nothing selected'}</strong><small>{src?`${artist||'No credited artists'} · ${clock(time)} / ${clock(duration)}`:title?'No audio attached':'Select a recording to play it'}</small></div></div>
  {src&&<audio ref={audio} key={src} src={src} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);onNext?.();}} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>setDuration(e.currentTarget.duration)}/>}
  <div className="mini-player-controls"><button type="button" aria-label="Previous recording" onClick={onPrev} disabled={!onPrev}><SkipBack size={16}/></button><button type="button" className="mini-player-play" aria-label={playing?'Pause':'Play'} onClick={toggle} disabled={!src}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button type="button" aria-label="Next recording" onClick={onNext} disabled={!onNext}><SkipForward size={16}/></button></div>
  <input type="range" className="mini-player-seek" aria-label="Seek" min="0" max={duration||0} step="0.1" value={Math.min(time,duration||0)} disabled={!src||!duration} style={{'--p':duration?`${time/duration*100}%`:'0%'}} onChange={e=>{audio.current.currentTime=Number(e.target.value);}}/>
 </div>;
}
