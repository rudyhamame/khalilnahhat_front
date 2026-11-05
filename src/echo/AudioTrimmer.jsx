import {useEffect,useRef,useState} from 'react';
import {Play,Pause,X,RotateCcw,SkipBack,ZoomIn,ZoomOut,ScanLine,Scissors} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {encodeWav} from '../lib/wavEncode';
import {encodeMp3} from '../lib/mp3Encode';
import {trimBounds,trimClock,waveformPeaks} from '../lib/audioTrim';
import './sampleTrimmer.css';
import './audioTrimmer.css';

const EXPORT_FORMATS=[{id:'mp3',label:'MP3',bitrateKbps:192},{id:'aac',label:'AAC (M4A)',bitrateKbps:160},{id:'wav',label:'WAV',description:'Uncompressed · 16-bit PCM'}];
const estimatedMB=(option,seconds,buffer,from,to)=>{
 let bytes=Math.max(0,seconds)*(option.bitrateKbps||0)*1000/8;
 if(option.id==='wav'){
  const rate=buffer?.sampleRate||44100,frames=Math.max(0,Math.min(buffer?.length??Infinity,Math.ceil(to*rate))-Math.floor(from*rate));
  let channels=Math.min(buffer?.numberOfChannels||2,2);if(frames*channels*2+44>95*1024*1024)channels=1;
  bytes=44+frames*channels*2;
 }
 return `${(bytes/1000000).toFixed(2)} MB`;
};

export default function AudioTrimmer({src,token,metadata,onClose,onTrimmed}){
 const encoding=useRef(null);
 useEffect(()=>()=>encoding.current?.abort(),[]);
 const dialog=useRef(null),wave=useRef(null),context=useRef(null),decoded=useRef(null),source=useRef(null),animation=useRef(0),playback=useRef(null),playRequest=useRef({value:0}),selection=useRef([0,0]);
 const [duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[cursor,setCursor]=useState(0),[peaks,setPeaks]=useState([]),[playing,setPlaying]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[zoom,setZoom]=useState(1),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const [exportFormat,setExportFormat]=useState('mp3'),[compressionReady,setCompressionReady]=useState(false),[compressionError,setCompressionError]=useState('');
 useEffect(()=>{
  let active=true,timer;
  const check=async()=>{try{const data=await apiRequest('/admin/music-archive/export-formats',{token});if(!EXPORT_FORMATS.filter(option=>option.id!=='wav').every(option=>data.formats?.some(row=>row.id===option.id)))throw Error('Compression formats unavailable.');if(active){setCompressionReady(true);setCompressionError('');}}catch{if(active){setCompressionError('Compressed export is not available yet. Checking again shortly…');timer=setTimeout(check,10000);}}};
  check();return()=>{active=false;clearTimeout(timer);};
 },[token]);
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
 const changeZoom=value=>{const next=Math.max(1,Math.min(16,value));setOffset(Math.max(0,Math.min(duration-duration/next,offset+span/2-duration/next/2)));setZoom(next);};
 const fitSelection=()=>{const next=Math.max(1,Math.min(16,duration/Math.max(.05,end-start)*.9));setZoom(next);setOffset(Math.max(0,Math.min(duration-duration/next,start-(duration/next-(end-start))/2)));};
 const position=time=>(time-offset)/span*100;
 const timeAt=event=>{const rect=wave.current.getBoundingClientRect();return Math.max(0,Math.min(duration,offset+(event.clientX-rect.left)/rect.width*span));};
 const drag=useRef(null);
 const pointerDown=(event,edge)=>{if(busy||loading||!duration)return;event.preventDefault();stop();event.currentTarget.setPointerCapture(event.pointerId);drag.current=edge;updatePointer(event,edge);};
 const updatePointer=(event,edge)=>{const time=timeAt(event);const [from,to]=selection.current;if(edge==='start')change(Math.min(time,to-Math.min(.05,duration)),to);else if(edge==='end')change(from,Math.max(time,from+Math.min(.05,duration)));else setCursor(Math.max(from,Math.min(to,time)));};
 const pointerMove=event=>{if(drag.current)updatePointer(event,drag.current);};
 const keyboard=(event,edge)=>{let value=edge==='start'?start:end;const delta=event.shiftKey?1:.01;if(event.key==='ArrowLeft'||event.key==='ArrowDown')value-=delta;else if(event.key==='ArrowRight'||event.key==='ArrowUp')value+=delta;else if(event.key==='Home')value=0;else if(event.key==='End')value=duration;else return;event.preventDefault();if(edge==='start')change(Math.min(value,end-Math.min(.05,duration)),end);else change(start,Math.max(value,start+Math.min(.05,duration)));};
 const apply=async()=>{
  if(exportFormat==='aac'&&!compressionReady)return;
  setBusy(true);setError('');stop();
  try{
   const buffer=decoded.current,from=Math.floor(start*buffer.sampleRate),to=Math.min(buffer.length,Math.ceil(end*buffer.sampleRate));
   const controller=new AbortController();encoding.current=controller;
   const blob=exportFormat==='mp3'?await encodeMp3(buffer,from,to,controller.signal):encodeWav(buffer,from,to);
   if(controller.signal.aborted)return;
   const format=exportFormat==='mp3'?'mp3':'wav',isTrimmed=from>0||to<buffer.length;
   const file=new File([blob],`trimmed.${format}`,{type:blob.type});
   onTrimmed({file,exportFormat,durationSeconds:(to-from)/buffer.sampleRate,audioMetadata:{format,sizeBytes:file.size,trimmed:isTrimmed||Boolean(metadata?.trimmed)}});dialog.current?.close();
  }catch(problem){setError(problem.message||'The audio could not be trimmed.');setBusy(false);}
 };
 const path=peaks.map(([low,high],i)=>{const time=(i+.5)/peaks.length*duration;if(time<offset||time>viewEnd)return '';const x=(time-offset)/span*1000;return `M${x.toFixed(2)},${(90-high*76).toFixed(2)}V${(90-low*76).toFixed(2)}`;}).join('');
 const ready=duration>0&&!loading,trimmed=ready&&(start>0||end<duration);
 return <dialog ref={dialog} className="sample-trimmer audio-trimmer" aria-labelledby="audio-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
  <header><span className="audio-trimmer-header-icon"><Scissors size={22}/></span><div><small>AUDIO EDITOR</small><h2 id="audio-trimmer-title">Trim audio</h2><p>Drag the handles to choose what to keep. Click the waveform to position playback.</p></div><button type="button" aria-label="Close audio editor" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
  <div className="sample-trimmer-body">
   <div className="audio-trimmer-toolbar">
    <div className="audio-trimmer-transport"><button type="button" className="trim-icon-button" title="Return to selection start" aria-label="Return to selection start" disabled={!ready||busy} onClick={()=>{stop();setCursor(start);}}><SkipBack size={18}/></button><button type="button" className="trim-play-button" title={playing?'Pause':'Play selection'} aria-label={playing?'Pause selection':'Play selection'} disabled={!ready||busy} onClick={preview}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><div className="trim-position"><strong>{trimClock(cursor)}</strong><span>/ {trimClock(duration)}</span></div></div>
    <div className="audio-trimmer-zoom"><span>Zoom</span><button type="button" className="trim-icon-button" title="Zoom out" aria-label="Zoom out" disabled={!ready||busy||zoom<=1} onClick={()=>changeZoom(zoom/1.5)}><ZoomOut size={17}/></button><output>{zoom.toFixed(1)}×</output><button type="button" className="trim-icon-button" title="Zoom in" aria-label="Zoom in" disabled={!ready||busy||zoom>=16} onClick={()=>changeZoom(zoom*1.5)}><ZoomIn size={17}/></button><button type="button" className="trim-text-button" title="Fit selected region in view" disabled={!ready||busy} onClick={fitSelection}><ScanLine size={17}/><span>Fit selection</span></button></div>
   </div>
   <div ref={wave} className={`audio-trimmer-wave${loading?' is-loading':''}`} onPointerDown={event=>pointerDown(event,'cursor')} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <svg viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="1000" y1="90" y2="90" className="audio-trimmer-zero"/><path d={path}/></svg>
    {ready&&<><div className="audio-trimmer-discard" style={{left:0,width:`${Math.max(0,Math.min(100,position(start)))}%`}}/><div className="audio-trimmer-discard" style={{right:0,width:`${Math.max(0,Math.min(100,100-position(end)))}%`}}/><div className="audio-trimmer-selection" style={{left:`${Math.max(0,position(start))}%`,right:`${Math.max(0,100-position(end))}%`}}/>
    {[['start',start],['end',end]].map(([edge,time])=>position(time)>=0&&position(time)<=100&&<div key={edge} className={`audio-trimmer-handle is-${edge}`} role="slider" tabIndex={busy?-1:0} aria-label={`Trim ${edge}`} aria-disabled={busy} aria-valuemin={edge==='start'?0:start+Math.min(.05,duration)} aria-valuemax={edge==='start'?end-Math.min(.05,duration):duration} aria-valuenow={time} aria-valuetext={trimClock(time)} style={{left:`${position(time)}%`}} onPointerDown={event=>{event.stopPropagation();pointerDown(event,edge);}} onKeyDown={event=>{if(!busy)keyboard(event,edge);}}><span/></div>)}
    {cursor>=offset&&cursor<=viewEnd&&<div className="audio-trimmer-playhead" style={{left:`${position(cursor)}%`}}/>}</>}
    {loading&&<span className="audio-trimmer-loading" role="status">Loading waveform…</span>}
   </div>
   <div className="audio-trimmer-ruler" aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i}>{trimClock(offset+span*i/4)}</span>)}</div>
   {zoom>1&&<label className="audio-trimmer-pan">Scroll waveform<input aria-label="Waveform position" type="range" min="0" max={duration-span} step="0.01" value={offset} disabled={busy} onChange={event=>setOffset(Number(event.target.value))}/></label>}
   <div className="audio-trimmer-fields">
    <label><span className="trim-field-caption"><i/>In point <button type="button" title="Set start to playhead" disabled={!ready||busy} onClick={()=>change(Math.min(cursor,end-Math.min(.05,duration)),end)}>Set at playhead</button></span><div className="trim-time-input"><input aria-label="Trim start seconds" type="number" min="0" max={Math.max(0,end-.05)} step="0.01" value={Number(start.toFixed(2))} disabled={!ready||busy} onChange={event=>change(Math.min(Number(event.target.value),end-Math.min(.05,duration)),end)}/><span>sec</span></div><small>{trimClock(start)}</small></label>
    <div className="trim-selection-length"><span>Selection duration</span><strong>{trimClock(end-start)}</strong><small>{ready?`${Math.round((end-start)/duration*100)}% of recording`:'Loading audio…'}</small></div>
    <label><span className="trim-field-caption"><i/>Out point <button type="button" title="Set end to playhead" disabled={!ready||busy} onClick={()=>change(start,Math.max(cursor,start+Math.min(.05,duration)))}>Set at playhead</button></span><div className="trim-time-input"><input aria-label="Trim end seconds" type="number" min={start+Math.min(.05,duration)} max={duration} step="0.01" value={Number(end.toFixed(2))} disabled={!ready||busy} onChange={event=>change(start,Math.max(Number(event.target.value),start+Math.min(.05,duration)))}/><span>sec</span></div><small>{trimClock(end)}</small></label>
   </div>
   <fieldset className="trim-export-options" disabled={busy}><legend>Export format</legend><div>{EXPORT_FORMATS.map(option=><label key={option.id} className={exportFormat===option.id?'is-selected':''}><input type="radio" name="trim-export-format" value={option.id} checked={exportFormat===option.id} onChange={()=>setExportFormat(option.id)}/><span><strong>{option.label}</strong><small>{option.description||`${option.bitrateKbps} kbps`}</small></span><output>≈ {estimatedMB(option,end-start,decoded.current,start,end)}</output></label>)}</div><p>Estimated size for the selection. MP3 and WAV are prepared in this browser. AAC is compressed when you save the recording.</p>{compressionError&&exportFormat==='aac'&&<p role="alert">{compressionError}</p>}</fieldset>
   <p className="sample-trimmer-note">The trimmed audio stays in this browser until you click Save recording. The whole draft is kept in this browser until the database save succeeds.</p>
   {error&&<p className="sample-trimmer-error" role="alert">{error} {!decoded.current&&<button type="button" onClick={()=>setRetry(value=>value+1)}>Retry loading</button>}</p>}
  </div>
  <footer><button type="button" className="trim-reset" disabled={!ready||busy} onClick={()=>{change(0,duration);setZoom(1);setOffset(0);}}><RotateCcw size={16}/>Reset trim</button><span className="trim-footer-summary">{trimmed?`Keeping ${trimClock(end-start)} of ${trimClock(duration)}`:'Full recording selected'}</span><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="sample-trimmer-save" disabled={busy||!ready||(exportFormat==='wav'?!trimmed:exportFormat==='aac'&&!compressionReady)} onClick={apply}><Scissors size={16}/>{busy?(exportFormat==='mp3'?'Encoding MP3…':'Preparing draft…'):`Apply trim · ${exportFormat.toUpperCase()}`}</button></footer>
 </dialog>;
}
