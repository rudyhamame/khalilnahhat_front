import {useEffect,useRef,useState} from 'react';
import {Play,Pause,X} from 'lucide-react';
import {apiBaseUrl} from '../lib/api';
import {encodeWav} from '../lib/wavEncode';
import './sampleTrimmer.css';

const clock=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
const MIN_SECONDS=1;

// Cut the start and end off the recording's audio and upload the result as its new audio file.
export default function AudioTrimmer({src,token,onClose,onTrimmed}){
 const dialog=useRef(null),audio=useRef(null);
 const [duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();},[]);
 const stop=()=>{audio.current?.pause();setPlaying(false);};
 const preview=()=>{const node=audio.current;if(!node)return;if(playing){stop();return;}node.currentTime=start;node.play().then(()=>setPlaying(true)).catch(()=>setError('The preview could not play.'));};
 const onTime=()=>{const node=audio.current;if(node&&node.currentTime>=end-.05)stop();};
 const moveStart=value=>{stop();setStart(Math.min(Number(value),end-MIN_SECONDS));};
 const moveEnd=value=>{stop();setEnd(Math.max(Number(value),start+MIN_SECONDS));};
 const trimmed=duration>0&&(start>0||end<duration);
 const apply=async()=>{
  setBusy(true);setError('');stop();
  try{
   const response=await fetch(src);if(!response.ok)throw Error('The audio could not be loaded for trimming.');
   const context=new (window.AudioContext||window.webkitAudioContext)();
   let decoded;try{decoded=await context.decodeAudioData(await response.arrayBuffer());}finally{context.close();}
   const from=Math.floor(start*decoded.sampleRate),to=Math.min(decoded.length,Math.ceil(end*decoded.sampleRate));
   const body=new FormData();body.append('file',new File([encodeWav(decoded,from,to)],'trimmed.wav',{type:'audio/wav'}));
   const upload=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
   const data=await upload.json().catch(()=>({}));
   if(!upload.ok)throw Error(data.message||'The trimmed audio could not be uploaded.');
   onTrimmed(data);dialog.current?.close();
  }catch(problem){setError(problem instanceof TypeError?'The audio could not be loaded for trimming.':problem.message||'The audio could not be trimmed.');setBusy(false);}
 };
 const left=duration>0?start/duration*100:0,share=duration>0?(end-start)/duration*100:100;
 return <dialog ref={dialog} className="sample-trimmer" aria-labelledby="audio-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
  <header><div><small>AUDIO FILE</small><h2 id="audio-trimmer-title">Trim audio</h2><p>Keep only the part between the start and the end.</p></div><button type="button" aria-label="Close" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
  <audio ref={audio} src={src} preload="metadata" onLoadedMetadata={event=>{const length=event.currentTarget.duration;if(Number.isFinite(length)){setDuration(length);setEnd(length);}}} onTimeUpdate={onTime} onEnded={stop}/>
  <div className="sample-trimmer-body">
   <div className="sample-trimmer-track" aria-hidden="true"><span style={{left:`${left}%`,width:`${share}%`}}/></div>
   <label className="audio-trimmer-slider">Start<input type="range" aria-label="Trim start" min="0" max={Math.max(0,duration)} step="0.1" value={start} disabled={busy||!duration} onChange={event=>moveStart(event.target.value)}/></label>
   <label className="audio-trimmer-slider">End<input type="range" aria-label="Trim end" min="0" max={Math.max(0,duration)} step="0.1" value={end} disabled={busy||!duration} onChange={event=>moveEnd(event.target.value)}/></label>
   <div className="sample-trimmer-times"><span>Start <strong>{clock(start)}</strong></span><span>Length <strong>{clock(Math.max(0,end-start))}</strong></span><span>End <strong>{clock(end)}</strong></span><span>of <strong>{duration?clock(duration):'…'}</strong></span></div>
   <p className="sample-trimmer-note">The trimmed audio replaces this recording's audio file once you press Trim. It is saved as WAV, and nothing is saved to the recording until you press Save recording.</p>
   {error&&<p className="sample-trimmer-error" role="alert">{error}</p>}
  </div>
  <footer><button type="button" className="sample-trimmer-preview" disabled={busy||!duration} onClick={preview}>{playing?<Pause size={16}/>:<Play size={16}/>}{playing?'Stop preview':'Preview selection'}</button><span/><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="sample-trimmer-save" disabled={busy||!trimmed} onClick={apply}>{busy?'Trimming…':'Trim'}</button></footer>
 </dialog>;
}
