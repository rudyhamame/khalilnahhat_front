import {useCallback,useEffect,useRef,useState} from 'react';
import {Layers,RotateCcw} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {STEM_CHANNELS,initialStemMix,stemGain} from '../lib/stemMix';
import {waveformPeaks} from '../lib/audioTrim';
import './stemLanes.css';

const LABELS={vocals:'Vocals',drums:'Drums',bass:'Bass',other:'Other'};
const HUES={vocals:330,drums:35,bass:210,other:150};
const pathFor=peaks=>peaks.map(([low,high],index)=>{const x=(index+.5)/peaks.length*1000;return `M${x.toFixed(2)},${(40-high*36).toFixed(2)}V${(40-low*36).toFixed(2)}`;}).join('');

// FL Studio style channel panel: one lane per separated stem with mute / solo / volume, sharing the atom segments and the playhead.
export default function StemLanes({audioUrl,fingerprint,ensureUploaded,token,audio,duration,regions=[],seek}){
 const remote=/^https:/.test(audioUrl||'');
 const [status,setStatus]=useState({state:'idle',stage:'',channels:[]});
 const [peaks,setPeaks]=useState({}),[mix,setMix]=useState(initialStemMix),[monitoring,setMonitoring]=useState(false);
 const stems=useRef({}),box=useRef(null),poll=useRef(0),source=useRef('');
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{
  if(status.state!=='processing'){setElapsed(0);return undefined;}
  const began=Date.now();setElapsed(0);
  const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-began)/1000)),1000);
  return()=>clearInterval(timer);
 },[status.state]);
 const query=url=>`/admin/stems?url=${encodeURIComponent(url)}`;

 const failures=useRef(0),last=useRef('idle');
 const refresh=useCallback(async url=>{
  try{
   const value=await apiRequest(query(url),{token});
   failures.current=0;
   const state=value.status==='ready'?'ready':value.status==='processing'||value.status==='queued'?'processing':value.canSeparate===false?'unavailable':'idle';
   last.current=state;
   setStatus({state,stage:value.stage||'',channels:value.channels||[]});
   if(state==='processing'){clearTimeout(poll.current);poll.current=setTimeout(()=>refresh(url),4000);}
  }catch(error){
   // A separation keeps running on the server; a failed status check (busy worker, network blip) must not abandon it.
   if(last.current==='processing'&&++failures.current<=15){clearTimeout(poll.current);poll.current=setTimeout(()=>refresh(url),Math.min(15000,4000*failures.current));return;}
   setStatus({state:'unavailable',stage:error.message||'Could not reach the audio separator.',channels:[]});
  }
 },[token]);
 // Already-uploaded audio may be separated (or separating) from an earlier visit: pick that up.
 // A browser draft keeps working after a reload: remember which uploaded copy was sent for separation.
 const memoryKey=fingerprint?`echo-stem-source:${fingerprint}`:'';
 const remember=url=>{try{if(memoryKey)localStorage.setItem(memoryKey,url);}catch{/* storage blocked */}};
 useEffect(()=>{
  clearTimeout(poll.current);
  let url=remote?audioUrl:'';
  if(!url&&memoryKey){try{url=localStorage.getItem(memoryKey)||'';}catch{/* storage blocked */}}
  if(!url)return undefined;
  source.current=url;refresh(url);
  return()=>clearTimeout(poll.current);
 },[remote,audioUrl,memoryKey,refresh]);

 // Split right here in the editor: upload the draft audio if needed, then start the separation.
 const start=async()=>{
  try{
   setStatus({state:'uploading',stage:'Uploading the audio…',channels:[]});
   const url=await ensureUploaded();source.current=url;remember(url);
   last.current='processing';failures.current=0;
   setStatus({state:'processing',stage:'Starting the separation…',channels:[]});
   await apiRequest(query(url),{method:'POST',token});
   clearTimeout(poll.current);poll.current=setTimeout(()=>refresh(url),3000);
  }catch(error){setStatus({state:'unavailable',stage:error.message||'Channel separation could not start.',channels:[]});}
 };
 useEffect(()=>()=>clearTimeout(poll.current),[]);

 // Ready: one audio element per stem for monitoring and a light waveform (decoded at 8 kHz) per lane.
 useEffect(()=>{
  if(status.state!=='ready')return undefined;
  let alive=true;const controller=new AbortController(),base=apiBaseUrl.replace(/\/api$/,''),urls=[];
  const Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  (async()=>{
   for(const channel of status.channels){
    if(!alive)return;
    try{
     const response=await fetch(`${base}${channel.url}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(!response.ok)continue;
     const data=await response.arrayBuffer(),objectUrl=URL.createObjectURL(new Blob([data],{type:'audio/flac'}));urls.push(objectUrl);
     const element=new Audio();element.preload='auto';element.src=objectUrl;stems.current[channel.name]=element;
     if(Context){try{const buffer=await new Context(1,1,8000).decodeAudioData(data.slice(0));if(alive)setPeaks(current=>({...current,[channel.name]:waveformPeaks(buffer,900)}));}catch{/* lane stays empty; monitoring still works */}}
    }catch{/* skip this lane */}
   }
  })();
  return()=>{alive=false;controller.abort();for(const element of Object.values(stems.current)){element.pause();element.removeAttribute('src');element.load();}stems.current={};for(const url of urls)URL.revokeObjectURL(url);};
 },[status,token]);

 // Keep the stem elements locked to the main audio while monitoring.
 useEffect(()=>{
  const main=audio?.current;if(!main||status.state!=='ready'||!monitoring)return undefined;
  const all=()=>Object.values(stems.current);
  const align=()=>{for(const el of all())if(Math.abs(el.currentTime-main.currentTime)>.12)el.currentTime=main.currentTime;};
  const play=()=>{align();for(const el of all())el.play().catch(()=>{});};
  const pause=()=>{for(const el of all())el.pause();};
  const seeked=()=>{align();if(!main.paused)play();};
  main.muted=true;
  main.addEventListener('play',play);main.addEventListener('pause',pause);main.addEventListener('ended',pause);main.addEventListener('seeked',seeked);main.addEventListener('timeupdate',align);
  if(!main.paused)play();
  return()=>{main.muted=false;pause();main.removeEventListener('play',play);main.removeEventListener('pause',pause);main.removeEventListener('ended',pause);main.removeEventListener('seeked',seeked);main.removeEventListener('timeupdate',align);};
 },[audio,status.state,monitoring]);
 useEffect(()=>{for(const name of STEM_CHANNELS){const el=stems.current[name];if(el)el.volume=stemGain(mix,name,1);}},[mix,status]);

 // Shared playhead across all lanes.
 useEffect(()=>{
  const main=audio?.current;if(!main||status.state!=='ready')return undefined;
  let frame=0;
  const paint=()=>{box.current?.style.setProperty('--p',`${duration?Math.min(100,main.currentTime/duration*100):0}%`);};
  const loop=()=>{paint();if(!main.paused)frame=requestAnimationFrame(loop);};
  const kick=()=>{cancelAnimationFrame(frame);loop();};
  for(const type of ['play','seeked','timeupdate'])main.addEventListener(type,kick);paint();
  return()=>{cancelAnimationFrame(frame);for(const type of ['play','seeked','timeupdate'])main.removeEventListener(type,kick);};
 },[audio,status.state,duration]);

 const change=(name,patch)=>{setMonitoring(true);setMix(value=>({...value,[name]:{...value[name],...patch}}));};
 const reset=()=>{setMonitoring(false);setMix(initialStemMix());};
 const laneSeek=event=>{const rect=event.currentTarget.getBoundingClientRect();seek?.((event.clientX-rect.left)/rect.width*duration);};

 const head=<header className="stem-lanes-head"><span className="stem-lanes-title"><Layers size={15} aria-hidden="true"/>Channels</span>{status.state==='ready'&&<span className="stem-lanes-mode" role="status">{monitoring?'Monitoring: mixed channels':'Monitoring: original'}</span>}{status.state==='ready'&&monitoring&&<button type="button" className="stem-lanes-reset" onClick={reset}><RotateCcw size={13}/>Reset</button>}</header>;
 if(status.state!=='ready'){
  const busy=status.state==='uploading'||status.state==='processing',percent=Number((/(\d{1,3})\s*%/.exec(status.stage||'')||[])[1]),known=Number.isFinite(percent)&&percent>0;
  const title=status.state==='uploading'?'Uploading the audio':status.state==='processing'?'Separating channels':status.state==='unavailable'?'Channels unavailable':'Split into channels';
  const hint=status.state==='uploading'?'Sending your audio to the separator…':status.state==='processing'?`Elapsed ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')} · the percentage updates about every minute, and a full song can take around 20 minutes. You can keep editing meanwhile.`:status.state==='unavailable'?(status.stage||'Channel separation could not run right now.'):'Vocals, drums, bass and other music on their own lanes, with mute, solo and volume.';
  return <div className={`stem-lanes is-note is-${status.state}`}>{head}<div className="stem-lanes-card"><span className="stem-lanes-badge" aria-hidden="true">{busy?<i className="stem-lanes-spin"/>:<Layers size={20}/>}</span><div className="stem-lanes-copy" role="status"><strong>{title}{status.state==='processing'&&known&&<em>{percent}%</em>}</strong><p>{hint}</p>{status.state==='processing'&&<div className={`stem-lanes-bar${known?'':' is-indeterminate'}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={known?percent:undefined}><i style={known?{width:`${percent}%`}:undefined}/></div>}</div>{!busy&&<button type="button" className="stem-lanes-start" onClick={start}>{status.state==='unavailable'?'Try again':'Split channels'}</button>}</div></div>;
 }
 return <div className="stem-lanes" ref={box}>{head}<div className="stem-lanes-grid">{STEM_CHANNELS.map(name=>{const channel=mix[name];return <div className="stem-lane" key={name} style={{'--lane':`hsl(${HUES[name]} 55% 60%)`}}>
  <div className="stem-lane-strip"><strong>{LABELS[name]}</strong><div className="stem-lane-buttons"><button type="button" aria-label={`Mute ${LABELS[name]}`} aria-pressed={channel.muted} onClick={()=>change(name,{muted:!channel.muted})}>M</button><button type="button" aria-label={`Solo ${LABELS[name]}`} aria-pressed={channel.solo} onClick={()=>change(name,{solo:!channel.solo})}>S</button></div><input type="range" min="0" max="1" step=".01" value={channel.volume} aria-label={`${LABELS[name]} volume`} onChange={event=>change(name,{volume:Number(event.target.value)})}/></div>
  <div className="stem-lane-wave" onPointerDown={laneSeek}><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d={peaks[name]?pathFor(peaks[name]):''}/></svg>{duration>0&&regions.map(region=><span key={region.id} className="stem-lane-region" style={{left:`${region.start/duration*100}%`,width:`${(region.end-region.start)/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`}}/>)}<i className="stem-lane-head" aria-hidden="true"/></div>
 </div>;})}</div></div>;
}
