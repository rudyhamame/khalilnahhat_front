import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Layers,RotateCcw,Trash2} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {putStems,getStems,deleteStems} from '../lib/recordingDraftStore';
import {stemGain} from '../lib/stemMix';
import {waveformPeaks} from '../lib/audioTrim';
import './stemLanes.css';

const CHANNELS=['vocals','drums','bass','guitar','piano','other'];
const LABELS={vocals:'Vocals',drums:'Drums',bass:'Bass',guitar:'Guitar',piano:'Piano',other:'Other'};
const HUES={vocals:330,drums:35,bass:210,guitar:280,piano:175,other:95};
const initialMix=()=>Object.fromEntries(CHANNELS.map(name=>[name,{volume:1,muted:false,solo:false}]));
const STORE='echo-stem-lanes';
const readChoice=()=>{try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(Array.isArray(saved)&&saved.every(name=>CHANNELS.includes(name)))return saved;}catch{/* storage blocked */}return CHANNELS;};
// Each lane is scaled to its own loudest peak so the waveform fills the lane height (floor keeps near-silent stems from becoming noise).
const pathFor=peaks=>{const top=Math.max(.06,...peaks.map(([low,high])=>Math.max(Math.abs(low),Math.abs(high)))),gain=1/top;return peaks.map(([low,high],index)=>{const x=(index+.5)/peaks.length*1000;return `M${x.toFixed(2)},${(40-Math.min(1,high*gain)*39).toFixed(2)}V${(40-Math.max(-1,low*gain)*39).toFixed(2)}`;}).join('');};

// FL Studio style channel panel: one lane per separated stem with mute / solo / volume, sharing the atom segments and the playhead.
export default function StemLanes({audioUrl,fingerprint,savedStems,onStems,ensureUploaded,token,audio,duration,regions=[],seek}){
 const remote=/^https:/.test(audioUrl||'');
 const [status,setStatus]=useState({state:'idle',stage:'',channels:[]});
 const [peaks,setPeaks]=useState({}),[mix,setMix]=useState(initialMix),[chosen,setChosen]=useState(readChoice),[loadingLane,setLoadingLane]=useState({}),[monitoring,setMonitoring]=useState(false);
 const stems=useRef({}),box=useRef(null),poll=useRef(0),source=useRef('');
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{
  if(status.state!=='processing'){setElapsed(0);return undefined;}
  const began=Date.now();setElapsed(0);
  const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-began)/1000)),1000);
  return()=>clearInterval(timer);
 },[status.state]);
 const query=url=>`/admin/stems?url=${encodeURIComponent(url)}`;

 // The list floats above the waveform wrapper (which clips overflow), anchored under the trigger.
 const triggerRef=useRef(null);
 const menuPlace=()=>{const box=triggerRef.current?.getBoundingClientRect();return box?{position:'fixed',insetBlockStart:Math.min(box.bottom+8,window.innerHeight-380),insetInlineStart:'auto',insetInlineEnd:Math.max(8,window.innerWidth-box.right)}:undefined;};
 const failures=useRef(0),last=useRef('idle'),blobUrls=useRef([]);
 useEffect(()=>()=>blobUrls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
 // The separated channels are kept in this browser until the recording is saved; the server copy is then dropped.
 const fromFiles=files=>Object.entries(files).map(([name,blob])=>{const url=URL.createObjectURL(blob);blobUrls.current.push(url);return {name,url};});
 const stash=async(url,channels,value)=>{
  const base=apiBaseUrl.replace(/\/api$/,''),files={};
  for(const channel of channels){const response=await fetch(`${base}${channel.url}`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw Error('The channels could not be downloaded.');files[channel.name]=await response.blob();}
  await putStems(url,files,{duration:value.duration??null});
  apiRequest(query(url),{method:'DELETE',token}).catch(()=>{});
  return files;
 };
 const refresh=useCallback(async url=>{
  try{
   const value=await apiRequest(query(url),{token});
   failures.current=0;
   const state=value.status==='ready'?'ready':value.status==='processing'||value.status==='queued'?'processing':value.status==='error'||value.canSeparate===false?'unavailable':'idle';
   last.current=state;
   if(state==='ready'&&value.channels?.length){
    setStatus({state:'processing',stage:'Saving the channels in this browser…',channels:[]});
    try{const files=await stash(url,value.channels,value);setStatus({state:'ready',stage:'',channels:fromFiles(files),partial:Object.keys(files).length<6});return;}
    catch{/* keep using the server copy when the browser cannot store it */}
   }
   setStatus({state,stage:value.stage||'',channels:value.channels||[],partial:Boolean(value.partial)});
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
  // A saved recording carries its own channel files: nothing to ask the separator.
  const keep=(savedStems?.channels||[]).filter(channel=>channel?.url);
  if(keep.length&&remote){setStatus({state:'ready',stage:'Saved channels',channels:keep.map(channel=>({name:channel.name,url:channel.url})),saved:true});return undefined;}
  let url=remote?audioUrl:'';
  if(!url&&memoryKey){try{url=localStorage.getItem(memoryKey)||'';}catch{/* storage blocked */}}
  if(!url)return undefined;
  source.current=url;
  let alive=true;
  getStems(url).catch(()=>null).then(found=>{
   if(!alive)return;
   if(found)setStatus({state:'ready',stage:'',channels:fromFiles(found.files),partial:Object.keys(found.files).length<6});
   else refresh(url);
  });
  return()=>{alive=false;clearTimeout(poll.current);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[remote,audioUrl,memoryKey,refresh,savedStems?.splitAt]);

 // Delete split: forget the channels in this browser, on the server, and on the recording.
 const removeSplit=async()=>{
  if(!window.confirm('Delete this split? The channels will be removed from this recording.'))return;
  clearTimeout(poll.current);setMenu(false);
  const url=source.current||audioUrl;
  try{if(memoryKey)localStorage.removeItem(memoryKey);}catch{/* storage blocked */}
  if(url){await deleteStems(url).catch(()=>{});apiRequest(query(url),{method:'DELETE',token}).catch(()=>{});}
  blobUrls.current.forEach(item=>URL.revokeObjectURL(item));blobUrls.current=[];source.current='';
  setStatus({state:'idle',stage:'',channels:[]});stemsRef.current?.(null);
 };
 // Split right here in the editor: upload the draft audio if needed, then start the separation.
 const upgrade=async()=>{
  try{
   setStatus({state:'processing',stage:'Starting the six-channel separation…',channels:[]});last.current='processing';failures.current=0;
   await apiRequest(`${query(source.current||audioUrl)}&upgrade=1`,{method:'POST',token});
   clearTimeout(poll.current);poll.current=setTimeout(()=>refresh(source.current||audioUrl),3000);
  }catch(error){setStatus({state:'unavailable',stage:error.message||'Channel separation could not start.',channels:[]});}
 };
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

 // The split is saved with the recording, so the mixer can use it without splitting again.
 const stemsRef=useRef(onStems);stemsRef.current=onStems;
 useEffect(()=>{
  if(status.state!=='ready'||!status.channels.length||status.saved)return;
  stemsRef.current?.({sourceUrl:source.current||audioUrl,channels:status.channels.map(channel=>channel.name),duration:Number.isFinite(duration)&&duration>0?+duration.toFixed(2):null,splitAt:new Date().toISOString()});
 },[status,audioUrl,duration]);
 // Only the chosen channels are downloaded: one audio element per stem for monitoring and a light waveform (decoded at 8 kHz) per lane.
 const files=useRef({}),pending=useRef(new Set());
 useEffect(()=>{
  if(status.state!=='ready')return;
  const base=apiBaseUrl.replace(/\/api$/,''),Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  for(const name of Object.keys(files.current))if(!chosen.includes(name)){const file=files.current[name];file.element.pause();file.element.removeAttribute('src');file.element.load();URL.revokeObjectURL(file.url);delete files.current[name];delete stems.current[name];setPeaks(current=>{const {[name]:_gone,...rest}=current;return rest;});}
  for(const channel of status.channels){
   const name=channel.name;
   if(!chosen.includes(name)||files.current[name]||pending.current.has(name))continue;
   pending.current.add(name);setLoadingLane(current=>({...current,[name]:true}));
   (async()=>{
    try{
     const response=/^(https|blob):/.test(channel.url)?await fetch(channel.url):await fetch(`${base}${channel.url}`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)return;
     const data=await response.arrayBuffer(),url=URL.createObjectURL(new Blob([data],{type:'audio/flac'}));
     if(!mounted.current){URL.revokeObjectURL(url);return;}
     const element=new Audio();element.preload='auto';element.src=url;element.volume=stemGain(mixRef.current,name,1);
     files.current[name]={element,url};stems.current[name]=element;
     if(Context){try{const buffer=await new Context(1,1,8000).decodeAudioData(data.slice(0));if(mounted.current)setPeaks(current=>({...current,[name]:waveformPeaks(buffer,900)}));}catch{/* lane stays empty; monitoring still works */}}
    }catch{/* skip this lane */}
    finally{pending.current.delete(name);if(mounted.current)setLoadingLane(current=>({...current,[name]:false}));}
   })();
  }
 },[status,chosen,token]);
 const mounted=useRef(true),mixRef=useRef(mix);mixRef.current=mix;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;for(const file of Object.values(files.current)){file.element.pause();file.element.removeAttribute('src');file.element.load();URL.revokeObjectURL(file.url);}files.current={};stems.current={};};},[]);

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
 useEffect(()=>{for(const name of CHANNELS){const el=stems.current[name];if(el)el.volume=stemGain(mix,name,1);}},[mix,status,chosen,peaks]);

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

 // Lanes share whatever height is left in the wrapper, so the panel fills it instead of leaving an empty band underneath.
 const visibleCount=CHANNELS.filter(name=>chosen.includes(name)&&status.channels.some(channel=>channel.name===name)).length;
 useEffect(()=>{
  const node=box.current,wrapper=node?.closest('.recording-detail-player');if(!node||!wrapper||!visibleCount)return undefined;
  const fit=()=>{
   const grid=node.querySelector('.stem-lanes-grid');if(!grid)return;
   node.style.removeProperty('--lane-h');
   const below=wrapper.getBoundingClientRect().bottom-grid.getBoundingClientRect().bottom-14;
   const gaps=(visibleCount-1)*6,current=grid.getBoundingClientRect().height-gaps,each=current/visibleCount;
   const next=Math.max(56,Math.min(240,Math.floor(each+below/visibleCount)));
   node.style.setProperty('--lane-h',`${next}px`);
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(wrapper);window.addEventListener('resize',fit);
  return()=>{observer.disconnect();window.removeEventListener('resize',fit);};
 },[visibleCount,status.state,peaks]);
 const change=(name,patch)=>{setMonitoring(true);setMix(value=>({...value,[name]:{...value[name],...patch}}));};
 const reset=()=>{setMonitoring(false);setMix(initialMix());};
 const laneSeek=event=>{const rect=event.currentTarget.getBoundingClientRect();seek?.((event.clientX-rect.left)/rect.width*duration);};

const toggle=name=>setChosen(current=>{const next=current.includes(name)?current.filter(item=>item!==name):CHANNELS.filter(item=>item===name||current.includes(item));if(!next.length)return current;try{localStorage.setItem(STORE,JSON.stringify(next));}catch{/* storage blocked */}return next;});
const [slot,setSlot]=useState(null),[menu,setMenu]=useState(false);
 useEffect(()=>{setSlot(document.getElementById('recording-stem-slot'));},[]);
 useEffect(()=>{
  if(!menu)return undefined;
  const away=event=>{if(!slot?.contains(event.target)&&!event.target.closest?.('.stem-split-menu'))setMenu(false);},key=event=>{if(event.key==='Escape')setMenu(false);};
  document.addEventListener('pointerdown',away);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',key);};
 },[menu,slot]);
 const working=status.state==='uploading'||status.state==='processing';
 const trigger=slot?createPortal(<>
  <button type="button" ref={triggerRef} className="stem-split-trigger" aria-label="Split into channels" title="Split into channels" aria-haspopup="menu" aria-expanded={menu} onClick={()=>setMenu(value=>!value)}><Layers size={18} strokeWidth={2.25}/>{working&&<i className="stem-split-dot" aria-hidden="true"/>}</button>
  {menu&&createPortal(<div className="stem-split-menu" role="menu" aria-label="Split into channels" style={menuPlace()}><strong>Split into channels</strong>
   <div role="group" aria-label="Channels">{CHANNELS.map(name=>{const missing=status.state==='ready'&&!status.channels.some(channel=>channel.name===name);return <label key={name} className="stem-split-option" style={{'--lane':`hsl(${HUES[name]} 55% 60%)`}}><input type="checkbox" checked={chosen.includes(name)} disabled={missing} onChange={()=>toggle(name)}/><i aria-hidden="true"/><span>{LABELS[name]}</span></label>;})}</div>
   {status.state==='ready'&&<button type="button" className="stem-split-delete" onClick={removeSplit}><Trash2 size={14}/>Delete split</button>}
   {status.state==='ready'?<p>{savedStems?'Saved with this recording.':'Kept in this browser until you press Save.'} Tick the channels to show as lanes.</p>:working?<p role="status">{status.state==='uploading'?'Uploading the audio…':'Separating channels… this can take several minutes.'}</p>:<><p>{status.state==='unavailable'?status.stage||'Channel separation is unavailable right now.':'Tick the channels you want, then split. Only the ticked ones are loaded as lanes.'}</p><button type="button" className="stem-split-go" onClick={()=>{setMenu(false);start();}}>{status.state==='unavailable'?'Try again':'Split channels'}</button></>}
  </div>,triggerRef.current?.closest('.admin-workspace')||document.body)}
 </>,slot):null;
  const head=<header className="stem-lanes-head"><span className="stem-lanes-title"><span className="stem-lanes-icon" aria-hidden="true"><Layers size={15}/></span>Channels{status.state==='ready'&&<em className="stem-lanes-count">{status.channels.length}</em>}</span>{status.state==='ready'&&<span className="stem-lanes-mode" role="status">{savedStems?'Saved with this recording · ':''}{monitoring?'Monitoring: mixed channels':'Monitoring: original'}</span>}{status.state==='ready'&&monitoring&&<button type="button" className="stem-lanes-reset" onClick={reset}><RotateCcw size={13}/>Reset</button>}</header>;
 const panel=(()=>{
 if(status.state==='idle'||status.state==='checking')return null;
 if(status.state!=='ready'){
  const busy=status.state==='uploading'||status.state==='processing',percent=Number((/(\d{1,3})\s*%/.exec(status.stage||'')||[])[1]),known=Number.isFinite(percent)&&percent>0;
  const title=status.state==='uploading'?'Uploading the audio':status.state==='processing'?'Separating channels':status.state==='unavailable'?'Channels unavailable':'Split into channels';
  const hint=status.state==='uploading'?'Sending your audio to the separator…':status.state==='processing'?`Elapsed ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')} · the percentage updates about every minute, and a full song can take around 20 minutes. You can keep editing meanwhile.`:status.state==='unavailable'?(status.stage||'Channel separation could not run right now.'):'Vocals, drums, bass and other music on their own lanes, with mute, solo and volume.';
  return <div className={`stem-lanes is-note is-${status.state}`}>{head}<div className="stem-lanes-card"><span className="stem-lanes-badge" aria-hidden="true">{busy?<i className="stem-lanes-spin"/>:<Layers size={20}/>}</span><div className="stem-lanes-copy" role="status"><strong>{title}{status.state==='processing'&&known&&<em>{percent}%</em>}</strong><p>{hint}</p>{status.state==='processing'&&<div className={`stem-lanes-bar${known?'':' is-indeterminate'}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={known?percent:undefined}><i style={known?{width:`${percent}%`}:undefined}/></div>}</div>{!busy&&<div className="stem-lanes-actions"><button type="button" className="stem-lanes-start" onClick={start}>{status.state==='unavailable'?'Try again':'Split channels'}</button></div>}</div></div>;
 }
 return <div className="stem-lanes" ref={box}>{head}{status.partial&&<p className="stem-lanes-partial">This split has four channels. <button type="button" onClick={upgrade}>Split again with Guitar and Piano</button></p>}<div className="stem-lanes-grid">{CHANNELS.filter(name=>chosen.includes(name)&&status.channels.some(channel=>channel.name===name)).map(name=>{const channel=mix[name];return <div className="stem-lane" key={name} style={{'--lane':`hsl(${HUES[name]} 55% 60%)`}}>
  <div className="stem-lane-strip"><strong>{LABELS[name]}<small>{Math.round(channel.volume*100)}%</small></strong><div className="stem-lane-buttons"><button type="button" aria-label={`Mute ${LABELS[name]}`} aria-pressed={channel.muted} onClick={()=>change(name,{muted:!channel.muted})}>M</button><button type="button" aria-label={`Solo ${LABELS[name]}`} aria-pressed={channel.solo} onClick={()=>change(name,{solo:!channel.solo})}>S</button></div><input type="range" min="0" max="1" step=".01" value={channel.volume} style={{'--v':`${channel.volume*100}%`}} aria-label={`${LABELS[name]} volume`} onChange={event=>change(name,{volume:Number(event.target.value)})}/></div>
  <div className="stem-lane-wave" onPointerDown={laneSeek}><svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d={peaks[name]?pathFor(peaks[name]):''}/></svg>{loadingLane[name]&&!peaks[name]&&<span className="stem-lane-loading">Loading {LABELS[name].toLowerCase()}…</span>}{duration>0&&regions.map(region=><span key={region.id} className="stem-lane-region" style={{left:`${region.start/duration*100}%`,width:`${(region.end-region.start)/duration*100}%`,'--atom-color':`hsl(${(region.index*67+145)%360} 48% 55%)`}}/>)}<i className="stem-lane-head" aria-hidden="true"/></div>
 </div>;})}</div></div>;
 })();
 return <>{trigger}{panel}</>;
}
