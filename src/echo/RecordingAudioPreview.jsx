import {useRef,useState} from 'react';
import {Pause,Play,Volume2,VolumeX} from 'lucide-react';

const clock=value=>Number.isFinite(value)?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';

export default function RecordingAudioPreview({src}){
 const audio=useRef(null);
 const [playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[muted,setMuted]=useState(false),[error,setError]=useState('');
 const toggle=async()=>{
  const player=audio.current;
  if(!player)return;
  if(!player.paused){player.pause();return;}
  try{setError('');await player.play();}catch{setError('Unable to play this audio. Try again.');}
 };
 return <section className="recording-audio-preview" aria-label="Audio preview">
  <header><span>Audio preview</span><small>{playing?'Playing':'Ready to listen'}</small></header>
  <audio ref={audio} src={src} preload="metadata" muted={muted} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)} onError={()=>{setPlaying(false);setError('Audio preview is unavailable.');}}/>
  <div className="recording-preview-controls">
   <button type="button" className="recording-preview-play" onClick={toggle} aria-label={playing?'Pause audio preview':'Play audio preview'}>{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>
   <div className="recording-preview-timeline">
    <input type="range" aria-label="Seek audio preview" min="0" max={duration||0} step="0.1" value={Math.min(time,duration)} disabled={!duration} style={{'--progress':`${duration?time/duration*100:0}%`}} onChange={e=>{audio.current.currentTime=Number(e.target.value);setTime(Number(e.target.value));}}/>
    <div><span>{clock(time)}</span><span>{clock(duration)}</span></div>
   </div>
   <button type="button" className="recording-preview-mute" onClick={()=>setMuted(value=>!value)} aria-label={muted?'Unmute audio preview':'Mute audio preview'} aria-pressed={muted}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>
  </div>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
