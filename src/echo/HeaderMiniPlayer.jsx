import {useEffect,useRef,useState} from 'react';
import {Disc3,X} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import './headerMiniPlayer.css';

// A pill in the header that keeps the music going and controllable on every page; it opens the matching player inside the Music page.
export default function HeaderMiniPlayer({ar=false,path}){
 const player=useArchivePlayerState(),track=player.track,position=useArchivePlaybackPosition(track?.id),arrived=useRef(null);
 const [dismissed,setDismissed]=useState(false);
 const [menu,setMenu]=useState(false),root=useRef(null);
 useEffect(()=>{
  if(!menu)return undefined;
  const outside=event=>{if(!root.current?.contains(event.target))setMenu(false);};
  const key=event=>{if(event.key==='Escape')setMenu(false);};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
 },[menu]);
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
 const openPlayer=()=>{setMenu(false);if(path==='/music')window.dispatchEvent(new CustomEvent('echo:work-player-open',{detail:{type:track.workType}}));else window.location.assign(`/music?play=${encodeURIComponent(track.workType||'')}`);};
 const closeRecording=()=>{setMenu(false);archivePlayerCommand('eject');setDismissed(true);};
 // The round record button: tapping it drops a small menu (go to the player of this recording, or close the recording).
 return <div ref={root} className="header-mini-player" dir={ar?'rtl':'ltr'} role="group" aria-label={tr('Now playing','قيد التشغيل')}>
  <button type="button" className="hmp-open" aria-haspopup="menu" aria-expanded={menu} onClick={()=>setMenu(value=>!value)} title={`${track.title} · ${tr('Now playing','قيد التشغيل')}`} aria-label={`${tr('Now playing','قيد التشغيل')}: ${track.title}`}>
   <span ref={arrived} className={`hmp-art${playing?' is-spinning':''}`}>{art?<img src={art} alt=""/>:null}</span>
  </button>
  {menu&&<div className="hmp-menu" role="menu" aria-label={track.title}>
   <p className="hmp-menu-title" dir="auto">{track.title}</p>
   <button type="button" role="menuitem" onClick={openPlayer}><Disc3 size={16} aria-hidden="true"/><span>{tr('Go to music player','الذهاب إلى مشغل الموسيقى')}</span></button>
   <button type="button" role="menuitem" onClick={closeRecording}><X size={16} aria-hidden="true"/><span>{tr('Close recording','إغلاق التسجيل')}</span></button>
  </div>}
 </div>;
}
