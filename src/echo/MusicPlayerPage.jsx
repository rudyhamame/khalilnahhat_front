import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,Share2,Heart,Pause,Play,Repeat,Shuffle,SkipBack,SkipForward,Volume1,Volume2} from 'lucide-react';
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
// The playing time of the current track only re-renders this small piece.
function Time({trackId,children}){return children(useArchivePlaybackPosition(trackId));}

// The music player as a page: artwork and the track list on top, the transport bar at the bottom.
export default function MusicPlayerPage({lang}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const params=useMemo(()=>new URLSearchParams(window.location.search),[]);
  const [type]=useState(params.get('type')||''),[collectionId,setCollectionId]=useState(params.get('collection')||''),[collections,setCollections]=useState([]);
  const [songs,setSongs]=useState([]),[status,setStatus]=useState('loading');
  // Each work type has its own admin-made collections. Choosing one narrows the page to it, in place, and keeps the address in step.
  const chooseCollection=id=>{if(id===collectionId)return;setCollectionId(id);setSelectedId('');setStatus('loading');const query=new URLSearchParams();if(type)query.set('type',type);if(id)query.set('collection',id);try{window.history.replaceState(null,'',`/music/player${query.size?`?${query}`:''}`);}catch{/* optional */}};
  const [selectedId,setSelectedId]=useState(''),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false);
  const [likes,setLikes]=useState(()=>{try{return JSON.parse(localStorage.getItem('echo-archive-likes')||'[]');}catch{return [];}});
  const player=useArchivePlayerState();
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const catalog=await fetchMusicArchiveCatalog();
        const rows=catalog.ontologyVersion?await fetchOntologyRecordings(type?{recordingType:type}:{}):catalog.songs;
        const library=archiveLibrary({...catalog,songs:rows});
        const list=archiveResults(library,{query:'',sort:'curated',collectionId}).songs.filter(song=>song.audioUrl);
        if(alive){setCollections(library.collections);setSongs(list);setStatus('ready');}
      }catch{if(alive){setSongs([]);setStatus('error');}}
    })();
    return()=>{alive=false;};
  },[type,collectionId]);
  const playingNow=player.track&&songs.some(song=>song.id===player.track.id)?player.track.id:'';
  const current=songs.find(song=>song.id===(playingNow||selectedId))||songs[0]||null;
  const index=current?songs.indexOf(current):-1;
  const inPlayer=Boolean(current&&player.track?.id===current.id),playing=inPlayer&&player.playing,busy=inPlayer&&(player.preparing||player.buffering);
  const duration=inPlayer&&player.duration?player.duration:seconds(current?.duration);
  const start=track=>{if(!track)return;setSelectedId(track.id);window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:songs.map(item=>item.id),inline:true}}));};
  const toggle=()=>{if(!current)return;if(inPlayer)archivePlayerCommand('toggle');else start(current);};
  const step=direction=>{if(!songs.length)return;const next=shuffle&&songs.length>1?songs[(index+1+Math.floor(Math.random()*(songs.length-1)))%songs.length]:songs[(index+direction+songs.length)%songs.length];start(next);};
  // Repeat: when the last queued track ends, start over.
  const position=useArchivePlaybackPosition(current?.id);
  useEffect(()=>{if(repeat&&inPlayer&&!player.playing&&!busy&&duration>0&&position>=duration-.6)start(songs[(index+1)%songs.length]);},[repeat,inPlayer,player.playing,busy,duration,position]);// eslint-disable-line react-hooks/exhaustive-deps
  const liked=Boolean(current&&likes.includes(current.id));
  const toggleLike=()=>{if(!current)return;setLikes(list=>{const next=list.includes(current.id)?list.filter(id=>id!==current.id):[...list,current.id];try{localStorage.setItem('echo-archive-likes',JSON.stringify(next));}catch{/* optional */}return next;});};
  const share=async()=>{if(!current)return;const data={title:current.title,text:`${current.title} · ${current.artist||'DJ Khalil'}`,url:window.location.href};try{if(navigator.share)await navigator.share(data);else await navigator.clipboard?.writeText(data.url);}catch{/* cancelled */}};
  const chosen=collections.find(item=>item.id===collectionId),heading=type==='LIVE'?tr('Reels','ريلز'):type?recordingTypeLabel(type):tr('All recordings','كل التسجيلات');
  const total=songs.reduce((sum,song)=>sum+seconds(song.duration),0),minutes=Math.round(total/60);
  const art=current?artwork(current):FALLBACK_ART;
  const hasCurrent=Boolean(current);
  const [loadedArt,setLoadedArt]=useState('');
  useEffect(()=>{
    if(status!=='ready'||!hasCurrent)return;
    let alive=true;
    const image=new Image();
    // A failed cover must not prevent access to the recordings.
    const settle=()=>{if(alive)setLoadedArt(art);};
    image.onload=settle;image.onerror=settle;image.src=art;
    if(image.complete)settle();
    return()=>{alive=false;image.onload=null;image.onerror=null;};
  },[art,status,hasCurrent]);
  const loading=status==='loading'||(status==='ready'&&hasCurrent&&loadedArt!==art);
  if(loading)return <section className="mpp mpp-is-loading" dir={ar?'rtl':'ltr'} aria-label={tr('Music player','مشغل الموسيقى')}>
    <header className="mpp-top"><a className="mpp-back" href="/music" aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={26}/></a></header>
    <MusicContentLoader ar={ar}/>
  </section>;
  return <section className="mpp" dir={ar?'rtl':'ltr'} aria-label={tr('Music player','مشغل الموسيقى')}>
    <div className="mpp-backdrop" style={{backgroundImage:`url(${JSON.stringify(art)})`}} aria-hidden="true"/>
    <ArtworkGlow url={current?art:''}/>
    <header className="mpp-top">
      <a className="mpp-back" href="/music" aria-label={tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}><ChevronLeft size={26}/></a>
      
      <nav className="mpp-collections" aria-label={tr('Collections','المجموعات')}><div role="tablist">{[{id:'',title:tr('All','الكل')},...collections.filter(item=>!type||item.workTypeId===type)].map(item=>{const on=collectionId===item.id;return <button key={item.id||'all'} type="button" role="tab" aria-selected={on} className={on?'is-active':''} onClick={()=>chooseCollection(item.id)}>{item.title}</button>;})}</div></nav>
      <button type="button" className="mpp-more" onClick={share} disabled={!current} aria-label={tr('Share this recording','مشاركة التسجيل')}><Share2 size={20}/></button>
    </header>
    <div className="mpp-body">
      <div className="mpp-cover"><img src={art} alt={current?`${current.title}`:''}/></div>
      <div className="mpp-side">
        <div className="mpp-album"><span className="mpp-artist">{chosen?.title||current?.artist||'DJ Khalil'}</span><h1>{heading}</h1>
          <p><span>{songs.length} {songs.length===1?tr('song','أغنية'):tr('songs','أغنية')}</span>{minutes>0&&<span>{minutes} {tr('min','د')}</span>}</p></div>
        <div className="mpp-actions">
          <button type="button" className="mpp-primary" onClick={toggle} disabled={!current} aria-busy={busy}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}{playing?tr('Pause','إيقاف مؤقت'):tr('Play','تشغيل')}</button>
          <button type="button" className="mpp-save" aria-pressed={liked} onClick={toggleLike} disabled={!current} aria-label={liked?tr('Remove from favourites','إزالة من المفضلة'):tr('Add to favourites','إضافة إلى المفضلة')}><Heart size={22} fill={liked?'currentColor':'none'}/></button>
        </div>
        {songs.length===0?<p className="mpp-empty" role={status==='error'?'alert':'status'}>{status==='loading'?tr('Loading recordings…','جارٍ تحميل التسجيلات…'):status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):tr('No recordings here yet.','لا توجد تسجيلات هنا بعد.')}</p>:<ol className="mpp-tracks">{songs.map((song,at)=>{const isCurrent=song.id===current?.id,on=isCurrent&&playing;return <li key={song.id}><button type="button" className={isCurrent?'is-current':''} aria-current={isCurrent?'true':undefined} onClick={()=>isCurrent?toggle():start(song)}>
          <span className="mpp-n">{on?<i className="mpp-eq" aria-hidden="true"><b/><b/><b/></i>:at+1}</span><span className="mpp-t" dir="auto">{song.title}</span><span className="mpp-d">{song.duration||''}</span></button></li>;})}</ol>}
      </div>
    </div>
    <footer className="mpp-bar" dir="ltr">
      <div className="mpp-transport">
        <button type="button" onClick={()=>step(-1)} disabled={songs.length<2} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack size={22} fill="currentColor"/></button>
        <button type="button" className="mpp-play" onClick={toggle} disabled={!current} aria-label={playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{playing?<Pause size={30} fill="currentColor"/>:<Play size={30} fill="currentColor"/>}</button>
        <button type="button" onClick={()=>step(1)} disabled={songs.length<2} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={22} fill="currentColor"/></button>
      </div>
      <div className="mpp-progress">
        <div className="mpp-now"><span dir="auto">{current?.title||tr('Choose a recording','اختر تسجيلاً')}</span><span className="mpp-modes">
          <button type="button" aria-pressed={liked} onClick={toggleLike} disabled={!current} aria-label={liked?tr('Remove from favourites','إزالة من المفضلة'):tr('Add to favourites','إضافة إلى المفضلة')}><Heart size={15} fill={liked?'currentColor':'none'}/></button>
          <button type="button" aria-pressed={repeat} onClick={()=>setRepeat(value=>!value)} aria-label={tr('Repeat','تكرار')}><Repeat size={15}/></button>
          <button type="button" aria-pressed={shuffle} onClick={()=>setShuffle(value=>!value)} aria-label={tr('Shuffle','عشوائي')}><Shuffle size={15}/></button></span></div>
        <Time trackId={current?.id}>{pos=>{const progress=duration>0?Math.max(0,Math.min(1,pos/duration)):0;return <>
          <div className="mpp-line"><i style={{width:`${progress*100}%`}}/><b style={{left:`${progress*100}%`}}/><input type="range" min="0" max={duration||1} step=".1" value={Math.min(pos,duration||1)} disabled={!inPlayer||!duration} aria-label={tr('Seek archive recording','تقديم تسجيل الأرشيف')} onChange={event=>archivePlayerCommand('seek',Number(event.target.value))}/></div>
          <div className="mpp-times"><span>{current?.artist||'DJ Khalil'}</span><span>{clock(pos)} · -{clock(Math.max(0,duration-pos))}</span></div></>;}}</Time>
      </div>
      <label className="mpp-volume"><Volume1 size={15}/><input type="range" min="0" max="1" step=".01" value={player.volume??.75} aria-label={tr('Volume','مستوى الصوت')} onChange={event=>archivePlayerCommand('volume',Number(event.target.value))}/><Volume2 size={15}/></label>
    </footer>
  </section>;
}
