import {useEffect,useRef,useState} from 'react';
import {Pause,Play,SkipForward,X} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import './headerMiniPlayer.css';

// A pill in the header that keeps the music going and controllable on every page; it opens the matching player inside the Music page.
export default function HeaderMiniPlayer({ar=false,path}){
 const player=useArchivePlayerState(),track=player.track,position=useArchivePlaybackPosition(track?.id),arrived=useRef(null);
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{setDismissed(false);},[track?.id]);
 useEffect(()=>{if(player.playing)setDismissed(false);},[player.playing]);
 // Leaving the music player: the artwork badge flies from where it sat into this pill, then the pill's own artwork shows.
 useEffect(()=>{
  const fly=event=>requestAnimationFrame(()=>{
   const from=event.detail,target=arrived.current;
   if(!from||!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const to=target.getBoundingClientRect(),zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   if(!to.width)return;
   const clone=document.createElement('img');clone.src=from.src;clone.setAttribute('aria-hidden','true');
   Object.assign(clone.style,{position:'fixed',zIndex:'200',borderRadius:'50%',objectFit:'cover',pointerEvents:'none',left:`${from.left/zoom}px`,top:`${from.top/zoom}px`,width:`${from.width/zoom}px`,height:`${from.height/zoom}px`,transformOrigin:'0 0'});
   document.body.appendChild(clone);target.style.visibility='hidden';
   clone.animate([{transform:'none'},{transform:`translate(${(to.left-from.left)/zoom}px,${(to.top-from.top)/zoom}px) scale(${to.width/from.width})`}],{duration:620,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'}).finished.catch(()=>{}).finally(()=>{target.style.visibility='';clone.remove();});
  });
  window.addEventListener('echo:player-badge-leave',fly);return()=>window.removeEventListener('echo:player-badge-leave',fly);
 },[]);

 if(!track||dismissed||path==='/'||/^\/admin(\/|$)/.test(path))return null;
 const tr=(en,arabic)=>ar?arabic:en,playing=player.playing,busy=player.preparing||player.buffering;
 const progress=player.duration>0?Math.max(0,Math.min(1,position/player.duration)):0;
 const art=displayImageUrl(track.coverImage);
 const next=()=>{const list=player.tracks||[];if(list.length<2)return;const at=list.findIndex(item=>item.id===track.id),target=list[(at+1)%list.length];window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:target.id,ids:list.map(item=>item.id),inline:true}}));};
 return <div className="header-mini-player" dir={ar?'rtl':'ltr'} role="group" aria-label={tr('Now playing','قيد التشغيل')}>
  <a className="hmp-open" href={`/music?play=${encodeURIComponent(track.workType||'')}`} onClick={event=>{if(path==='/music'){event.preventDefault();window.dispatchEvent(new CustomEvent('echo:work-player-open',{detail:{type:track.workType}}));}}} title={tr('Open the music player','فتح مشغل الموسيقى')}>
   <span ref={arrived} className={`hmp-art${playing?' is-spinning':''}`}>{art?<img src={art} alt=""/>:null}</span>
   <span className="hmp-text"><strong dir="auto">{track.title}</strong><small dir="auto">{track.artist||'DJ Khalil'}</small></span>
  </a>
  <button type="button" className="hmp-play" onClick={()=>archivePlayerCommand('toggle')} aria-label={playing?tr('Pause','إيقاف مؤقت'):tr('Play','تشغيل')}>{busy&&!playing?<i className="hmp-spin" aria-hidden="true"/>:playing?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}</button>
  <button type="button" className="hmp-next" onClick={next} disabled={(player.tracks||[]).length<2} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={15} fill="currentColor"/></button>
  <button type="button" className="hmp-close" onClick={()=>{archivePlayerCommand('stop');setDismissed(true);}} aria-label={tr('Close mini player','إغلاق المشغل المصغر')} title={tr('Close mini player','إغلاق المشغل المصغر')}><X size={15}/></button>
  <i className="hmp-progress" style={{width:`${progress*100}%`}} aria-hidden="true"/>
 </div>;
}
