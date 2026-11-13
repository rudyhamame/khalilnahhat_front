import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Scissors,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import CameraAppearanceControls from '../components/CameraAppearanceControls';
import {CAMERA_APPEARANCE_DEFAULTS,cameraAppearanceFilter} from '../lib/cameraAppearance';

const clock=value=>{
 const seconds=Math.max(0,Number(value)||0),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=(seconds%60).toFixed(2).padStart(5,'0');
 return `${hours?`${hours}:`:''}${String(minutes).padStart(hours?2:1,'0')}:${rest}`;
};
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export default function LiveRecordingTrimmer({item,part,src,token,onClose,onSaved}){
 const dialog=useRef(null),video=useRef(null);
 const source=item.parts?.[part]||{},knownDuration=Number(source.durationSec)||0;
 const [duration,setDuration]=useState(knownDuration),[start,setStart]=useState(Number(source.trimStartSec)||0),[end,setEnd]=useState(Number(source.trimEndSec)||knownDuration),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[frames,setFrames]=useState([]);
 // The look (beauty and lighting) is edited here, on the recording, and applied when it is previewed, downloaded or published.
 const [look,setLook]=useState({...CAMERA_APPEARANCE_DEFAULTS,...(source.look||{})}),savedLook=useRef(JSON.stringify({...CAMERA_APPEARANCE_DEFAULTS,...(source.look||{})}));
 const lookOn=look.strength>0,amount=look.strength/100,lookFilter=lookOn?`${cameraAppearanceFilter(look)} ${look.warmth>0?`sepia(${(look.warmth/50*amount*.5).toFixed(3)})`:look.warmth<0?`hue-rotate(${(look.warmth*amount*.3).toFixed(1)}deg)`:''}`.trim():'none';
 useEffect(()=>{dialog.current?.showModal();},[]);

 // Real frames for the film rail. ponytail: one hidden decoder, sequential seeks; falls back to the tinted rail if the browser blocks canvas reads.
 useEffect(()=>{
  if(!duration||!src)return undefined;
  let dead=false;const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=src;
  const count=12,out=[];
  const seek=t=>new Promise((ok,no)=>{v.onseeked=ok;v.onerror=no;v.currentTime=t;});
  (async()=>{try{
   if(v.readyState<1)await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=no;});
   const c=document.createElement('canvas'),h=96,w=Math.max(1,Math.round(h*(v.videoWidth||16)/(v.videoHeight||9)));c.width=w;c.height=h;const g=c.getContext('2d');
   for(let i=0;i<count&&!dead;i++){await seek(Math.min(duration-.05,(i+.5)/count*duration));g.drawImage(v,0,0,w,h);out.push(c.toDataURL('image/jpeg',.6));if(i%3===2)setFrames([...out]);}
   if(!dead)setFrames(out);
  }catch{/* keep tinted rail */}})();
  return()=>{dead=true;v.removeAttribute('src');v.load();};
 },[duration,src]);
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
  try{const result=await apiRequest(`/admin/live-recordings/${item.id}/trim`,{token,method:'POST',body:{part,start,end,look:lookOn?{strength:look.strength,brightness:look.brightness,contrast:look.contrast,warmth:look.warmth,tone:look.tone}:null}});onSaved(result.item);dialog.current?.close();}
  catch(problem){if(!problem.cancelled)setError(problem.message||'The trim could not be saved.');setBusy(false);}
 };
 const full=duration>0&&start<.005&&end>=duration-.005;
 return <dialog ref={dialog} className="live-recording-trimmer" aria-labelledby="live-recording-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
  <header><span><Scissors size={20}/></span><div><small>VIDEO EDITOR</small><h2 id="live-recording-trimmer-title">Edit live recording</h2><p>Trim the video and set its beauty and lighting before it is published or downloaded. The original stays unchanged.</p></div><button type="button" aria-label="Close video trimmer" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
  <div className="live-trimmer-layout"><div className="live-recording-trimmer-body">
   <video ref={video} src={src} style={{filter:lookFilter}} playsInline preload="metadata" onLoadedMetadata={event=>{const measured=event.currentTarget.duration;if(Number.isFinite(measured)&&measured>0){setDuration(measured);setEnd(current=>current>0?Math.min(current,measured):measured);}}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onTimeUpdate={event=>{if(event.currentTarget.currentTime>=end){event.currentTarget.pause();event.currentTarget.currentTime=start;}}}/>
   <div className="live-trim-transport"><button type="button" aria-label={playing?'Pause selected range':'Play selected range'} disabled={!duration||busy} onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><strong>{clock(start)} — {clock(end)}</strong><span>{clock(end-start)} selected</span><button type="button" className="live-trim-mark" disabled={!duration||busy} onClick={()=>changeStart(video.current?.currentTime)}>Set in</button><button type="button" className="live-trim-mark" disabled={!duration||busy} onClick={()=>changeEnd(video.current?.currentTime)}>Set out</button></div>
   <div className="live-trim-timeline" style={{'--trim-start':`${duration?start/duration*100:0}%`,'--trim-end':`${duration?end/duration*100:100}%`}}>
    <div className="live-trim-track">{frames.length>0&&<div className="live-trim-frames">{frames.map((f,n)=><img key={n} src={f} alt="" draggable="false"/>)}</div>}<i/></div>
    <input className="live-trim-handle" aria-label="Trim start" type="range" min="0" max={duration||1} step="0.01" value={start} disabled={!duration||busy} onChange={event=>changeStart(Math.min(event.target.value,end-.1))}/>
    <input className="live-trim-handle" aria-label="Trim end" type="range" min="0" max={duration||1} step="0.01" value={end} disabled={!duration||busy} onChange={event=>changeEnd(Math.max(event.target.value,start+.1))}/>
    <div className="live-trim-scale"><span>0:00</span><span>{clock(duration)}</span></div>
   </div>
   <div className="live-trim-fields"><label>Start<input type="number" min="0" max={Math.max(0,end-.1)} step="0.01" value={Number(start.toFixed(2))} disabled={!duration||busy} onChange={event=>changeStart(event.target.value)}/><span>sec</span></label><label>End<input type="number" min={Math.min(duration,start+.1)} max={duration} step="0.01" value={Number(end.toFixed(2))} disabled={!duration||busy} onChange={event=>changeEnd(event.target.value)}/><span>sec</span></label></div>
   {error&&<p className="live-trim-error" role="alert">{error}</p>}
  </div>
  <aside className="live-trimmer-look" aria-label="Beauty and lighting"><h3>Beauty &amp; lighting</h3><CameraAppearanceControls value={look} onChange={setLook} disabled={busy} hide={['smoothing','sideLight']} note="Applied to the video when it is previewed, downloaded or published. The original stays unchanged. The preview here is approximate."/></aside></div>
  <footer><button type="button" className="live-trim-reset" disabled={!duration||busy||full} onClick={()=>{setStart(0);setEnd(duration);if(video.current)video.current.currentTime=0;}}><RotateCcw size={15}/>Use full recording</button><span>{full?'Full recording selected':`Keeping ${clock(end-start)} of ${clock(duration)}`}</span><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="live-trim-save" disabled={!duration||busy||end-start<.1} onClick={save}><Scissors size={15}/>{busy?'Saving…':'Save edits'}</button></footer>
 </dialog>;
}
