import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Scissors,X} from 'lucide-react';
import {apiRequest} from '../lib/api';

const clock=value=>{
 const seconds=Math.max(0,Number(value)||0),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=(seconds%60).toFixed(2).padStart(5,'0');
 return `${hours?`${hours}:`:''}${String(minutes).padStart(hours?2:1,'0')}:${rest}`;
};
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export default function LiveRecordingTrimmer({item,part,src,token,onClose,onSaved}){
 const dialog=useRef(null),video=useRef(null);
 const source=item.parts?.[part]||{},knownDuration=Number(source.durationSec)||0;
 const [duration,setDuration]=useState(knownDuration),[start,setStart]=useState(Number(source.trimStartSec)||0),[end,setEnd]=useState(Number(source.trimEndSec)||knownDuration),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 const changeStart=value=>{const next=bounded(value,0,Math.max(0,end-.1));setStart(next);if(video.current)video.current.currentTime=next;};
 const changeEnd=value=>setEnd(bounded(value,Math.min(duration,start+.1),duration));
 const toggle=async()=>{
  const player=video.current;if(!player)return;
  if(!player.paused){player.pause();return;}
  if(player.currentTime<start||player.currentTime>=end-.02)player.currentTime=start;
  try{await player.play();}catch{setError('Preview playback could not start.');}
 };
 const save=async()=>{
  setBusy(true);setError('');video.current?.pause();
  try{const result=await apiRequest(`/admin/live-recordings/${item.id}/trim`,{token,method:'POST',body:{part,start,end}});onSaved(result.item);dialog.current?.close();}
  catch(problem){if(!problem.cancelled)setError(problem.message||'The trim could not be saved.');setBusy(false);}
 };
 const full=duration>0&&start<.005&&end>=duration-.005;
 return <dialog ref={dialog} className="live-recording-trimmer" aria-labelledby="live-recording-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
  <header><span><Scissors size={20}/></span><div><small>VIDEO EDITOR</small><h2 id="live-recording-trimmer-title">Trim live recording</h2><p>Choose the section used when this part is published or downloaded. The original stays unchanged.</p></div><button type="button" aria-label="Close video trimmer" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
  <div className="live-recording-trimmer-body">
   <video ref={video} src={src} playsInline preload="metadata" onLoadedMetadata={event=>{const measured=event.currentTarget.duration;if(Number.isFinite(measured)&&measured>0){setDuration(measured);setEnd(current=>current>0?Math.min(current,measured):measured);}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onTimeUpdate={event=>{if(event.currentTarget.currentTime>=end){event.currentTarget.pause();event.currentTarget.currentTime=start;}}}/>
   <div className="live-trim-transport"><button type="button" aria-label={playing?'Pause selected range':'Play selected range'} disabled={!duration||busy} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><strong>{clock(start)} — {clock(end)}</strong><span>{clock(end-start)} selected</span></div>
   <div className="live-trim-timeline" style={{'--trim-start':`${duration?start/duration*100:0}%`,'--trim-end':`${duration?end/duration*100:100}%`}}>
    <div className="live-trim-track"><i/><b/></div>
    <label><span>In point</span><input aria-label="Trim start" type="range" min="0" max={Math.max(0,end-.1)} step="0.01" value={start} disabled={!duration||busy} onChange={event=>changeStart(event.target.value)}/></label>
    <label><span>Out point</span><input aria-label="Trim end" type="range" min={Math.min(duration,start+.1)} max={duration||1} step="0.01" value={end} disabled={!duration||busy} onChange={event=>changeEnd(event.target.value)}/></label>
   </div>
   <div className="live-trim-fields"><label>Start<input type="number" min="0" max={Math.max(0,end-.1)} step="0.01" value={Number(start.toFixed(2))} disabled={!duration||busy} onChange={event=>changeStart(event.target.value)}/><span>sec</span></label><label>End<input type="number" min={Math.min(duration,start+.1)} max={duration} step="0.01" value={Number(end.toFixed(2))} disabled={!duration||busy} onChange={event=>changeEnd(event.target.value)}/><span>sec</span></label></div>
   {error&&<p className="live-trim-error" role="alert">{error}</p>}
  </div>
  <footer><button type="button" className="live-trim-reset" disabled={!duration||busy||full} onClick={()=>{setStart(0);setEnd(duration);if(video.current)video.current.currentTime=0;}}><RotateCcw size={15}/>Use full recording</button><span>{full?'Full recording selected':`Keeping ${clock(end-start)} of ${clock(duration)}`}</span><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="live-trim-save" disabled={!duration||busy||end-start<.1} onClick={save}><Scissors size={15}/>{busy?'Saving trim…':'Save trim'}</button></footer>
 </dialog>;
}
