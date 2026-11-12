import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {AudioWaveform,Download,Pause,Play,Scissors,Volume2,VolumeX,RefreshCw} from 'lucide-react';
import {trimClock} from '../lib/audioTrim';
import {bufferFor,buildPyramid,pyramidPath,viewBoxX} from '../lib/waveformPyramid';
import './transcriptionAudioTape.css';
const MAX_WAVEFORM_BYTES=100*1024*1024;
const waveformCache=new Map();
const audioFormat=(src,type='')=>{
 const formats={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/flac':'flac','audio/webm':'webm'};
 try{const extension=new URL(src,window.location.href).pathname.match(/\.(mp3|m4a|aac|wav|ogg|flac|webm)$/i)?.[1];if(extension)return extension.toUpperCase();}catch{}
 return (formats[type.split(';')[0]]||'').toUpperCase();
};

// Ruler ticks for the visible window: a readable major step (1 s, 5 s, 30 s, 1 min …) with five minor ticks between, relabelled at every zoom level.
const RULER_STEPS=[.01,.02,.05,.1,.2,.5,1,2,5,10,15,30,60,120,300,600,900,1800,3600];
function rulerTicks(start,span,duration){
 if(!(span>0)||!(duration>0))return [];
 const major=RULER_STEPS.find(step=>step>=span/7)||3600,minor=major/5,end=start+span,digits=major<.1?2:major<1?1:0,out=[];
 const label=time=>{const total=Math.max(0,time),whole=Math.floor(total),rest=total-whole,text=`${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;return digits?`${text}.${rest.toFixed(digits).slice(2)}`:text;};
 for(let index=Math.floor(start/minor);index*minor<=end+minor*.01;index++){
  const time=Math.round(index*minor*1000)/1000;if(time<0||time>duration)continue;
  const isMajor=Math.abs(time/major-Math.round(time/major))<1e-6;
  out.push({time,major:isMajor,label:isMajor?label(time):'',position:(time-start)/span*100});
 }
 return out;
}
export default function TranscriptionAudioTape({src,metadata,onDuration,onTimeChange,onTrimApply,controls,lanes,seekTo,regions=[],onRegionSelect,onRegionChange,onRegionMove,onMasterDownload,trimDisabled=false}){
 const audio=useRef(null),head=useRef(null),progress=useRef(null),callback=useRef(onTimeChange),clipId=useId().replaceAll(':','');
 callback.current=onTimeChange;
 useEffect(()=>{const pauseOther=event=>{if(event.detail!==audio.current)audio.current?.pause();};window.addEventListener('echo:recording-audio-play',pauseOther);return()=>window.removeEventListener('echo:recording-audio-play',pauseOther);},[]);
 const [discovered,setDiscovered]=useState(null);
 const format=metadata?.format?.toUpperCase()||discovered?.format||audioFormat(src);
 const sizeBytes=metadata?.sizeBytes??discovered?.sizeBytes;
 const [view,setView]=useState({z:1,s:0}),[masterVolume,setMasterVolume]=useState(1),[muted,setMuted]=useState(false),[retry,setRetry]=useState(0),[waveError,setWaveError]=useState('');
 const [playing,setPlaying]=useState(false),[duration,setDuration]=useState(0),[time,setTime]=useState(0),[peaks,setPeaks]=useState(null),[waveStatus,setWaveStatus]=useState('Loading audio…'),[error,setError]=useState('');
 const viewRef=useRef(view);viewRef.current=view;
 // Smooth follow: while playing zoomed in, the window slides every frame by touching only transforms and viewBoxes (no React re-render).
 const liveS=useRef(0),following=useRef(false),buf=bufferFor(view.s,view.z,duration||1),bufRef=useRef(buf);bufRef.current=buf;
 if(!following.current)liveS.current=view.s;
 const live=liveS.current;
 const paint=value=>{const position=duration?Math.min(100,Math.max(0,value/duration*100)):0;if(head.current)head.current.style.left=`${position}%`;if(progress.current){const {from:start,span,units}=bufRef.current;progress.current.setAttribute('width',String(duration?Math.min(units,Math.max(0,(value-start)/span*1000)):0));}};
 useEffect(()=>{paint(audio.current?.currentTime||0);// eslint-disable-next-line react-hooks/exhaustive-deps
 },[view,duration]);
 useEffect(()=>{setDiscovered(null);setDuration(0);setTime(0);setPlaying(false);setPeaks(null);setError('');setWaveStatus('Loading audio…');setWaveError('');setView({z:1,s:0});},[src]);
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
   let buffer;try{const context=new Context(1,1,16000);buffer=await context.decodeAudioData(data.buffer);}catch{throw Error('This audio could not be decoded for its waveform. Try WAV or MP3 audio.');}
   if(active){const next=buildPyramid(buffer.getChannelData(0),buffer.sampleRate);waveformCache.set(src,{peaks:next,metadata:fileMetadata});if(waveformCache.size>6)waveformCache.delete(waveformCache.keys().next().value);setPeaks(next);setWaveStatus('');}
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
 useEffect(()=>{if(audio.current)audio.current.volume=masterVolume;},[masterVolume,src]);
 const regionDrag=useRef(null);
 const moveRegion=(id,edge,value)=>{const region=regions.find(row=>row.id===id);if(region)onRegionChange?.(id,{start:edge==='start'?Math.min(value,region.end-.01):region.start,end:edge==='end'?Math.max(value,region.start+.01):region.end});};
 const regionPointer=(event,region,edge)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);const box=event.currentTarget.getBoundingClientRect();regionDrag.current={id:region.id,edge,grab:event.clientX-(edge==='start'?box.left:box.right)};onRegionSelect?.(region.id);};
 const dragRegion=event=>{if(!regionDrag.current)return;const rect=event.currentTarget.parentElement.getBoundingClientRect(),value=Math.max(0,Math.min(duration,(event.clientX-regionDrag.current.grab-rect.left)/rect.width*duration));moveRegion(regionDrag.current.id,regionDrag.current.edge,value);};
 const regionKeyboard=(event,region,edge)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();moveRegion(region.id,edge,region[edge]+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?1:.1));onRegionSelect?.(region.id);};
 // Trim mode: two handles on this waveform choose what to keep; Apply re-encodes the draft.
 const [trimming,setTrimming]=useState(false),[trimRange,setTrimRange]=useState([0,0]),[trimBusy,setTrimBusy]=useState(false),[trimError,setTrimError]=useState('');
 const trimDrag=useRef(null),min=Math.min(.05,duration||.05);
 const openTrim=()=>{setTrimRange([0,duration]);setTrimError('');setTrimming(true);};
 const closeTrim=()=>{if(trimBusy)return;setTrimming(false);setTrimError('');};
 const trimPointer=(event,edge)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);trimDrag.current=edge;};
 const trimMove=event=>{
  const edge=trimDrag.current;if(!edge||!duration)return;
  const rect=event.currentTarget.parentElement.getBoundingClientRect(),time=Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration));
  setTrimRange(([from,to])=>edge==='in'?[Math.min(time,to-min),to]:[from,Math.max(time,from+min)]);
 };
 const trimKey=(event,edge)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const delta=(event.key==='ArrowRight'?1:-1)*(event.shiftKey?1:.05);setTrimRange(([from,to])=>edge==='in'?[Math.max(0,Math.min(from+delta,to-min)),to]:[from,Math.min(duration,Math.max(to+delta,from+min))]);};
 const applyTrim=async()=>{setTrimBusy(true);setTrimError('');try{await onTrimApply({from:trimRange[0],to:trimRange[1]});setTrimming(false);}catch(problem){setTrimError(problem.message||'The audio could not be trimmed.');}finally{setTrimBusy(false);}};
 const moveDrag=useRef(null);
 const timeAt=event=>{const rect=event.currentTarget.parentElement.getBoundingClientRect();return Math.max(0,Math.min(duration,(event.clientX-rect.left)/rect.width*duration));};
 const movePointer=(event,region)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);moveDrag.current={id:region.id,offset:timeAt(event)-region.start,x:event.clientX,moved:false};onRegionSelect?.(region.id);};
 const moveSlide=event=>{const drag=moveDrag.current;if(!drag)return;if(!drag.moved&&Math.abs(event.clientX-drag.x)<4)return;drag.moved=true;onRegionMove?.(drag.id,timeAt(event)-drag.offset);};
 const moveEnd=event=>{const drag=moveDrag.current;moveDrag.current=null;if(drag&&!drag.moved)seek(timeAt(event));};
 const moveKeyboard=(event,region)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();onRegionMove?.(region.id,region.start+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?1:.1));onRegionSelect?.(region.id);};
 const currentRegion=regions.find(region=>time>=region.start&&time<region.end);
 const regionStyle=region=>({left:`${Math.max(0,Math.min(100,region.start/duration*100))}%`,width:`${Math.max(0,Math.min(duration,region.end)-Math.max(0,region.start))/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`});
 const path=useMemo(()=>peaks&&duration?pyramidPath(peaks,buf.from,buf.to,1,buf.columns,35,buf.units):'',[peaks,buf.from,buf.to,buf.columns,buf.units,duration]);

 // The tape reaches down to the level footer (no empty band under it), whatever the page layout does.
 useEffect(()=>{
  const node=section.current;if(!node)return undefined;
  const fill=()=>{
   const footer=document.querySelector('.recording-level-footer');if(!footer){node.style.removeProperty('height');return;}
   node.style.removeProperty('height');
   node.style.setProperty('height',`${Math.max(160,Math.floor(footer.getBoundingClientRect().top-node.getBoundingClientRect().top))}px`,'important');
  };
  fill();const observer=new ResizeObserver(fill);observer.observe(document.body);
  window.addEventListener('resize',fill);window.addEventListener('scroll',fill,true);
  const timer=setInterval(fill,1500);
  return()=>{observer.disconnect();clearInterval(timer);window.removeEventListener('resize',fill);window.removeEventListener('scroll',fill,true);};
 },[duration]);
 // Zoom and pan (FL Studio style): the wheel zooms around the pointer, shift+wheel pans.
 const MAX_ZOOM=Math.max(64,Math.min(8000,Math.floor(duration/.04))),zoomStyle={width:`${view.z*100}%`,transform:`translateX(-${live*100}%)`};
 const fit=(z,start)=>{const next=Math.max(1,Math.min(MAX_ZOOM,z));return {z:next,s:Math.max(0,Math.min(1-1/next,start))};};
 const section=useRef(null);
 useEffect(()=>{
  const node=section.current;if(!node||!duration)return undefined;
  const wheel=event=>{
   const area=event.target.closest?.('.audio-tape-track,.stem-lane-wave');if(!area||!node.contains(area))return;
   const zoomed=area.querySelector(':scope>.audio-tape-zoom,:scope>.stem-lane-zoom');if(!zoomed)return;
   event.preventDefault();
   const rect=zoomed.getBoundingClientRect(),anchor=(event.clientX-rect.left)/rect.width;
   if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)){const delta=(event.deltaX||event.deltaY)/(rect.width/Math.max(1,view.z));setView(current=>fit(current.z,current.s+delta/current.z));return;}
   const factor=event.deltaY<0?1.18:1/1.18;
   setView(current=>{const nextZ=Math.max(1,Math.min(MAX_ZOOM,current.z*factor));return fit(nextZ,anchor-(anchor-current.s)*current.z/nextZ);});
  };
  node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);
 },[duration,view.z]);
 const applyLive=position=>{
  const root=section.current;if(!root)return;
  for(const element of root.querySelectorAll('.audio-tape-zoom,.stem-lane-zoom'))element.style.transform=`translateX(-${position*100}%)`;
  for(const svg of root.querySelectorAll('svg[data-wave-from]'))svg.setAttribute('viewBox',`${(position*duration-Number(svg.dataset.waveFrom))/Number(svg.dataset.waveSpan)*1000} 0 1000 80`);
 };
 const zoomed=view.z>1;
 useEffect(()=>{
  if(!playing||!duration||!zoomed)return undefined;
  following.current=true;let frame=0;
  const loop=()=>{
   const media=audio.current,{z}=viewRef.current;
   if(media){
    const target=Math.max(0,Math.min(1-1/z,media.currentTime/duration-.35/z));liveS.current=target;applyLive(target);
    const buffer=bufRef.current,start=target*duration,span=duration/z;
    if((buffer.from>0&&start<buffer.from+.05*span)||(buffer.to<duration&&start+span>buffer.to-.05*span))setView({z,s:target});
   }
   frame=requestAnimationFrame(loop);
  };
  frame=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(frame);following.current=false;setView(current=>current.s===liveS.current?current:{z:current.z,s:liveS.current});};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[playing,duration,zoomed]);
 return <section ref={section} className="transcription-audio-tape" aria-label="Recording waveform and playback">
  <audio ref={audio} src={src} preload="metadata" muted={muted} onLoadedMetadata={event=>{const seconds=Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0;setDuration(seconds);if(seconds)onDuration?.(seconds);}} onPlay={()=>{setPlaying(true);window.dispatchEvent(new CustomEvent('echo:recording-audio-play',{detail:audio.current}));}} onPause={()=>{setPlaying(false);sync();}} onEnded={()=>{setPlaying(false);sync();}} onTimeUpdate={sync} onSeeked={sync} onError={()=>{setPlaying(false);setWaveStatus('');setError('Recording audio is unavailable.');}}/>
  <div className="audio-tape-main">
  <div className="audio-tape-bar">
   <header className="stem-lanes-head audio-tape-master-head"><div className="stem-lanes-heading"><span className="stem-lanes-icon" aria-hidden="true"><AudioWaveform size={16}/></span><div><strong>Master</strong><small><i className="stem-lanes-dot is-saved" aria-hidden="true"/>{[format,duration?trimClock(duration):''].filter(Boolean).join(' · ')||'Original recording'}</small></div></div></header>
  <div className="audio-tape-toolbar"><span className="audio-tape-clock">{trimClock(time)} <small>/ {trimClock(duration)}</small></span><button type="button" aria-label={muted?'Unmute recording':'Mute recording'} title={muted?'Unmute':'Mute'} aria-pressed={muted} onClick={()=>setMuted(value=>!value)}>{muted?<VolumeX size={18} strokeWidth={2.25}/>:<Volume2 size={18} strokeWidth={2.25}/>}</button>{onTrimApply&&<button type="button" className="audio-tape-trim" title="Trim the recording on this waveform" aria-label="Trim the recording" aria-pressed={trimming} disabled={trimDisabled||!duration||trimBusy} onClick={()=>{audio.current?.pause();if(trimming)closeTrim();else openTrim();}}><Scissors size={18} strokeWidth={2.25}/></button>}{onRegionChange&&<span id="recording-atom-add-slot" className="recording-atom-add-slot"/>}{lanes&&<span id="recording-stem-slot" className="recording-stem-slot"/>}</div>
  {(format||Number.isFinite(sizeBytes)||metadata?.trimmed)&&<div className="audio-tape-file-info" aria-label="Audio file information">{format&&<span className="audio-tape-file-format">{format}</span>}{Number.isFinite(sizeBytes)&&<span>{(sizeBytes/1024/1024).toFixed(2)} MB</span>}{metadata?.trimmed&&<span className="audio-tape-trimmed">TRIMMED</span>}</div>}
  {currentRegion&&<div className="audio-tape-current-atom" aria-live="off"><span>Playing atom {currentRegion.index+1}</span><strong>{currentRegion.name}</strong></div>}
  </div>
  <span className="audio-tape-row-break" aria-hidden="true"/>
  <div className="stem-lane-strip audio-tape-master-strip" style={{'--lane':'hsl(40 12% 80%)'}}><strong>Master<small>{Math.round((muted?0:masterVolume)*100)}%</small></strong><div className="stem-lane-buttons"><button type="button" className="is-round" disabled={!duration} onClick={toggle} aria-label={playing?'Pause master':'Play master'} title={playing?'Pause':'Play'}>{playing?<Pause size={11} fill="currentColor"/>:<Play size={11} fill="currentColor"/>}</button>{onMasterDownload&&<button type="button" className="is-round" disabled={!duration} onClick={onMasterDownload} aria-label="Download master" title="Download the merged audio"><Download size={11}/></button>}<button type="button" aria-label="Mute master" aria-pressed={muted} onClick={()=>setMuted(value=>!value)}>M</button></div><input type="range" min="0" max="1" step=".01" value={masterVolume} style={{'--v':`${masterVolume*100}%`}} aria-label="Master volume" onChange={event=>setMasterVolume(Number(event.target.value))}/></div>
  <div className={`audio-tape-track${onRegionChange?' has-atom-handles':''}${playing?' is-playing':''}`}>
   <div className="audio-tape-ruler" aria-hidden="true">{rulerTicks(view.s*duration,duration/view.z,duration).map(tick=><i key={tick.time} className={tick.major?'is-major':''} style={{left:`${tick.position}%`}}>{tick.label&&<b>{tick.label}</b>}</i>)}</div>
   <svg viewBox={`${viewBoxX(live,duration||1,buf)} 0 1000 80`} data-wave-from={buf.from} data-wave-span={buf.span} preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id={clipId}><rect ref={progress} x="0" y="0" width={duration?Math.min(buf.units,Math.max(0,(time-buf.from)/buf.span*1000)):0} height="80"/></clipPath></defs><line x1="0" y1="40" x2={buf.units} y2="40" className="audio-tape-baseline"/><path d={path} className="audio-tape-wave"/><path d={path} className="audio-tape-wave is-played" clipPath={`url(#${clipId})`}/></svg>
   <div className="audio-tape-zoom" style={zoomStyle}>
   {duration>0&&regions.map(region=><span key={region.id} className={`audio-tape-atom-region${currentRegion?.id===region.id?' is-current':''}`} style={regionStyle(region)} aria-hidden="true"/>)}
   {duration>0&&onRegionChange&&regions.flatMap(region=>['start','end'].map(edge=><button key={`${region.id}:${edge}`} type="button" className={`audio-tape-atom-handle is-${edge}`} role="slider" aria-label={`Atom ${region.index+1} ${edge} point`} aria-valuemin={edge==='start'?0:region.start+.01} aria-valuemax={edge==='end'?duration:region.end-.01} aria-valuenow={region[edge]} aria-valuetext={trimClock(region[edge])} title={`Drag atom ${region.index+1} ${edge} · ${trimClock(region[edge])}`} style={{left:`${region[edge]/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`}} onPointerDown={event=>regionPointer(event,region,edge)} onPointerMove={dragRegion} onPointerUp={event=>{if(regionDrag.current)dragRegion(event);regionDrag.current=null;}} onPointerCancel={()=>{regionDrag.current=null;}} onKeyDown={event=>regionKeyboard(event,region,edge)}><span>{region.index+1}</span></button>))}
   {duration>0&&onRegionMove&&regions.map(region=><button key={`${region.id}:move`} type="button" className="audio-tape-atom-move" role="slider" aria-label={`Move atom ${region.index+1}`} aria-valuemin={0} aria-valuemax={Math.max(0,duration-(region.end-region.start))} aria-valuenow={region.start} aria-valuetext={`${trimClock(region.start)} to ${trimClock(region.end)}`} style={regionStyle(region)} onPointerDown={event=>movePointer(event,region)} onPointerMove={moveSlide} onPointerUp={moveEnd} onPointerCancel={()=>{moveDrag.current=null;}} onKeyDown={event=>moveKeyboard(event,region)}></button>)}
   {trimming&&duration>0&&<><span className="audio-tape-trim-shade is-before" style={{width:`${trimRange[0]/duration*100}%`}} aria-hidden="true"/><span className="audio-tape-trim-shade is-after" style={{left:`${trimRange[1]/duration*100}%`}} aria-hidden="true"/>{['in','out'].map(edge=><button key={edge} type="button" role="slider" className={`audio-tape-trim-handle is-${edge}`} aria-label={edge==='in'?'Keep from':'Keep until'} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={edge==='in'?trimRange[0]:trimRange[1]} aria-valuetext={trimClock(edge==='in'?trimRange[0]:trimRange[1])} style={{left:`${(edge==='in'?trimRange[0]:trimRange[1])/duration*100}%`}} onPointerDown={event=>trimPointer(event,edge)} onPointerMove={trimMove} onPointerUp={()=>{trimDrag.current=null;}} onPointerCancel={()=>{trimDrag.current=null;}} onKeyDown={event=>trimKey(event,edge)}/>)}</>}
   <span ref={head} className="audio-tape-playhead" style={{left:`${duration?time/duration*100:0}%`}} aria-hidden="true" onPointerDown={event=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!event.currentTarget.hasPointerCapture(event.pointerId)||!duration)return;const rect=event.currentTarget.parentElement.getBoundingClientRect();seek(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*duration);}}/>
   <input type="range" aria-label="Recording playback position in seconds" aria-valuetext={`${trimClock(time)} of ${trimClock(duration)}`} min="0" max={duration||0} step="0.01" value={Math.min(time,duration)} disabled={!duration} onChange={event=>seek(Number(event.target.value))}/>
   </div>
  </div>
  {trimming&&duration>0&&<div className="audio-tape-trim-bar" role="group" aria-label="Trim recording"><span><small>Keep from</small><strong>{trimClock(trimRange[0])}</strong></span><span><small>Keep until</small><strong>{trimClock(trimRange[1])}</strong></span><span><small>Duration</small><strong>{trimClock(trimRange[1]-trimRange[0])}</strong></span><div className="audio-tape-trim-actions"><button type="button" onClick={()=>setTrimRange([0,duration])} disabled={trimBusy}>Reset</button><button type="button" onClick={closeTrim} disabled={trimBusy}>Cancel</button><button type="button" className="is-primary" onClick={applyTrim} disabled={trimBusy||(trimRange[0]<=0&&trimRange[1]>=duration)}>{trimBusy?'Trimming…':'Apply trim'}</button></div>{trimError&&<p role="alert">{trimError}</p>}</div>}
  
  </div>
  {waveStatus&&<p role="status">{waveStatus}</p>}{waveError&&<div className="audio-tape-wave-error"><p role="alert">{waveError}</p><button type="button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={13}/>Retry waveform</button></div>}{error&&<p role="alert">{error}</p>}
 {lanes&&<div className="audio-tape-lanes">{lanes({audio,duration,regions,seek,master:muted?0:masterVolume,view:{...view,live},currentRegionId:currentRegion?.id||null,playing})}</div>}
 {controls&&<div className="audio-tape-controls">{controls}</div>}
 </section>;
}
