import {useEffect,useRef,useState} from 'react';
import {Play,Pause,X,RotateCcw} from 'lucide-react';
import {apiBaseUrl} from '../lib/api';
import {encodeWav} from '../lib/wavEncode';
import {trimBounds,trimClock,waveformPeaks} from '../lib/audioTrim';
import './sampleTrimmer.css';
import './audioTrimmer.css';

export default function AudioTrimmer({src,token,onClose,onTrimmed}){
 const dialog=useRef(null),wave=useRef(null),context=useRef(null),decoded=useRef(null),source=useRef(null),animation=useRef(0),playback=useRef(null),playRequest=useRef({value:0}),selection=useRef([0,0]);
 const [duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[cursor,setCursor]=useState(0),[peaks,setPeaks]=useState([]),[playing,setPlaying]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[zoom,setZoom]=useState(1),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const stop=()=>{playRequest.current.value++;cancelAnimationFrame(animation.current);if(source.current){source.current.onended=null;source.current.stop();source.current=null;}playback.current=null;setPlaying(false);};
 useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();},[]);
 useEffect(()=>{
  const abort=new AbortController(),requestGuard=playRequest.current;let cancelled=false;
  setLoading(true);setError('');decoded.current=null;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();context.current=ctx;
  (async()=>{try{
   const response=await fetch(src,{signal:abort.signal});if(!response.ok)throw Error('Audio could not be loaded.');
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(cancelled)return;
   decoded.current=buffer;selection.current=[0,buffer.duration];setDuration(buffer.duration);setStart(0);setEnd(buffer.duration);setCursor(0);setPeaks(waveformPeaks(buffer));setZoom(1);setOffset(0);
  }catch(problem){if(!cancelled)setError(problem.name==='EncodingError'?'This audio format could not be decoded. Try uploading a WAV or MP3 file.':'Audio could not be loaded. Check your connection and try again.');}finally{if(!cancelled)setLoading(false);}})();
  return()=>{cancelled=true;requestGuard.value++;abort.abort();cancelAnimationFrame(animation.current);if(source.current){source.current.onended=null;source.current.stop();source.current=null;}ctx.close();};
 },[src,retry]);
 const change=(from,to)=>{stop();const next=trimBounds(from,to,duration);selection.current=next;setStart(next[0]);setEnd(next[1]);setCursor(next[0]);};
 const preview=async()=>{
  if(playing){stop();return;}
  try{
   const request=++playRequest.current.value;await context.current.resume();if(request!==playRequest.current.value||!dialog.current?.open)return;const [from,to]=selection.current;
   const node=context.current.createBufferSource();node.buffer=decoded.current;node.connect(context.current.destination);source.current=node;
   const begin=cursor>=from&&cursor<to-.01?cursor:from;
   playback.current={time:context.current.currentTime,begin,end:to};
   node.onended=()=>{source.current=null;playback.current=null;cancelAnimationFrame(animation.current);setCursor(from);setPlaying(false);};
   node.start(0,begin,to-begin);setPlaying(true);setError('');
   const tick=()=>{const active=playback.current;if(!active)return;setCursor(Math.min(active.end,active.begin+context.current.currentTime-active.time));animation.current=requestAnimationFrame(tick);};tick();
  }catch{stop();setError('Playback could not start. Try again.');}
 };
 const span=duration/zoom,viewEnd=offset+span;
 const position=time=>(time-offset)/span*100;
 const timeAt=event=>{const rect=wave.current.getBoundingClientRect();return Math.max(0,Math.min(duration,offset+(event.clientX-rect.left)/rect.width*span));};
 const drag=useRef(null);
 const pointerDown=(event,edge)=>{if(busy||loading||!duration)return;event.preventDefault();stop();event.currentTarget.setPointerCapture(event.pointerId);drag.current=edge;updatePointer(event,edge);};
 const updatePointer=(event,edge)=>{const time=timeAt(event);const [from,to]=selection.current;if(edge==='start')change(Math.min(time,to-Math.min(.05,duration)),to);else if(edge==='end')change(from,Math.max(time,from+Math.min(.05,duration)));else setCursor(Math.max(from,Math.min(to,time)));};
 const pointerMove=event=>{if(drag.current)updatePointer(event,drag.current);};
 const keyboard=(event,edge)=>{let value=edge==='start'?start:end;const delta=event.shiftKey?1:.01;if(event.key==='ArrowLeft'||event.key==='ArrowDown')value-=delta;else if(event.key==='ArrowRight'||event.key==='ArrowUp')value+=delta;else if(event.key==='Home')value=0;else if(event.key==='End')value=duration;else return;event.preventDefault();if(edge==='start')change(Math.min(value,end-Math.min(.05,duration)),end);else change(start,Math.max(value,start+Math.min(.05,duration)));};
 const apply=async()=>{
  setBusy(true);setError('');stop();
  try{
   const buffer=decoded.current,from=Math.floor(start*buffer.sampleRate),to=Math.min(buffer.length,Math.ceil(end*buffer.sampleRate));
   const body=new FormData();body.append('file',new File([encodeWav(buffer,from,to)],'trimmed.wav',{type:'audio/wav'}));
   const response=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'The trimmed audio could not be uploaded.');
   if(!data.url)throw Error('The upload did not return an audio file. Please try again.');
   onTrimmed({...data,durationSeconds:(to-from)/buffer.sampleRate});dialog.current?.close();
  }catch(problem){setError(problem.message||'The audio could not be trimmed.');setBusy(false);}
 };
 const path=peaks.map(([low,high],i)=>{const time=(i+.5)/peaks.length*duration;if(time<offset||time>viewEnd)return '';const x=(time-offset)/span*1000;return `M${x.toFixed(2)},${(90-high*76).toFixed(2)}V${(90-low*76).toFixed(2)}`;}).join('');
 const ready=duration>0&&!loading,trimmed=ready&&(start>0||end<duration);
 return <dialog ref={dialog} className="sample-trimmer audio-trimmer" aria-labelledby="audio-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
  <header><div><small>AUDIO EDITOR</small><h2 id="audio-trimmer-title">Trim audio</h2><p>Drag the handles to choose what to keep. Click the waveform to position playback.</p></div><button type="button" aria-label="Close audio editor" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
  <div className="sample-trimmer-body">
   <div className="audio-trimmer-toolbar"><span>{loading?'Decoding audio…':`${trimClock(duration)} total`}</span><label>Zoom <input type="range" min="1" max="16" step="1" value={zoom} disabled={!ready||busy} onChange={event=>{const next=Number(event.target.value);setOffset(Math.max(0,Math.min(duration-duration/next,offset+span/2-duration/next/2)));setZoom(next);}}/><output>{zoom}×</output></label><button type="button" disabled={!ready||busy} onClick={()=>{change(0,duration);setZoom(1);setOffset(0);}}><RotateCcw size={14}/>Reset</button></div>
   <div ref={wave} className={`audio-trimmer-wave${loading?' is-loading':''}`} onPointerDown={event=>pointerDown(event,'cursor')} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <svg viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="1000" y1="90" y2="90" className="audio-trimmer-zero"/><path d={path}/></svg>
    {ready&&<><div className="audio-trimmer-discard" style={{left:0,width:`${Math.max(0,Math.min(100,position(start)))}%`}}/><div className="audio-trimmer-discard" style={{right:0,width:`${Math.max(0,Math.min(100,100-position(end)))}%`}}/><div className="audio-trimmer-selection" style={{left:`${Math.max(0,position(start))}%`,right:`${Math.max(0,100-position(end))}%`}}/>
    {[['start',start],['end',end]].map(([edge,time])=>position(time)>=0&&position(time)<=100&&<div key={edge} className={`audio-trimmer-handle is-${edge}`} role="slider" tabIndex={busy?-1:0} aria-label={`Trim ${edge}`} aria-disabled={busy} aria-valuemin={edge==='start'?0:start+Math.min(.05,duration)} aria-valuemax={edge==='start'?end-Math.min(.05,duration):duration} aria-valuenow={time} aria-valuetext={trimClock(time)} style={{left:`${position(time)}%`}} onPointerDown={event=>{event.stopPropagation();pointerDown(event,edge);}} onKeyDown={event=>{if(!busy)keyboard(event,edge);}}><span/></div>)}
    {cursor>=offset&&cursor<=viewEnd&&<div className="audio-trimmer-playhead" style={{left:`${position(cursor)}%`}}/>}</>}
    {loading&&<span className="audio-trimmer-loading" role="status">Loading waveform…</span>}
   </div>
   <div className="audio-trimmer-ruler" aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i}>{trimClock(offset+span*i/4)}</span>)}</div>
   {zoom>1&&<label className="audio-trimmer-pan">Scroll waveform<input aria-label="Waveform position" type="range" min="0" max={duration-span} step="0.01" value={offset} disabled={busy} onChange={event=>setOffset(Number(event.target.value))}/></label>}
   <div className="audio-trimmer-fields"><label>Start (seconds)<input type="number" min="0" max={Math.max(0,end-.05)} step="0.01" value={Number(start.toFixed(2))} disabled={!ready||busy} onChange={event=>change(Math.min(Number(event.target.value),end-Math.min(.05,duration)),end)}/><small>{trimClock(start)}</small></label><div><span>Selected length</span><strong>{trimClock(end-start)}</strong><small>Playback {trimClock(cursor)}</small></div><label>End (seconds)<input type="number" min={start+Math.min(.05,duration)} max={duration} step="0.01" value={Number(end.toFixed(2))} disabled={!ready||busy} onChange={event=>change(start,Math.max(Number(event.target.value),start+Math.min(.05,duration)))}/><small>{trimClock(end)}</small></label></div>
   <p className="sample-trimmer-note">Only the selected region is kept. Apply trim uploads a WAV copy; press Save recording afterward to save the replacement.</p>
   {error&&<p className="sample-trimmer-error" role="alert">{error} {!decoded.current&&<button type="button" onClick={()=>setRetry(value=>value+1)}>Retry loading</button>}</p>}
  </div>
  <footer><button type="button" className="sample-trimmer-preview" disabled={busy||!ready} onClick={preview}>{playing?<Pause size={16}/>:<Play size={16}/>}{playing?'Pause':'Play selection'}</button><span/><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="sample-trimmer-save" disabled={busy||!trimmed} onClick={apply}>{busy?'Uploading trim…':'Apply trim'}</button></footer>
 </dialog>;
}
