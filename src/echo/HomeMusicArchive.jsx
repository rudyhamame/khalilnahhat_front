import {useViewportPhase} from './useViewportPhase';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Disc3,LoaderCircle,Pause,Play,RotateCcw,Search,SkipBack,SkipForward,Square,Volume2,VolumeX} from 'lucide-react';
import EqualizerKnob from '../components/EqualizerKnob';
import {EQUALIZER_BANDS} from '../lib/audioEqualizer';
import {fitViewport} from './fitViewport';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {ARCHIVE_PLAYER_STATE,archivePlayerCommand,readArchivePlayerState} from '../lib/archivePlayerBridge';
import {archiveResults} from '../lib/archiveSearch';
import {archiveLibrary} from '../lib/archiveLibrary';
import ArchiveLibraryColumns from './ArchiveLibraryColumns';
import './homeMusicArchive.css';
import './archiveReadability.css';

const clock=value=>Number.isFinite(value)&&value>=0?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
const seconds=value=>{const parts=String(value||'').split(':').map(Number);return parts.length>1&&parts.every(Number.isFinite)?parts.reduce((sum,part)=>sum*60+part,0):0;};

export default function HomeMusicArchive({lang}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const [catalog,setCatalog]=useState({categories:[],albums:[],songs:[]});
  const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[selectedId,setSelectedId]=useState('');
  const [albumId,setAlbumId]=useState('');
  const [player,setPlayer]=useState(readArchivePlayerState);
  const [unpackedId,setUnpackedId]=useState(null);
  const gradientId=useId().replace(/:/g,'');
  useEffect(()=>{
    let alive=true;setStatus('loading');
    fetchMusicArchiveCatalog({refresh:retry>0}).then(data=>{if(alive){setCatalog(data);setStatus('ready');}}).catch(()=>{if(alive)setStatus('error');});
    return()=>{alive=false;};
  },[retry]);
  useEffect(()=>{
    const update=event=>setPlayer(event.detail);
    window.addEventListener(ARCHIVE_PLAYER_STATE,update);
    setPlayer(readArchivePlayerState());
    return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,update);
  },[]);
  useEffect(()=>{
    if(player.track?.id&&(player.playing||player.preparing))setSelectedId(player.track.id);
  },[player.track?.id,player.playing,player.preparing]);
  useEffect(()=>{
    if(player.track?.id&&(player.playing||player.preparing))setUnpackedId(player.track.id);
  },[player.track?.id,player.playing,player.preparing]);
  useEffect(()=>{
    const restored=()=>setUnpackedId(null);
    window.addEventListener('echo:archive-restored',restored);
    return()=>window.removeEventListener('echo:archive-restored',restored);
  },[]);
  const library=useMemo(()=>archiveLibrary(catalog),[catalog]);
  const songs=useMemo(()=>archiveResults(library,{query,category,albumId,sort:'curated'}).songs.filter(song=>song.audioUrl),[library,query,category,albumId]);
  const activeIndex=Math.max(0,songs.findIndex(song=>song.id===selectedId));
  const song=songs[activeIndex],inPlayer=Boolean(song&&player.track?.id===song.id);
  const duration=inPlayer?player.duration:seconds(song?.duration),position=inPlayer?player.position:0;
  const progress=duration>0?Math.max(0,Math.min(1,position/duration)):0;
  const loading=inPlayer&&(player.preparing||player.buffering),playing=inPlayer&&player.playing;
  const album=library.albums.find(item=>item.id===song?.albumId&&!item.isLoose);
  const chooseCategory=id=>{setCategory(id);setAlbumId('');setSelectedId('');setQuery('');};
  const chooseAlbum=id=>{setAlbumId(id);setSelectedId('');setQuery('');};
  const start=track=>{
    if(!track)return;
    setUnpackedId(track.id);
    window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:songs.map(item=>item.id),inline:true}}));
  };
  const select=index=>{
    if(!songs.length)return;
    const track=songs[(index+songs.length)%songs.length];setSelectedId(track.id);
    if(player.playing||player.preparing)start(track);
  };
  const toggle=()=>{
    if(!song)return;
    setUnpackedId(song.id);
    const sameQueue=songs.length===player.tracks.length&&songs.every((item,index)=>player.tracks[index]?.id===item.id);
    if(inPlayer&&sameQueue)archivePlayerCommand('toggle');else start(song);
  };
  const stop=()=>{archivePlayerCommand('stop');setUnpackedId(null);};
  const artwork=track=>track.coverImage||catalog.albums.find(item=>item.id===track.albumId)?.coverImage||'https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
  const backgroundTrack=player.playing&&!player.error?player.track:null;
  // Entrance and outro, in both scroll directions: the card comes in from whichever side it arrives from, and leaves toward
  // the side it exits on. phase is 'in', 'above' (left through the top / will return from the top) or 'below'.
  const playerRef=useRef(null);
  const phase=useViewportPhase(playerRef);
  const sleeves=songs.map((track,index)=>({track,index,offset:(index-activeIndex+songs.length+Math.floor(songs.length/2))%songs.length-Math.floor(songs.length/2)})).filter(item=>Math.abs(item.offset)<=1);
  const emptySides=[-1,1].filter(offset=>!sleeves.some(item=>item.offset===offset));
  return fitViewport(<section className="echo-section echo-home-archive" id="home-music-archive" dir={ar?'rtl':'ltr'} aria-labelledby="home-archive-title">
    <header className="home-archive-section-heading"><div><p id="home-archive-title" className="echo-eyebrow">02 / {tr('THE MUSIC ARCHIVE','الأرشيف الموسيقي')}</p></div></header>
    <div ref={playerRef} className={`home-archive-player${backgroundTrack?' has-playing-artwork':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`} style={backgroundTrack?{'--archive-playing-artwork':`url(${JSON.stringify(artwork(backgroundTrack))})`}:undefined}>
      <header className="home-archive-topbar"><span><i/>{tr('DJ KHALIL / SELECTED SOUNDS','دي جي خليل / اختيارات موسيقية')}</span><label className="home-archive-search"><Search size={15}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Find a recording','ابحث عن تسجيل')} aria-label={tr('Search music archive','ابحث في الأرشيف الموسيقي')}/></label></header>
      <ArchiveLibraryColumns library={library} category={category} albumId={albumId} onCategory={chooseCategory} onAlbum={chooseAlbum} artwork={artwork} ar={ar}>
      <div className="home-archive-center">
      <div className="home-archive-stage">
        <div className="home-archive-coverflow" role="group" aria-label={tr('Browse archive recordings','تصفح تسجيلات الأرشيف')} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(activeIndex+(event.key==='ArrowRight'?1:-1));}}}>
          <div className="home-archive-ground" aria-hidden="true"/>
          {song&&emptySides.map(offset=><span key={`empty-${offset}`} className="home-archive-sleeve is-empty" style={{'--sleeve-offset':offset,'--sleeve-depth':1}} aria-hidden="true"><span><Disc3 size={72} strokeWidth={.6}/></span></span>)}
          {sleeves.map(({track,index,offset})=><button type="button" key={track.id} className={`home-archive-sleeve${offset===0?' is-current':''}${offset===0&&unpackedId===track.id&&!(inPlayer&&player.error)?' is-unpacked':''}${offset===0&&playing&&!loading?' is-spinning':''}`} style={{'--sleeve-offset':offset,'--sleeve-depth':Math.abs(offset),zIndex:10-Math.abs(offset)}} aria-pressed={offset===0} aria-label={`${tr('Select','اختر')} ${track.title}`} onClick={()=>select(index)}>
            <span className="home-archive-record" aria-hidden="true"><span className="home-archive-vinyl"><span className="home-archive-vinyl-label"><img src={artwork(track)} alt="" loading="lazy"/><span>DJ KHALIL</span></span><i className="home-archive-spindle"/></span></span>
            <span className="home-archive-sleeve-front"><img src={artwork(track)} alt="" loading="lazy"/>
              {!track.coverImage&&!catalog.albums.find(item=>item.id===track.albumId)?.coverImage&&<span className="home-archive-cover-label"><small>DJ KHALIL</small><strong>{track.title}</strong></span>}
            </span>
          </button>)}
          {!song&&<div className="home-archive-empty" role="status"><Disc3 size={68} strokeWidth={.7}/><h3>{status==='loading'?tr('Loading the collection…','جارٍ تحميل المجموعة…'):status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):query||category?tr('No matching recordings.','لا توجد تسجيلات مطابقة.'):tr('The collection starts here.','تبدأ المجموعة من هنا.')}</h3><p>{status==='ready'&&!query&&!category?tr('New recordings appear here when published.','ستظهر التسجيلات الجديدة هنا عند نشرها.'):tr('Explore the sound of DJ Khalil.','استكشف موسيقى دي جي خليل.')}</p>{status==='error'&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Try again','حاول مجدداً')}</button>}</div>}
        </div>
        <div className="home-archive-progress" dir="ltr">
          <svg viewBox="0 0 800 110" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId}><stop stopColor="#6d61c5"/><stop offset=".5" stopColor="#58cbd5"/><stop offset="1" stopColor="#8dd6b5"/></linearGradient></defs><path className="home-archive-arc-track" d="M40 30 Q400 110 760 30"/><path className="home-archive-arc-value" d="M40 30 Q400 110 760 30" pathLength="1" stroke={`url(#${gradientId})`} strokeDasharray="1" strokeDashoffset={1-progress}/><circle cx={40+720*progress} cy={30+160*progress*(1-progress)} r="5"/></svg>
          <div className="home-archive-time-labels"><span>{clock(position)}</span><span>{clock(duration)}</span></div>
          <input type="range" aria-label={tr('Seek archive recording','تقديم تسجيل الأرشيف')} min="0" max={duration||1} step=".1" value={Math.min(position,duration||1)} disabled={!inPlayer||!duration} onChange={event=>archivePlayerCommand('seek',Number(event.target.value))}/>
        </div>
      </div>
      <div className="home-archive-now" aria-live="polite" aria-atomic="true"><h3>{song?.title||tr('Your next soundtrack.','موسيقى لحظتك القادمة.')}</h3><p>{song?.artist||'DJ Khalil'}{album?` · ${album.title}`:''}</p></div>
      <div className="home-archive-transport" dir="ltr"><button type="button" disabled={songs.length<2} onClick={()=>select(activeIndex-1)} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack size={21} fill="currentColor"/></button><button type="button" className="home-archive-play" onClick={toggle} disabled={!song} aria-label={loading?tr('Cancel loading','إلغاء التحميل'):playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{loading?<LoaderCircle size={24}/>:playing?<Pause size={23} fill="currentColor"/>:<Play size={23} fill="currentColor"/>}</button><button type="button" className="home-archive-stop" onClick={stop} disabled={!song} aria-label={tr('Stop recording and return sleeve','إيقاف التسجيل وإعادة الغلاف')} title={tr('Stop and return sleeve','إيقاف وإعادة الغلاف')}><Square size={19} fill="currentColor"/></button><button type="button" disabled={songs.length<2} onClick={()=>select(activeIndex+1)} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={21} fill="currentColor"/></button></div>
      <div className="home-archive-audio-controls">
      <section className="home-archive-equalizer" aria-label={tr('Music Archive equalizer','معادل صوت الأرشيف الموسيقي')}>
        <span className="home-archive-equalizer-title">{tr('Equalizer','معادل الصوت')}</span>
        <div className="home-archive-equalizer-bands" dir="ltr">{EQUALIZER_BANDS.map(band=><EqualizerKnob key={band.key} label={band.label} frequency={band.caption} value={player.equalizer?.[band.key]??0} onChange={gain=>archivePlayerCommand('equalizer',{band:band.key,gain})}/>)}</div>
        <button type="button" className="home-archive-equalizer-reset" aria-label={tr('Reset archive equalizer','إعادة ضبط معادل صوت الأرشيف')} title={tr('Reset equalizer','إعادة ضبط معادل الصوت')} onClick={()=>archivePlayerCommand('equalizer-reset')}><RotateCcw size={16}/></button>
      </section>
      <div id="home-archive-channels"/>
      </div>
      <footer className="home-archive-bottom"><div className="home-archive-filters"><span>{library.categories.find(item=>item.id===category)?.title||tr('All recordings','كل التسجيلات')}</span><span>{songs.length} {tr(songs.length===1?'recording':'recordings','تسجيل')}</span></div><label className="home-archive-volume">{player.volume===0?<VolumeX size={16}/>:<Volume2 size={16}/>}<input type="range" min="0" max="1" step=".01" value={player.volume} aria-label={tr('Archive volume','مستوى صوت الأرشيف')} onChange={event=>archivePlayerCommand('volume',Number(event.target.value))}/></label></footer>
      {inPlayer&&player.error&&<p className="home-archive-error" role="alert">{player.error}</p>}
      </div>
      </ArchiveLibraryColumns>
    </div>
  </section>);
}
