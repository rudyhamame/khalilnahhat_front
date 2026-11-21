import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react';
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

export default function ReelsPlayer({lang,workType,onClose,closing=false}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,title=djWorkTypeText(workType,ar).name;
 const [items,setItems]=useState([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('loading'),[retry,setRetry]=useState(0),[failed,setFailed]=useState(false);
 const video=useRef(null),resume=useRef(false);
 useEffect(()=>{
  let alive=true;setStatus('loading');setFailed(false);
  apiRequest('/reels').then(data=>{if(alive){setItems(Array.isArray(data.items)?data.items:[]);setStatus('ready');}}).catch(()=>{if(alive)setStatus('error');});
  return()=>{alive=false;};
 },[retry]);
 const current=items.find(item=>item.id===selected)||items[0],index=current?items.indexOf(current):-1;
 useEffect(()=>{if(closing)video.current?.pause();},[closing]);
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)video.current?.pause();};document.addEventListener('visibilitychange',hidden);
  return()=>document.removeEventListener('visibilitychange',hidden);
 },[]);
 useEffect(()=>{const audio=event=>{if(event.detail?.playing)video.current?.pause();};window.addEventListener(ARCHIVE_PLAYER_STATE,audio);return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,audio);},[]);
 const step=direction=>{if(items.length<2)return;resume.current=Boolean(video.current&&!video.current.paused);video.current?.pause();setFailed(false);setSelected(items[(index+direction+items.length)%items.length].id);};
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
  event.preventDefault();event.stopPropagation();back();
 };

 return <section className="reels-player" dir={ar?'rtl':'ltr'} aria-label={title||tr('Video player','مشغّل الفيديو')} onKeyDown={handleKey}>
  {current&&status==='ready'&&current.crop&&<CroppedReel key={`${current.id}:${retry}`} item={current} videoRef={video} onError={()=>setFailed(true)} onLoadedMetadata={handleMetadata} onEnded={handleEnded}/>}
  {current&&status==='ready'&&!current.crop&&(
   <video
    key={`${current.id}:${retry}`}
    ref={video}
    src={current.videoUrl}
    controls
    playsInline
    preload="metadata"
    aria-label={current.title}
    onPlay={()=>archivePlayerCommand('pause')}
    onError={()=>setFailed(true)}
    onLoadedMetadata={handleMetadata}
    onEnded={handleEnded}
   />
  )}
  <header className="reels-player-top"><button type="button" onClick={back} aria-label={tr('Back','رجوع')}><ArrowLeft size={20}/></button><span>{title}</span><button type="button" onClick={()=>setRetry(value=>value+1)} aria-label={tr('Refresh videos','تحديث الفيديوهات')}><RefreshCw size={18}/></button></header>
  {status==='loading'?<div className="reels-player-message" role="status">{tr('Loading videos…','جارٍ تحميل الفيديوهات…')}</div>:status==='error'||failed?<div className="reels-player-message" role="alert"><p>{tr('This video could not load. Please retry.','تعذر تحميل الفيديو. يرجى المحاولة مجدداً.')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Retry','إعادة المحاولة')}</button></div>:!current?<div className="reels-player-message" role="status"><p>{tr('No videos here yet.','لا توجد فيديوهات هنا بعد.')}</p></div>:<footer className="reels-player-caption"><strong>{current.title}</strong><div><button type="button" disabled={items.length<2} onClick={()=>step(-1)} aria-label={tr('Previous video','الفيديو السابق')}><ChevronLeft size={20}/></button><span>{index+1} / {items.length}</span><button type="button" disabled={items.length<2} onClick={()=>step(1)} aria-label={tr('Next video','الفيديو التالي')}><ChevronRight size={20}/></button></div></footer>}
 </section>;
}
