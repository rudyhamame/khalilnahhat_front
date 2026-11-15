import {useEffect,useRef,useState} from 'react';
import {Bell,BellRing,Check,Play} from 'lucide-react';
import {apiRequest} from '../lib/api';
import FollowAvatar from './FollowAvatar';
import './youtubeSubscribe.css';

// Dark-mode YouTube subscribe card: channel identity, subscriber count, and a light-blue Subscribe button that turns
// into a gray confirmed state. The real subscription happens on YouTube (the link opens its own confirmation), so the
// gray state says "Confirm on YouTube", not "Subscribed". The channel is managed in Admin > YouTube; until it is set the
// public handle below is used, so the button always works.
const FALLBACK={handle:'djkhalilnahhat8943'};
const YouTubeMark=()=><svg viewBox="0 0 28 20" width="20" height="14" aria-hidden="true"><rect width="28" height="20" rx="6" fill="#ff0033"/><path d="M11.2 5.8v8.4l7.4-4.2z" fill="#fff"/></svg>;

export default function YouTubeSubscribe({ar=false,item:provided}){
 const [loaded,setLoaded]=useState(null),[opened,setOpened]=useState(false),timer=useRef(0);
 useEffect(()=>{
  if(provided!==undefined)return undefined;
  let alive=true;
  apiRequest('/youtube/channel').then(({item})=>{if(alive)setLoaded(item);}).catch(()=>{});
  return()=>{alive=false;};
 },[provided]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const item=provided===undefined?loaded:provided;
 // Switched off in Admin: hide. Not configured yet (or the API is unreachable): use the public channel.
 if(item&&item.configured&&item.enabled===false)return null;
 const configured=item?.configured&&item.url;
 const url=configured?item.url:`https://www.youtube.com/@${FALLBACK.handle}`,handle=configured?(item.handle?`@${item.handle}`:item.title):`@${FALLBACK.handle}`;
 const title=configured&&item.title?item.title:'DJ Khalil Nahhat';
 const tr=(en,arabic)=>ar?arabic:en;
 const count=Number.isSafeInteger(item?.subscribers)?new Intl.NumberFormat(ar?'ar':'en',{notation:'compact',maximumFractionDigits:1}).format(item.subscribers):'';
 const subscribe=()=>{
  window.open(`${url}${url.includes('?')?'&':'?'}sub_confirmation=1`,'_blank','noopener,noreferrer');
  setOpened(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setOpened(false),7000);
 };
 return <article className="yt-subscribe" dir={ar?'rtl':'ltr'} aria-label={tr('Subscribe to DJ Khalil on YouTube','اشترك في قناة دي جي خليل على يوتيوب')}>
  <div className="yt-channel">
   <FollowAvatar badge={<YouTubeMark/>}/>
   <div className="yt-identity">
    <strong>{title}</strong>
    <span dir="ltr">{handle}{count&&<> · {count} <bdi>{tr('subscribers','مشترك')}</bdi></>}</span>
   </div>
  </div>
  <div className="yt-actions">
   <button type="button" className={`yt-button${opened?' is-opened':''}`} onClick={subscribe} aria-live="polite">
    <span className="yt-button-icon" aria-hidden="true">{opened?<BellRing size={18}/>:<Bell size={18}/>}</span>
    <span className="yt-button-label">{opened?tr('Confirm on YouTube','أكّد على يوتيوب'):tr('Subscribe','اشترك')}</span>
    {opened&&<Check size={16} className="yt-button-check" aria-hidden="true"/>}
   </button>
   <a className="yt-watch" href={url} target="_blank" rel="noopener noreferrer"><Play size={15} fill="currentColor" aria-hidden="true"/>{tr('Watch videos','شاهد الفيديوهات')}</a>
  </div>
 </article>;
}
