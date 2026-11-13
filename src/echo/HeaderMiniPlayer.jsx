import {Pause,Play,SkipForward} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import './headerMiniPlayer.css';

// A pill in the header that keeps the music going and controllable on every page; it opens the player page.
export default function HeaderMiniPlayer({ar=false,path}){
 const player=useArchivePlayerState(),track=player.track,position=useArchivePlaybackPosition(track?.id);
 if(!track||path==='/music/player'||/^\/admin(\/|$)/.test(path))return null;
 const tr=(en,arabic)=>ar?arabic:en,playing=player.playing,busy=player.preparing||player.buffering;
 const progress=player.duration>0?Math.max(0,Math.min(1,position/player.duration)):0;
 const art=displayImageUrl(track.coverImage);
 const next=()=>{const list=player.tracks||[];if(list.length<2)return;const at=list.findIndex(item=>item.id===track.id),target=list[(at+1)%list.length];window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:target.id,ids:list.map(item=>item.id),inline:true}}));};
 return <div className="header-mini-player" dir={ar?'rtl':'ltr'} role="group" aria-label={tr('Now playing','قيد التشغيل')}>
  <a className="hmp-open" href="/music/player" title={tr('Open the music player','فتح مشغل الموسيقى')}>
   <span className={`hmp-art${playing?' is-spinning':''}`}>{art?<img src={art} alt=""/>:null}</span>
   <span className="hmp-text"><strong dir="auto">{track.title}</strong><small dir="auto">{track.artist||'DJ Khalil'}</small></span>
  </a>
  <button type="button" className="hmp-play" onClick={()=>archivePlayerCommand('toggle')} aria-label={playing?tr('Pause','إيقاف مؤقت'):tr('Play','تشغيل')}>{busy&&!playing?<i className="hmp-spin" aria-hidden="true"/>:playing?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}</button>
  <button type="button" className="hmp-next" onClick={next} disabled={(player.tracks||[]).length<2} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={15} fill="currentColor"/></button>
  <i className="hmp-progress" style={{width:`${progress*100}%`}} aria-hidden="true"/>
 </div>;
}
