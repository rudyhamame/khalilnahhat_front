import {useEffect,useRef,useState} from 'react';
import {BellRing,Check,Headphones,UserPlus} from 'lucide-react';
import FollowAvatar from './FollowAvatar';
import './youtubeSubscribe.css';

// Anghami follow card, same dark style as the YouTube subscribe card with a purple accent. Following happens on Anghami
// (the link opens the artist page), so after the click the button says "Finish on Anghami", never "Following".
export const ANGHAMI_ARTIST_URL='https://play.anghami.com/artist/6095441';
const AnghamiMark=()=><svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#7d2ae8"/><path d="M8 24 16 8l8 16M11.4 18.2h9.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function AnghamiFollow({ar=false,url=ANGHAMI_ARTIST_URL}){
 const [opened,setOpened]=useState(false),timer=useRef(0);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const tr=(en,arabic)=>ar?arabic:en;
 const follow=()=>{window.open(url,'_blank','noopener,noreferrer');setOpened(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setOpened(false),7000);};
 return <article className="yt-subscribe is-anghami" dir={ar?'rtl':'ltr'} aria-label={tr('Follow DJ Khalil on Anghami','تابع دي جي خليل على أنغامي')}>
  <div className="yt-channel">
   <FollowAvatar badge={<AnghamiMark/>}/>
   <div className="yt-identity"><strong>DJ Khalil Nahhat</strong><span>{tr('Artist on Anghami','فنان على أنغامي')}</span></div>
  </div>
  <div className="yt-actions">
   <button type="button" className={`yt-button${opened?' is-opened':''}`} onClick={follow} aria-live="polite">
    <span className="yt-button-icon" aria-hidden="true">{opened?<BellRing size={18}/>:<UserPlus size={18}/>}</span>
    <span className="yt-button-label">{opened?tr('Finish on Anghami','أكمل على أنغامي'):tr('Follow','تابع')}</span>
    {opened&&<Check size={16} className="yt-button-check" aria-hidden="true"/>}
   </button>
   <a className="yt-watch" href={url} target="_blank" rel="noopener noreferrer"><Headphones size={15} aria-hidden="true"/>{tr('Listen','استمع')}</a>
  </div>
 </article>;
}
