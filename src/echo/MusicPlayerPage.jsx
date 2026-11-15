import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ListMusic,Pause,Play,Repeat,SkipBack,SkipForward,Shuffle,X} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {fetchOntologyRecordings,recordingTypeLabel} from '../lib/musicOntology';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import {archiveResults} from '../lib/archiveSearch';
import {archiveLibrary} from '../lib/archiveLibrary';
import ArtworkGlow from './ArtworkGlow';
import MusicContentLoader from './MusicContentLoader';
import './musicPlayerPage.css';

const FALLBACK_ART='https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
const clock=value=>Number.isFinite(value)&&value>=0?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
const seconds=value=>{const parts=String(value||'').split(':').map(Number);return parts.length>1&&parts.every(Number.isFinite)?parts.reduce((sum,part)=>sum*60+part,0):0;};
const artwork=track=>displayImageUrl(track?.coverImage)||FALLBACK_ART;
// Only this small piece re-renders with the playing time.
function Time({trackId,children}){return children(useArchivePlaybackPosition(trackId));}

// The music player: a dark skeuomorphic deck with a swipeable artwork wheel. It replaces the Music page content in place
// (`onClose` given) or stands alone on /music/player. The page colours itself from the artwork and moves with the beat.
export default function MusicPlayerPage({lang,type:typeProp,onClose}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const type=useMemo(()=>typeProp??new URLSearchParams(window.location.search).get('type')??'',[typeProp]);
  const [collections,setCollections]=useState([]),[songs,setSongs]=useState([]),[status,setStatus]=useState('loading');
  const [selectedId,setSelectedId]=useState(''),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false),[listOpen,setListOpen]=useState(false);
  const player=useArchivePlayerState(),root=useRef(null),wheel=useRef(null);
  useEffect(()=>{const html=document.documentElement;html.classList.add('echo-music-player-open');return()=>html.classList.remove('echo-music-player-open');},[]);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const catalog=await fetchMusicArchiveCatalog();
        const rows=catalog.ontologyVersion?await fetchOntologyRecordings(type?{recordingType:type}:{}):catalog.songs;
        const library=archiveLibrary({...catalog,songs:rows});
        const list=archiveResults(library,{query:'',sort:'curated',collectionId:''}).songs;
        if(alive){setCollections(library.collections.filter(item=>!type||item.workTypeId===type));setSongs(list);setStatus('ready');}
      }catch{if(alive){setSongs([]);setStatus('error');}}
    })();
    return()=>{alive=false;};
  },[type]);
  const playingNow=player.track&&songs.some(song=>song.id===player.track.id)?player.track.id:'';
  const current=songs.find(song=>song.id===(playingNow||selectedId))||songs[0]||null;
  const index=current?songs.indexOf(current):-1;
  const inPlayer=Boolean(current&&player.track?.id===current.id),playing=inPlayer&&player.playing,busy=inPlayer&&(player.preparing||player.buffering);
  const duration=inPlayer&&player.duration?player.duration:seconds(current?.duration);
  const start=track=>{if(!track)return;setSelectedId(track.id);window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:songs.map(item=>item.id),inline:true}}));};
  const toggle=()=>{if(!current)return;if(inPlayer)archivePlayerCommand('toggle');else start(current);};
  const go=offset=>{if(songs.length)start(songs[(index+offset+songs.length*8)%songs.length]);};
  const step=direction=>{if(songs.length<2)return;go(shuffle?1+Math.floor(Math.random()*(songs.length-1)):direction);};
  // Repeat: when the last queued track ends, start over.
  const position=useArchivePlaybackPosition(current?.id);
  useEffect(()=>{if(repeat&&inPlayer&&!player.playing&&!busy&&duration>0&&position>=duration-.6)go(1);},[repeat,inPlayer,player.playing,busy,duration,position]);// eslint-disable-line react-hooks/exhaustive-deps

  // Beat: the audio engine publishes pulse/energy every frame; write them straight to CSS variables (no re-render).
  useEffect(()=>{
    const frame=event=>{const d=event.detail||{},node=root.current;if(!node)return;const on=d.playing&&d.audible!==false;
      node.style.setProperty('--beat',on?(d.pulse||0).toFixed(3):'0');node.style.setProperty('--energy',on?(d.energy||0).toFixed(3):'0');
      node.style.setProperty('--bass',on?(d.bass||0).toFixed(3):'0');node.style.setProperty('--high',on?(d.high||0).toFixed(3):'0');};
    window.addEventListener('echo:music-frame',frame);return()=>window.removeEventListener('echo:music-frame',frame);
  },[]);

  // Swipe the wheel: drag follows the finger, release past a third of a cover changes the song.
  const drag=useRef(null);
  const down=event=>{drag.current={x:event.clientX,moved:0};wheel.current?.setPointerCapture?.(event.pointerId);wheel.current?.classList.add('is-dragging');};
  const move=event=>{const d=drag.current;if(!d)return;d.moved=event.clientX-d.x;wheel.current?.style.setProperty('--drag',`${d.moved}px`);};
  const up=()=>{const d=drag.current;if(!d)return;drag.current=null;wheel.current?.classList.remove('is-dragging');wheel.current?.style.setProperty('--drag','0px');
    const unit=wheel.current?.querySelector('.wp-cover.is-center')?.offsetWidth||120;if(Math.abs(d.moved)>unit/3)go(d.moved<0?1:-1);else d.moved=0;wheel.current.dataset.swiped=Math.abs(d.moved)>6?'1':'';};
  const key=event=>{if(event.key==='ArrowRight')go(ar?-1:1);else if(event.key==='ArrowLeft')go(ar?1:-1);};

  const grouped=useMemo(()=>{
    const used=new Set(),groups=collections.map(item=>({id:item.id,title:item.title,songs:(item.recordingIds||[]).map(id=>songs.find(song=>song.id===id)).filter(Boolean)})).filter(group=>group.songs.length);
    groups.forEach(group=>group.songs.forEach(song=>used.add(song.id)));
    const rest=songs.filter(song=>!used.has(song.id));
    return rest.length?[...groups,{id:'',title:groups.length?tr('Other recordings','تسجيلات أخرى'):tr('All recordings','كل التسجيلات'),songs:rest}]:groups;
  },[collections,songs]);// eslint-disable-line react-hooks/exhaustive-deps
  const chosen=collections.find(item=>item.recordingIds?.includes(current?.id));
  const heading=type==='LIVE'?tr('Reels','ريلز'):type?recordingTypeLabel(type):tr('All recordings','كل التسجيلات');
  const art=current?artwork(current):FALLBACK_ART;
  const back=onClose?<button type="button" className="wp-icon" onClick={onClose} aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={22}/></button>:<a className="wp-icon" href="/music" aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={22}/></a>;
  if(status==='loading')return <section className="wp wp-loading" dir={ar?'rtl':'ltr'}><MusicContentLoader ar={ar}/></section>;
  return <section ref={root} className={`wp${onClose?' wp-inline':''}`} dir={ar?'rtl':'ltr'} aria-label={tr('Music player','مشغل الموسيقى')}>
    <ArtworkGlow url={current?art:''}/>
    <div className="wp-grain" aria-hidden="true"/>
    <div className="wp-deck">
      <header className="wp-top">
        <button type="button" className="wp-icon" onClick={()=>setListOpen(true)} disabled={!songs.length} aria-label={tr('Open the recordings list','فتح قائمة التسجيلات')}><ListMusic size={22}/></button>
        <span className="wp-badge" title={heading}><img src={art} alt=""/></span>
        {back}
      </header>
      {!current?<p className="wp-empty" role={status==='error'?'alert':'status'}>{status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):tr('No recordings here yet.','لا توجد تسجيلات هنا بعد.')}</p>:<>
        <div className="wp-wheel" ref={wheel} dir="ltr" tabIndex={0} role="group" aria-roledescription="carousel" aria-label={tr('Artwork wheel — swipe to change recording','عجلة الأغلفة — اسحب لتغيير التسجيل')} onKeyDown={key}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {[-2,-1,0,1,2].map(o=>{const song=songs.length>1||o===0?songs[(index+o+songs.length*8)%songs.length]:null;if(!song)return null;
            return <button key={`${o}-${song.id}`} type="button" tabIndex={-1} className={`wp-cover${o===0?' is-center':''}`} style={{'--o':o}} aria-label={song.title}
              onClick={()=>{if(wheel.current?.dataset.swiped)return;if(o===0)toggle();else go(o);}}><img src={artwork(song)} alt="" draggable="false"/></button>;})}
        </div>
        <div className="wp-info" aria-live="polite"><h2 dir="auto">{current.title}</h2><p dir="auto">{chosen?.title||heading}</p><p dir="auto">{current.artist||'DJ Khalil'}</p></div>
        <Time trackId={current.id}>{pos=>{const progress=duration>0?Math.max(0,Math.min(1,pos/duration)):0;return <div className="wp-progress" dir="ltr">
          <span>{clock(pos)}</span>
          <div className="wp-line"><i style={{width:`${progress*100}%`}}/><input type="range" min="0" max={duration||1} step=".1" value={Math.min(pos,duration||1)} disabled={!inPlayer||!duration} aria-label={tr('Seek recording','تقديم التسجيل')} onChange={event=>archivePlayerCommand('seek',Number(event.target.value))}/></div>
          <span>{clock(duration)}</span></div>;}}</Time>
        <div className="wp-transport" dir="ltr">
          <button type="button" className="wp-mode" aria-pressed={shuffle} onClick={()=>setShuffle(v=>!v)} aria-label={tr('Shuffle','عشوائي')}><Shuffle size={18}/></button>
          <button type="button" onClick={()=>step(-1)} disabled={songs.length<2} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack size={26} fill="currentColor"/></button>
          <button type="button" className="wp-play" onClick={toggle} aria-busy={busy} aria-label={playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{playing?<Pause size={30} fill="currentColor"/>:<Play size={30} fill="currentColor"/>}</button>
          <button type="button" onClick={()=>step(1)} disabled={songs.length<2} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={26} fill="currentColor"/></button>
          <button type="button" className="wp-mode" aria-pressed={repeat} onClick={()=>setRepeat(v=>!v)} aria-label={tr('Repeat','تكرار')}><Repeat size={18}/></button>
        </div></>}
    </div>
    {listOpen&&<div className="wp-overlay" role="dialog" aria-modal="true" aria-label={tr('Recordings by collection','التسجيلات حسب المجموعة')} onKeyDown={event=>{if(event.key==='Escape')setListOpen(false);}}>
      <div className="wp-sheet"><header><h3>{heading}</h3><button type="button" className="wp-icon" autoFocus onClick={()=>setListOpen(false)} aria-label={tr('Close list','إغلاق القائمة')}><X size={20}/></button></header>
        <div className="wp-groups">{grouped.map(group=><section key={group.id||'rest'}><h4>{group.title}<span>{group.songs.length}</span></h4>
          <ol>{group.songs.map(song=>{const on=song.id===current?.id;return <li key={song.id}><button type="button" className={on?'is-current':''} aria-current={on?'true':undefined} onClick={()=>{start(song);setListOpen(false);}}>
            <img src={artwork(song)} alt="" loading="lazy"/><span dir="auto">{song.title}</span><small>{song.duration||''}</small></button></li>;})}</ol></section>)}</div></div></div>}
  </section>;
}
