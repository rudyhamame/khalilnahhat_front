import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Clapperboard,Maximize,Pause,Play,RefreshCw,Volume2,VolumeX} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {ARCHIVE_PLAYER_STATE,archivePlayerCommand} from '../lib/archivePlayerBridge';
import {windowAt,cropStyle} from '../lib/reelCrop';
import './reelsPlayer.css';

// A video with a saved 9:16 crop: only the crop window is shown, centred in a 9:16 frame, and it follows the saved face track while playing.
function CroppedReel({item,videoRef,onError,onLoadedMetadata,onEnded}){
 const [style,setStyle]=useState(null);
 useEffect(()=>{
  let raf=0;
  const tick=()=>{const v=videoRef.current;if(v&&v.videoWidth)setStyle(cropStyle(windowAt(v.videoWidth,v.videoHeight,item.crop,v.currentTime)));raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[item,videoRef]);
 const toggle=()=>{const v=videoRef.current;if(!v)return;if(v.paused)v.play().catch(()=>{});else v.pause();};
 return <div className="reels-cropbox" onClick={toggle} role="button" tabIndex={0} aria-label={item.title} onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();toggle();}}}>
  <video ref={videoRef} src={item.videoUrl} playsInline preload="metadata" style={style||{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} aria-label={item.title} onPlay={()=>archivePlayerCommand('pause')} onError={onError} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded}/>
 </div>;
}

const clock=seconds=>Number.isFinite(seconds)&&seconds>=0?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'0:00';
// The Reels controls, drawn by the site (the browser's own controls are off): play / pause, a seek bar, time, sound and full screen.
function ReelControls({videoRef,rootRef,tr,videoKey}){
 const [state,setState]=useState({playing:false,time:0,duration:0,muted:false,volume:1});
 useEffect(()=>{
  const v=videoRef.current;if(!v)return undefined;
  const sync=()=>setState({playing:!v.paused&&!v.ended,time:v.currentTime||0,duration:Number.isFinite(v.duration)?v.duration:0,muted:v.muted,volume:v.volume});
  const events=['play','pause','ended','timeupdate','durationchange','loadedmetadata','volumechange','seeked'];
  events.forEach(name=>v.addEventListener(name,sync));sync();
  return()=>events.forEach(name=>v.removeEventListener(name,sync));
 },[videoRef,videoKey]);
 const toggle=()=>{const v=videoRef.current;if(!v)return;if(v.paused||v.ended)v.play().catch(()=>{});else v.pause();};
 const seek=event=>{const v=videoRef.current;if(v&&state.duration)v.currentTime=Number(event.target.value)/1000*state.duration;};
 const mute=()=>{const v=videoRef.current;if(v)v.muted=!v.muted;};
 const full=()=>{const node=rootRef.current;if(!node)return;if(document.fullscreenElement)document.exitFullscreen?.();else node.requestFullscreen?.().catch(()=>{});};
 const percent=state.duration?state.time/state.duration*100:0;
 return <div className="reels-controls" role="group" aria-label={tr('Video controls','أدوات التحكم بالفيديو')}>
  <input className="reels-seek" type="range" min="0" max="1000" step="1" value={Math.round(percent*10)} onChange={seek} aria-label={tr('Seek','تقديم وتأخير')} style={{'--p':`${percent}%`}}/>
  <div className="reels-controls-row">
   <button type="button" className="reels-play" onClick={toggle} aria-label={state.playing?tr('Pause','إيقاف مؤقت'):tr('Play','تشغيل')}>{state.playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button>
   <span className="reels-time" dir="ltr">{clock(state.time)} / {clock(state.duration)}</span>
   <button type="button" onClick={mute} aria-pressed={state.muted} aria-label={state.muted?tr('Unmute','تشغيل الصوت'):tr('Mute','كتم الصوت')}>{state.muted||state.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
   <button type="button" onClick={full} aria-label={tr('Full screen','ملء الشاشة')}><Maximize size={18}/></button>
  </div>
 </div>;
}

export default function ReelsPlayer({lang,workType,onClose,closing=false}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,title=djWorkTypeText(workType,ar).name;
 const [items,setItems]=useState([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('loading'),[retry,setRetry]=useState(0),[failed,setFailed]=useState(false),[list,setList]=useState(false);
 const video=useRef(null),resume=useRef(false),root=useRef(null);
 useEffect(()=>{
  let alive=true;setStatus('loading');setFailed(false);
  apiRequest('/reels').then(data=>{if(alive){setItems(Array.isArray(data.items)?data.items:[]);setStatus('ready');}}).catch(()=>{if(alive)setStatus('error');});
  return()=>{alive=false;};
 },[retry]);
 const current=items.find(item=>item.id===selected)||items[0],index=current?items.indexOf(current):-1;
 useEffect(()=>{if(closing)video.current?.pause();},[closing]);
 // Tell the page when a reel is playing (it glows the whole box screen) and clear it when the reel stops or the player closes.
 useEffect(()=>{
  const v=video.current,send=value=>window.dispatchEvent(new CustomEvent('echo:reel-playing',{detail:{playing:value}}));
  if(!v)return undefined;
  const on=()=>send(true),off=()=>send(false);
  v.addEventListener('play',on);v.addEventListener('playing',on);v.addEventListener('pause',off);v.addEventListener('ended',off);
  send(!v.paused&&!v.ended);
  return()=>{v.removeEventListener('play',on);v.removeEventListener('playing',on);v.removeEventListener('pause',off);v.removeEventListener('ended',off);send(false);};
 },[current?.id,retry,status]);
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)video.current?.pause();};document.addEventListener('visibilitychange',hidden);
  return()=>document.removeEventListener('visibilitychange',hidden);
 },[]);
 useEffect(()=>{const audio=event=>{if(event.detail?.playing)video.current?.pause();};window.addEventListener(ARCHIVE_PLAYER_STATE,audio);return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,audio);},[]);
 const back=()=>{video.current?.pause();onClose?.();};
 const handleMetadata=()=>{
  if(!resume.current)return;
  resume.current=false;
  const element=video.current;
  if(element)void element.play().catch(()=>{});
 };
 const handleEnded=()=>{
  if(items.length<2)return;
  resume.current=true;
  setSelected(items[(index+1)%items.length].id);
 };
 const handleKey=event=>{
  if(event.key!=='Escape')return;
  event.preventDefault();event.stopPropagation();if(list){setList(false);return;}back();
 };

 return <section ref={root} className="reels-player" dir={ar?'rtl':'ltr'} aria-label={title||tr('Video player','مشغّل الفيديو')} onKeyDown={handleKey}>
  {current&&status==='ready'&&current.crop&&<CroppedReel key={`${current.id}:${retry}`} item={current} videoRef={video} onError={()=>setFailed(true)} onLoadedMetadata={handleMetadata} onEnded={handleEnded}/>}
  {current&&status==='ready'&&!current.crop&&(
   <video
    key={`${current.id}:${retry}`}
    ref={video}
    src={current.videoUrl}
    onClick={()=>{const v=video.current;if(v){if(v.paused)v.play().catch(()=>{});else v.pause();}}}
    playsInline
    preload="metadata"
    aria-label={current.title}
    onPlay={()=>archivePlayerCommand('pause')}
    onError={()=>setFailed(true)}
    onLoadedMetadata={handleMetadata}
    onEnded={handleEnded}
   />
  )}
  {current&&status==='ready'&&!failed&&<ReelControls videoRef={video} rootRef={root} tr={tr} videoKey={`${current.id}:${retry}`}/>}
  <header className="reels-player-top"><button type="button" onClick={back} aria-label={tr('Back','رجوع')}><ArrowLeft size={20}/></button>
   <button type="button" className={`reels-record${list?' is-open':''}`} onClick={()=>setList(value=>!value)} aria-haspopup="dialog" aria-expanded={list} aria-label={tr('All reels','كل الفيديوهات')} title={tr('All reels','كل الفيديوهات')}><i aria-hidden="true"><Clapperboard size={18}/></i></button>
   <button type="button" onClick={()=>setRetry(value=>value+1)} aria-label={tr('Refresh videos','تحديث الفيديوهات')}><RefreshCw size={18}/></button></header>
  {list&&<div className="reels-list" role="dialog" aria-label={tr('All reels','كل الفيديوهات')}>
   <p className="reels-list-title">{tr('All reels','كل الفيديوهات')} <small>{items.length}</small></p>
   <ul>{items.map((item,i)=><li key={item.id}><button type="button" className={item.id===current?.id?'is-current':''} aria-current={item.id===current?.id||undefined} onClick={()=>{resume.current=true;video.current?.pause();setFailed(false);setSelected(item.id);setList(false);}}><span className="reels-list-n">{i+1}</span><strong dir="auto">{item.title}</strong></button></li>)}</ul>
  </div>}
  {status==='loading'?<div className="reels-player-message" role="status">{tr('Loading videos…','جارٍ تحميل الفيديوهات…')}</div>:status==='error'||failed?<div className="reels-player-message" role="alert"><p>{tr('This video could not load. Please retry.','تعذر تحميل الفيديو. يرجى المحاولة مجدداً.')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Retry','إعادة المحاولة')}</button></div>:!current?<div className="reels-player-message" role="status"><p>{tr('No videos here yet.','لا توجد فيديوهات هنا بعد.')}</p></div>:<footer className="reels-player-caption"><strong>{current.title}</strong><div><span>{index+1} / {items.length}</span></div></footer>}
 </section>;
}
