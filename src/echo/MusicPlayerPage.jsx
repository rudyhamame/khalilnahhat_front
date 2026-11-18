import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Disc3,Info,Pause,Play,Repeat,SkipBack,SkipForward,Shuffle,Square} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {asArchiveSong,fetchOntologyRecordings} from '../lib/musicOntology';
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
// The facts the archive holds about a recording; anything it does not know is left out.
const metaRows=(song,tr,workType,ar)=>{
  const atoms=song.atoms||[],uniq=list=>[...new Set(list)],m={bpms:uniq(atoms.flatMap(a=>a.sound?.bpms||[])),keys:uniq(atoms.flatMap(a=>a.sound?.keys||[]))},rows=[
    [tr('Type','النوع'),djWorkTypeText(song.workTypeDefinition||workType,ar).name],[tr('Artists','الفنانون'),song.artist],[tr('Released','التاريخ'),song.date],[tr('Length','المدة'),song.duration],
    [tr('Tempo','الإيقاع'),(m.bpms||[]).map(v=>`${Math.round(v)} BPM`).join(' · ')],[tr('Key','السلم'),(m.keys||[]).join(', ')],
    [tr('Vocalists','المغنون'),atoms.reduce((n,a)=>n+(a.lyrics?.vocalistCredits||[]).length,0)||''],[tr('Musicians','العازفون'),atoms.reduce((n,a)=>n+(a.sound?.musicianCredits||[]).length,0)||''],[tr('Stems','المسارات'),(song.stems?.channels||[]).length||''],
  ];
  return rows.filter(([,value])=>value!==''&&value!==undefined&&value!==null);
};
// Only this small piece re-renders with the playing time.
function Time({trackId,children}){return children(useArchivePlaybackPosition(trackId));}

// A swipeable player that replaces a work box in place.
export default function MusicPlayerPage({lang,type:typeProp,workType,onClose}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const type=useMemo(()=>typeProp??new URLSearchParams(window.location.search).get('type')??'',[typeProp]);
  const [collections,setCollections]=useState([]),[songs,setSongs]=useState([]),[flipped,setFlipped]=useState(false),[browse,setBrowse]=useState(''),[hint,setHint]=useState(onClose?'back':'browse'),[scope,setScope]=useState(''),[viewId,setViewId]=useState(''),[status,setStatus]=useState('loading');
  const [selectedId,setSelectedId]=useState(()=>new URLSearchParams(window.location.search).get('recording')||''),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false);
  const player=useArchivePlayerState(),root=useRef(null),wheel=useRef(null);
  const badge=useRef(null),badgeBox=useRef(null);
  // The spinning badge becomes the header mini-player: remember where it is, and announce it when the player closes.
  useEffect(()=>{const mark=()=>{const r=badge.current?.getBoundingClientRect();if(r&&r.width)badgeBox.current={left:r.left,top:r.top,width:r.width,height:r.height};};mark();window.addEventListener('resize',mark);const timer=setInterval(mark,500);return()=>{window.removeEventListener('resize',mark);clearInterval(timer);};},[]);
  useEffect(()=>{const html=document.documentElement;if(!onClose)html.classList.add('echo-music-player-open');return()=>{if(!onClose)html.classList.remove('echo-music-player-open');if(badgeBox.current)window.dispatchEvent(new CustomEvent('echo:player-badge-leave',{detail:{...badgeBox.current,src:badge.current?.querySelector('img')?.src||''}}));};},[onClose]);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const catalog=await fetchMusicArchiveCatalog();
        const rows=catalog.ontologyVersion?(await fetchOntologyRecordings(type?{workType:type}:{})).map(asArchiveSong):catalog.songs;
        const library=archiveLibrary({...catalog,songs:rows});
        const list=archiveResults(library,{query:'',sort:'curated',collectionId:''}).songs;
        if(alive){setCollections(library.collections.filter(item=>!type||item.workTypeId===type));setSongs(list);setStatus('ready');}
      }catch{if(alive){setSongs([]);setStatus('error');}}
    })();
    return()=>{alive=false;};
  },[type]);
  const playingNow=player.track&&songs.some(song=>song.id===player.track.id)?player.track.id:'';
  const current=songs.find(song=>song.id===(playingNow||selectedId))||songs[0]||null;
  // The playing queue is every recording of this sound, or just the collection chosen from the badge list.
  const list=useMemo(()=>{const scoped=scope?collections.find(item=>item.id===scope):null;const rows=scoped?(scoped.recordingIds||[]).map(id=>songs.find(song=>song.id===id)).filter(Boolean):songs;return rows.length?rows:songs;},[scope,collections,songs]);
  const index=current?Math.max(0,list.indexOf(current)):-1;
  const inPlayer=Boolean(current&&player.track?.id===current.id),playing=inPlayer&&player.playing,busy=inPlayer&&(player.preparing||player.buffering);
  const duration=inPlayer&&player.duration?player.duration:seconds(current?.duration);
  const start=(track,queue=list)=>{if(!track)return;setSelectedId(track.id);window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:queue.map(item=>item.id),inline:true}}));};
  const toggle=()=>{if(!current)return;if(inPlayer)archivePlayerCommand('toggle');else start(current);};
  const go=offset=>{if(list.length)start(list[(index+offset+list.length*8)%list.length]);};
  const step=direction=>{if(list.length<2)return;go(shuffle?1+Math.floor(Math.random()*(list.length-1)):direction);};
  // Repeat: when the last queued track ends, start over.
  const position=useArchivePlaybackPosition(current?.id);
  useEffect(()=>{if(repeat&&inPlayer&&!player.playing&&!busy&&duration>0&&position>=duration-.6)go(1);},[repeat,inPlayer,player.playing,busy,duration,position]);// eslint-disable-line react-hooks/exhaustive-deps

  // Two short nudges when the player opens, one after the other: the back button (blinks with a note), then the round picture in the middle (what it opens). The first dismisses on any touch or after 6s and hands over to the second, which stays until the picture is tapped or 10s pass.
  useEffect(()=>{if(!hint)return undefined;const timer=setTimeout(()=>setHint(hint==='back'?'browse':''),hint==='back'?6000:10000);return()=>clearTimeout(timer);},[hint]);

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

  const viewing=collections.find(item=>item.id===viewId)||null;
  const viewSongs=viewing?(viewing.recordingIds||[]).map(id=>songs.find(song=>song.id===id)).filter(Boolean):songs;
  const chosen=collections.find(item=>item.recordingIds?.includes(current?.id));
  const heading=djWorkTypeText(workType,ar).name||tr('Recordings','التسجيلات');
  const art=current?artwork(current):FALLBACK_ART;
  const back=onClose?<button type="button" className={`wp-icon${hint==='back'?' is-hinting':''}`} onClick={onClose} aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={22}/></button>:<a className="wp-icon" href="/music" aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={22}/></a>;
  if(status==='loading')return <section className={`wp wp-loading${onClose?' wp-inline':''}`} dir={ar?'rtl':'ltr'}>{onClose&&<div className="wp-back">{back}</div>}<MusicContentLoader ar={ar}/></section>;
  return <section ref={root} className={`wp${onClose?' wp-inline':''}`} dir={ar?'rtl':'ltr'} aria-label={tr('Music player','مشغل الموسيقى')} onPointerDownCapture={event=>{if(hint==='back')setHint('browse');else if(hint==='browse'&&event.target.closest?.('.wp-badge'))setHint('');}}>
    {!onClose&&<ArtworkGlow url={current?art:''}/>}
    {!onClose&&<div className="wp-grain" aria-hidden="true"/>}
    {!onClose&&<div className="wp-back">{back}</div>}
  <div className="wp-stage">
    <div className={`wp-card${flipped?' is-flipped':''}${browse?' is-browsing':''}`}>
    <div className="wp-deck" aria-hidden={flipped||browse?true:undefined} inert={flipped||Boolean(browse)||undefined}>
      <header className="wp-top">
        {onClose?back:<span className="wp-icon wp-spacer" aria-hidden="true"/>}
        {onClose&&hint==='back'&&!browse&&!flipped&&<span className="wp-back-hint" aria-hidden="true">{tr('Finished listening? Tap the arrow to head back.','خلّصت استماع؟ اضغط على السهم للرجوع.')}</span>}
        <button type="button" ref={badge} className={`wp-badge${hint==='browse'&&!browse?' is-hinting':''}`} title={tr('Browse collections and recordings','تصفّح المجموعات والتسجيلات')} aria-label={tr('Browse collections','تصفّح المجموعات')} aria-haspopup="true" aria-expanded={Boolean(browse)} onClick={()=>setBrowse('collections')}><img src={art} alt=""/></button>
        {hint==='browse'&&!browse&&!flipped&&<span className="wp-badge-hint" aria-hidden="true">{tr('Tap the round picture to browse collections, then pick a recording.','اضغط على الصورة الدائرية لتصفّح المجموعات ثم اختر تسجيلاً.')}</span>}
        <button type="button" className="wp-icon" onClick={()=>setFlipped(true)} disabled={!current} aria-label={tr('Show the recording details','عرض تفاصيل التسجيل')}><Info size={20}/></button>
      </header>
      {!current?<p className="wp-empty" role={status==='error'?'alert':'status'}>{status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):tr('No recordings here yet.','لا توجد تسجيلات هنا بعد.')}</p>:<>
        <div className="wp-wheel" ref={wheel} dir="ltr" tabIndex={0} role="group" aria-roledescription="carousel" aria-label={tr('Artwork wheel — swipe to change recording','عجلة الأغلفة — اسحب لتغيير التسجيل')} onKeyDown={key}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {[-2,-1,0,1,2].map(o=>{const song=list.length>1||o===0?list[(index+o+list.length*8)%list.length]:null;if(!song)return null;
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
          <button type="button" onClick={()=>step(-1)} disabled={list.length<2} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack size={26} fill="currentColor"/></button>
          <button type="button" className="wp-play" onClick={toggle} aria-busy={busy} aria-label={playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{playing?<Pause size={30} fill="currentColor"/>:<Play size={30} fill="currentColor"/>}</button>
          <button type="button" className="wp-mode wp-stop" disabled={!inPlayer} onClick={()=>archivePlayerCommand('eject')} aria-label={tr('Stop and unload','إيقاف وإزالة')} title={tr('Stop and unload','إيقاف وإزالة')}><Square size={16} fill="currentColor"/></button>
          <button type="button" onClick={()=>step(1)} disabled={list.length<2} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={26} fill="currentColor"/></button>
          <button type="button" className="wp-mode" aria-pressed={repeat} onClick={()=>setRepeat(v=>!v)} aria-label={tr('Repeat','تكرار')}><Repeat size={18}/></button>
        </div></>}
    </div>
    <div className="wp-meta" aria-hidden={!flipped||undefined} inert={!flipped||undefined}>
      <header className="wp-top"><button type="button" className="wp-icon" onClick={()=>setFlipped(false)} aria-label={tr('Back to the player','العودة إلى المشغل')}><ChevronLeft size={20}/></button><span className="wp-meta-title">{tr('Recording details','تفاصيل التسجيل')}</span><span className="wp-icon wp-spacer" aria-hidden="true"/></header>
      {current&&<>
        <div className="wp-meta-head"><img src={art} alt=""/><div><h2 dir="auto">{current.title}</h2><p dir="auto">{current.artist||'DJ Khalil'}</p></div></div>
        <dl className="wp-meta-list">{metaRows(current,tr,workType,ar).map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
        {current.description&&<p className="wp-meta-note" dir="auto">{current.description}</p>}
      </>}
    </div>
    <div className="wp-browse" aria-hidden={!browse||undefined} inert={!browse||undefined}>
      <header className="wp-top">
        <button type="button" className="wp-icon" onClick={()=>setBrowse(browse==='recordings'?'collections':'')} aria-label={browse==='recordings'?tr('Back to collections','العودة إلى المجموعات'):tr('Back to the player','العودة إلى المشغل')}><ChevronLeft size={20}/></button>
        <span className="wp-meta-title">{browse==='recordings'?(viewing?viewing.title:tr('All recordings','كل التسجيلات')):tr('Collections','المجموعات')}</span>
        <span className="wp-icon wp-spacer" aria-hidden="true"/>
      </header>
      {browse==='collections'&&<ul className="wp-browse-list" aria-label={tr('Collections','المجموعات')}>
        <li><button type="button" className="wp-browse-item" onClick={()=>{setViewId('');setBrowse('recordings');}}><span className="wp-browse-thumb"><Disc3 size={22} aria-hidden="true"/></span><span className="wp-browse-text"><strong>{tr('All recordings','كل التسجيلات')}</strong><small>{songs.length} {tr(songs.length===1?'recording':'recordings','تسجيلات')}</small></span><ChevronRight size={18} aria-hidden="true" className="wp-browse-go"/></button></li>
        {collections.map(item=>{const rows=(item.recordingIds||[]).map(id=>songs.find(song=>song.id===id)).filter(Boolean);return <li key={item.id}><button type="button" className="wp-browse-item" disabled={!rows.length} onClick={()=>{setViewId(item.id);setBrowse('recordings');}}><span className="wp-browse-thumb">{item.coverImage||rows[0]?<img src={displayImageUrl(item.coverImage)||artwork(rows[0])} alt="" loading="lazy"/>:<Disc3 size={22} aria-hidden="true"/>}</span><span className="wp-browse-text"><strong dir="auto">{item.title}</strong><small>{rows.length} {tr(rows.length===1?'recording':'recordings','تسجيلات')}</small></span><ChevronRight size={18} aria-hidden="true" className="wp-browse-go"/></button></li>;})}
      </ul>}
      {browse==='recordings'&&<ul className="wp-browse-list" aria-label={tr('Recordings','التسجيلات')}>
        {viewSongs.map(song=><li key={song.id}><button type="button" className={`wp-browse-item${song.id===current?.id?' is-current':''}`} aria-current={song.id===current?.id||undefined} onClick={()=>{setScope(viewId);start(song,viewSongs);setBrowse('');}}><span className="wp-browse-thumb"><img src={artwork(song)} alt="" loading="lazy"/></span><span className="wp-browse-text"><strong dir="auto">{song.title}</strong><small dir="auto">{song.artist||'DJ Khalil'}{song.duration?` · ${song.duration}`:''}</small></span><Play size={16} fill="currentColor" aria-hidden="true" className="wp-browse-go"/></button></li>)}
        {!viewSongs.length&&<li className="wp-browse-empty">{tr('No recordings here yet.','لا توجد تسجيلات هنا بعد.')}</li>}
      </ul>}
    </div>
    </div>
  </div>
  </section>;
}
