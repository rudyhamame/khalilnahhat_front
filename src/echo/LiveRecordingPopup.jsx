import {useEffect,useRef,useState} from 'react';
import {Pause,Play,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import RecordingSessionMetadata from './RecordingSessionMetadata';

const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
// Popup player for one live recording: all its parts behave as one video with one progress bar;
// set list, requests and comments form one column to the right of it.
export default function LiveRecordingPopup({item,token,onClose}){
 const parts=item.parts||[],count=Math.max(1,item.partCount||1),[meta,setMeta]=useState({});
 const len=i=>parts[i]?.skipped?0:Number(parts[i]?.selectedDurationSec??parts[i]?.durationSec)||meta[i]||0;
 const lens=Array.from({length:count},(_,i)=>len(i)),total=lens.reduce((a,b)=>a+b,0);
 const next=i=>{let n=i+1;while(n<count&&parts[n]?.skipped)n+=1;return n<count?n:-1;};
 const [part,setPart]=useState(()=>Math.max(0,Array.from({length:count},(_,i)=>i).findIndex(i=>!parts[i]?.skipped)));
 const [urls,setUrls]=useState({}),[errors,setErrors]=useState({}),[time,setTime]=useState(0),[playing,setPlaying]=useState(false);
 const media=useRef(null),pending=useRef(null),auto=useRef(false),requested=useRef(new Set()),renewed=useRef(new Set());
 const need=(i,force=false)=>{
  if(i<0||(!force&&requested.current.has(i)))return;
  requested.current.add(i);setUrls(current=>({...current,[i]:null}));setErrors(current=>({...current,[i]:''}));
  apiRequest(`/admin/live-recordings/${item.id}/preview?part=${i}`,{token})
   .then(result=>setUrls(current=>({...current,[i]:result.url})))
   .catch(failure=>{setUrls(current=>({...current,[i]:false}));setErrors(current=>({...current,[i]:failure.message||'This recording part could not be loaded.'}));});
 };
 // Fetch each source once. Keeping request state outside React prevents a failed part from starting an automatic retry loop.
 useEffect(()=>{need(part);need(next(part));},[part,item.id,token]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 const offset=lens.slice(0,part).reduce((a,b)=>a+b,0),url=typeof urls[part]==='string'?urls[part]:'',ahead=urls[next(part)],error=errors[part]||'';
 const seek=value=>{const t=Math.max(0,Math.min(total,Number(value)||0));let i=lens.findLastIndex((_,k)=>lens.slice(0,k).reduce((a,b)=>a+b,0)<=t&&!parts[k]?.skipped);if(i<0)i=0;const local=t-lens.slice(0,i).reduce((a,b)=>a+b,0);setTime(t);if(i===part){if(media.current)media.current.currentTime=local;}else{auto.current=playing;pending.current=local;setPart(i);}};
 const toggle=()=>{const el=media.current;if(el){if(el.paused)void el.play();else el.pause();}};
 const ended=()=>{const n=next(part);if(n>=0){auto.current=true;setPart(n);}else setPlaying(false);};
 const failed=()=>{if(!renewed.current.has(part)){renewed.current.add(part);need(part,true);return;}setUrls(current=>({...current,[part]:false}));setErrors(current=>({...current,[part]:'The video link could not be loaded. Retry this part.'}));};
 const props={src:url,preload:'auto',autoPlay:auto.current,onClick:toggle,onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false),onTimeUpdate:e=>setTime(offset+e.currentTarget.currentTime),onEnded:ended,onError:failed};
 const loaded=e=>{const el=e.currentTarget;renewed.current.delete(part);setErrors(current=>({...current,[part]:''}));setMeta(c=>c[part]?c:{...c,[part]:el.duration||0});if(pending.current!==null){el.currentTime=pending.current;pending.current=null;}};
 return <div className="lrp-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="lrp" role="dialog" aria-modal="true" aria-label={`Player: ${item.title}`}>
  <header><strong>{item.title}</strong>{count>1&&<small>{count} parts · one video</small>}<button type="button" aria-label="Close player" onClick={onClose}><X size={18}/></button></header>
  <div className="lrp-player">
   <div className="lrp-video">{error&&!url?<div className="lrp-load-error" role="alert"><p>{error}</p><button type="button" onClick={()=>{renewed.current.delete(part);need(part,true);}}>Retry</button></div>:url?<video key={`v${part}:${url}`} ref={media} {...props} playsInline onLoadedMetadata={loaded}/>:<p role="status">Loading part {part+1} of {count}…</p>}
    {ahead&&<link rel="preload" as="video" href={ahead}/>}</div>
   <div className="lrp-bar"><button type="button" aria-label={playing?'Pause':'Play'} onClick={toggle} disabled={!url}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><time>{clock(time)}</time><input type="range" aria-label="Seek" min="0" max={total||1} step="0.5" value={Math.min(time,total||1)} onChange={e=>seek(e.target.value)} disabled={!total}/><time>{clock(total)}</time></div>
  </div>
  <RecordingSessionMetadata recordingId={item.id} token={token} part={part} currentTime={time}/>
 </div></div>;
}
