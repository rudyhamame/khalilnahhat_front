import {useEffect,useId,useRef,useState} from 'react';
import {Pause,Play,Scissors,Volume2,VolumeX,RefreshCw} from 'lucide-react';
import {trimClock,waveformPeaks} from '../lib/audioTrim';
import './transcriptionAudioTape.css';
const MAX_WAVEFORM_BYTES=100*1024*1024;
const waveformCache=new Map();
const audioFormat=(src,type='')=>{
 const formats={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/flac':'flac','audio/webm':'webm'};
 try{const extension=new URL(src,window.location.href).pathname.match(/\.(mp3|m4a|aac|wav|ogg|flac|webm)$/i)?.[1];if(extension)return extension.toUpperCase();}catch{}
 return (formats[type.split(';')[0]]||'').toUpperCase();
};

export default function TranscriptionAudioTape({src,metadata,onDuration,onTimeChange,onTrim,controls,lanes,seekTo,regions=[],onRegionSelect,onRegionChange,onRegionMove,trimDisabled=false}){
 const audio=useRef(null),head=useRef(null),progress=useRef(null),callback=useRef(onTimeChange),clipId=useId().replaceAll(':','');
 callback.current=onTimeChange;
 useEffect(()=>{const pauseOther=event=>{if(event.detail!==audio.current)audio.current?.pause();};window.addEventListener('echo:recording-audio-play',pauseOther);return()=>window.removeEventListener('echo:recording-audio-play',pauseOther);},[]);
 const [discovered,setDiscovered]=useState(null);
 const format=metadata?.format?.toUpperCase()||discovered?.format||audioFormat(src);
 const sizeBytes=metadata?.sizeBytes??discovered?.sizeBytes;
 const [muted,setMuted]=useState(false),[retry,setRetry]=useState(0),[waveError,setWaveError]=useState('');
 const [playing,setPlaying]=useState(false),[duration,setDuration]=useState(0),[time,setTime]=useState(0),[peaks,setPeaks]=useState([]),[waveStatus,setWaveStatus]=useState('Loading audio…'),[error,setError]=useState('');
 const paint=value=>{const position=duration?Math.min(100,Math.max(0,value/duration*100)):0;if(head.current)head.current.style.left=`${position}%`;if(progress.current)progress.current.setAttribute('width',String(position*10));};
 useEffect(()=>{setDiscovered(null);setDuration(0);setTime(0);setPlaying(false);setPeaks([]);setError('');setWaveStatus('Loading audio…');setWaveError('');},[src]);
 useEffect(()=>{
  if(!duration)return;
  const request=new AbortController();let active=true;
  setWaveError('');
  if(waveformCache.has(src)){const cached=waveformCache.get(src);setPeaks(cached.peaks);setDiscovered(cached.metadata);setWaveStatus('');return;}
  if(duration>1800){
   setWaveStatus('Waveform unavailable for audio over 30 minutes. Playback and seeking are available.');
   fetch(src,{method:'HEAD',signal:request.signal}).then(response=>{if(active&&response.ok){const size=Number(response.headers.get('content-length'));setDiscovered({format:audioFormat(src,response.headers.get('content-type')||''),sizeBytes:size>0?size:undefined});}}).catch(()=>{});
   return()=>{active=false;request.abort();};
  }
  setWaveStatus('Building waveform…');
  (async()=>{
   const response=await fetch(src,{signal:request.signal});if(!response.ok)throw Error(`Audio download failed (${response.status}).`);
   if(Number(response.headers.get('content-length'))>MAX_WAVEFORM_BYTES)throw Error('Waveform audio must be under 100 MB.');
   const chunks=[];let bytes=0;
   if(response.body?.getReader){
    const reader=response.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_WAVEFORM_BYTES){await reader.cancel();throw Error('Waveform audio must be under 100 MB.');}chunks.push(value);}}
    finally{reader.releaseLock();}
   }else{const data=new Uint8Array(await response.arrayBuffer());bytes=data.byteLength;if(bytes>MAX_WAVEFORM_BYTES)throw Error('Waveform audio must be under 100 MB.');chunks.push(data);} 
   const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}chunks.length=0;
   if(!active)return;
   const fileMetadata={format:audioFormat(src,response.headers.get('content-type')||''),sizeBytes:bytes};setDiscovered(fileMetadata);
   const Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;
   if(!Context)throw Error('Waveform decoding is not supported in this browser.');
   let buffer;try{const context=new Context(1,1,8000);buffer=await context.decodeAudioData(data.buffer);}catch{throw Error('This audio could not be decoded for its waveform. Try WAV or MP3 audio.');}
   if(active){const next=waveformPeaks(buffer,900);waveformCache.set(src,{peaks:next,metadata:fileMetadata});if(waveformCache.size>6)waveformCache.delete(waveformCache.keys().next().value);setPeaks(next);setWaveStatus('');}
  })().catch(error=>{if(active){setWaveStatus('');setWaveError(error instanceof TypeError?'Audio could not be downloaded for the waveform. Retry or check the audio URL’s access permissions.':error.message||'The waveform could not be loaded.');}});
  return()=>{active=false;request.abort();};
 },[src,duration,retry]);
 useEffect(()=>{
  let frame=0,lastUpdate=0;
  const tick=now=>{const value=audio.current?.currentTime||0;paint(value);if(now-lastUpdate>=80){setTime(value);callback.current?.(value);lastUpdate=now;}frame=requestAnimationFrame(tick);};
  if(playing)frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[playing,duration]);
 const sync=()=>{const value=audio.current?.currentTime||0;setTime(value);paint(value);callback.current?.(value);};
 const seek=value=>{if(!audio.current||!duration)return;audio.current.currentTime=Math.min(duration,Math.max(0,value));sync();};
 useEffect(()=>{if(seekTo&&duration)seek(seekTo.time);},[seekTo,duration]);
 const toggle=async()=>{if(!audio.current)return;if(playing){audio.current.pause();return;}try{setError('');await audio.current.play();}catch{setError('Audio could not play. Try again.');}};
 const regionDrag=useRef(null);
 const moveRegion=(id,edge,value)=>{const region=regions.find(row=>row.id===id);if(region)onRegionChange?.(id,{start:edge==='start'?Math.min(value,region.end-.01):region.start,end:edge==='end'?Math.max(value,region.start+.01):region.end});};
 const regionPointer=(event,region,edge)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);regionDrag.current={id:region.id,edge};onRegionSelect?.(region.id);};
 const dragRegion=event=>{if(!regionDrag.current)return;const rect=event.currentTarget.parentElement.getBoundingClientRect(),value=Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration));moveRegion(regionDrag.current.id,regionDrag.current.edge,value);};
 const regionKeyboard=(event,region,edge)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();moveRegion(region.id,edge,region[edge]+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?1:.1));onRegionSelect?.(region.id);};
 const moveDrag=useRef(null);
 const timeAt=event=>{const rect=event.currentTarget.parentElement.getBoundingClientRect();return Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration));};
 const movePointer=(event,region)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);moveDrag.current={id:region.id,offset:timeAt(event)-region.start,x:event.clientX,moved:false};onRegionSelect?.(region.id);};
 const moveSlide=event=>{const drag=moveDrag.current;if(!drag)return;if(!drag.moved&&Math.abs(event.clientX-drag.x)<4)return;drag.moved=true;onRegionMove?.(drag.id,timeAt(event)-drag.offset);};
 const moveEnd=event=>{const drag=moveDrag.current;moveDrag.current=null;if(drag&&!drag.moved)seek(timeAt(event));};
 const moveKeyboard=(event,region)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();onRegionMove?.(region.id,region.start+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?1:.1));onRegionSelect?.(region.id);};
 const currentRegion=regions.find(region=>time>=region.start&&time<region.end);
 const regionStyle=region=>({left:`${Math.max(0,Math.min(100,region.start/duration*100))}%`,width:`${Math.max(0,Math.min(duration,region.end)-Math.max(0,region.start))/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`});
 const path=peaks.map(([low,high],index)=>{const x=(index+.5)/peaks.length*1000;return `M${x.toFixed(2)},${(40-high*35).toFixed(2)}V${(40-low*35).toFixed(2)}`;}).join('');
 return <section className="transcription-audio-tape" aria-label="Recording waveform and playback">
  <audio ref={audio} src={src} preload="metadata" muted={muted} onLoadedMetadata={event=>{const seconds=Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0;setDuration(seconds);if(seconds)onDuration?.(seconds);}} onPlay={()=>{setPlaying(true);window.dispatchEvent(new CustomEvent('echo:recording-audio-play',{detail:audio.current}));}} onPause={()=>{setPlaying(false);sync();}} onEnded={()=>{setPlaying(false);sync();}} onTimeUpdate={sync} onSeeked={sync} onError={()=>{setPlaying(false);setWaveStatus('');setError('Recording audio is unavailable.');}}/>
  <div className="audio-tape-toolbar"><button type="button" disabled={!duration} onClick={toggle} title={playing?'Pause recording':'Play recording'} aria-label={playing?'Pause recording':'Play recording'}>{playing?<Pause size={18} strokeWidth={2.25}/>:<Play size={18} strokeWidth={2.25}/>}</button><span className="audio-tape-clock">{trimClock(time)} <small>/ {trimClock(duration)}</small></span><span className="audio-tape-hint">Drag to seek</span><button type="button" aria-label={muted?'Unmute recording':'Mute recording'} title={muted?'Unmute':'Mute'} aria-pressed={muted} onClick={()=>setMuted(value=>!value)}>{muted?<VolumeX size={18} strokeWidth={2.25}/>:<Volume2 size={18} strokeWidth={2.25}/>}</button>{onTrim&&<button type="button" className="audio-tape-trim" title="Trim recording audio" aria-label="Trim recording audio" disabled={trimDisabled||!duration} onClick={()=>{audio.current?.pause();onTrim();}}><Scissors size={18} strokeWidth={2.25}/></button>}{onRegionChange&&<span id="recording-atom-add-slot" className="recording-atom-add-slot"/>}</div>
  {(format||Number.isFinite(sizeBytes)||metadata?.trimmed)&&<div className="audio-tape-file-info" aria-label="Audio file information">{format&&<span className="audio-tape-file-format">{format}</span>}{Number.isFinite(sizeBytes)&&<span>{(sizeBytes/1024/1024).toFixed(2)} MB</span>}{metadata?.trimmed&&<span className="audio-tape-trimmed">TRIMMED</span>}</div>}
  {currentRegion&&<div className="audio-tape-current-atom" aria-live="off"><span>Playing atom {currentRegion.index+1}</span><strong>{currentRegion.name}</strong></div>}
  <div className={`audio-tape-track${onRegionChange?' has-atom-handles':''}`}>
   {duration>0&&regions.map(region=><span key={region.id} className={`audio-tape-atom-region${currentRegion?.id===region.id?' is-current':''}`} style={regionStyle(region)} aria-hidden="true"/>)}
   <svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id={clipId}><rect ref={progress} x="0" y="0" width={duration?time/duration*1000:0} height="80"/></clipPath></defs><line x1="0" y1="40" x2="1000" y2="40" className="audio-tape-baseline"/><path d={path} className="audio-tape-wave"/><path d={path} className="audio-tape-wave is-played" clipPath={`url(#${clipId})`}/></svg>
   {duration>0&&onRegionChange&&regions.flatMap(region=>['start','end'].map(edge=><button key={`${region.id}:${edge}`} type="button" className={`audio-tape-atom-handle is-${edge}`} role="slider" aria-label={`Atom ${region.index+1} ${edge} point`} aria-valuemin={edge==='start'?0:region.start+.01} aria-valuemax={edge==='end'?duration:region.end-.01} aria-valuenow={region[edge]} aria-valuetext={trimClock(region[edge])} title={`Drag atom ${region.index+1} ${edge} · ${trimClock(region[edge])}`} style={{left:`${region[edge]/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`}} onPointerDown={event=>regionPointer(event,region,edge)} onPointerMove={dragRegion} onPointerUp={event=>{if(regionDrag.current)dragRegion(event);regionDrag.current=null;}} onPointerCancel={()=>{regionDrag.current=null;}} onKeyDown={event=>regionKeyboard(event,region,edge)}><span>{region.index+1}</span></button>))}
   {duration>0&&onRegionMove&&regions.map(region=><button key={`${region.id}:move`} type="button" className="audio-tape-atom-move" role="slider" aria-label={`Move atom ${region.index+1}`} aria-valuemin={0} aria-valuemax={Math.max(0,duration-(region.end-region.start))} aria-valuenow={region.start} aria-valuetext={`${trimClock(region.start)} to ${trimClock(region.end)}`} style={regionStyle(region)} onPointerDown={event=>movePointer(event,region)} onPointerMove={moveSlide} onPointerUp={moveEnd} onPointerCancel={()=>{moveDrag.current=null;}} onKeyDown={event=>moveKeyboard(event,region)}></button>)}
   <span ref={head} className="audio-tape-playhead" style={{left:`${duration?time/duration*100:0}%`}} aria-hidden="true"/>
   <input type="range" aria-label="Recording playback position in seconds" aria-valuetext={`${trimClock(time)} of ${trimClock(duration)}`} min="0" max={duration||0} step="0.01" value={Math.min(time,duration)} disabled={!duration} onChange={event=>seek(Number(event.target.value))}/>
  </div>
  {duration>0&&regions.length>0&&<div className="audio-tape-atom-markers" aria-label="Atom positions on recording">{regions.map(region=><button key={region.id} type="button" style={regionStyle(region)} title={`${region.name}: ${trimClock(region.start)}–${trimClock(region.end)}`} aria-label={`Go to atom ${region.index+1}: ${region.name}, ${trimClock(region.start)} to ${trimClock(region.end)}`} aria-current={currentRegion?.id===region.id?'true':undefined} onClick={()=>{seek(region.start);onRegionSelect?.(region.id);}}><b>{region.index+1}</b><span>{region.name}</span></button>)}</div>}
  <div className="audio-tape-ruler">{[0,.25,.5,.75,1].map(fraction=><span key={fraction}>{trimClock(duration*fraction)}</span>)}</div>
  {waveStatus&&<p role="status">{waveStatus}</p>}{waveError&&<div className="audio-tape-wave-error"><p role="alert">{waveError}</p><button type="button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={13}/>Retry waveform</button></div>}{error&&<p role="alert">{error}</p>}
 {lanes&&<div className="audio-tape-lanes">{lanes({audio,duration,regions,seek})}</div>}
 {controls&&<div className="audio-tape-controls">{controls}</div>}
 </section>;
}
