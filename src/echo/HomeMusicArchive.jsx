import OntologyPlayerBrowser from './OntologyPlayerBrowser';
import SyncedLyrics from './SyncedLyrics';
import LyricsStage from './LyricsStage';
import {fetchOntologyRecordings} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Captions,Type,SlidersHorizontal,Disc3,LoaderCircle,Pause,Play,RotateCcw,Search,SkipBack,SkipForward,Square,Volume2,VolumeX} from 'lucide-react';
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
import './zoomReflow.css';
import './setupSimulation.css';
import './archiveMixerFlip.css';

const clock=value=>Number.isFinite(value)&&value>=0?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
const seconds=value=>{const parts=String(value||'').split(':').map(Number);return parts.length>1&&parts.every(Number.isFinite)?parts.reduce((sum,part)=>sum*60+part,0):0;};

export default function HomeMusicArchive({lang}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const [catalog,setCatalog]=useState({collections:[],songs:[]});
  const [ontologyFilters,setOntologyFilters]=useState({}),[ontologyRows,setOntologyRows]=useState(null),[ontologyLoading,setOntologyLoading]=useState(false),[ontologyError,setOntologyError]=useState('');
  const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
  const [query,setQuery]=useState(''),[collectionId,setCollectionId]=useState(''),[selectedId,setSelectedId]=useState('');
  const [player,setPlayer]=useState(readArchivePlayerState);
  const unmutedVolume=useRef(.75);
  const toggleMute=()=>{if(player.volume>0){unmutedVolume.current=player.volume;archivePlayerCommand('volume',0);}else archivePlayerCommand('volume',unmutedVolume.current);};

  const [unpackedId,setUnpackedId]=useState(null);
  const [mixerOpen,setMixerOpen]=useState(false),[mixerFlat,setMixerFlat]=useState(false),[mixerResetting,setMixerResetting]=useState(false);
  useEffect(()=>{if(!mixerOpen)return undefined;const timer=setTimeout(()=>setMixerFlat(true),900);return()=>clearTimeout(timer);},[mixerOpen]);
  const toggleMixer=()=>{if(mixerOpen&&mixerFlat){setMixerResetting(true);setMixerFlat(false);requestAnimationFrame(()=>requestAnimationFrame(()=>{setMixerResetting(false);setMixerOpen(false);}));}else{setMixerFlat(false);setMixerOpen(open=>!open);}};
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
  useEffect(()=>{
    const refresh=()=>setRetry(value=>value+1);
    window.addEventListener('echo:music-archive-changed',refresh);window.addEventListener('focus',refresh);
    const timer=setInterval(refresh,30000);
    return()=>{window.removeEventListener('echo:music-archive-changed',refresh);window.removeEventListener('focus',refresh);clearInterval(timer);};
  },[]);
  useEffect(()=>{
    if(!catalog.ontologyVersion)return undefined;
    const controller=new AbortController();
    const timer=setTimeout(()=>{setOntologyLoading(true);fetchOntologyRecordings({...ontologyFilters,q:query},{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted){setOntologyRows(rows);setOntologyError('');}}).catch(e=>{if(!controller.signal.aborted)setOntologyError(e.message);}).finally(()=>{if(!controller.signal.aborted)setOntologyLoading(false);});},180);
    return()=>{clearTimeout(timer);controller.abort();};
  },[catalog,ontologyFilters,query]);
  const library=useMemo(()=>archiveLibrary({...catalog,songs:catalog.ontologyVersion&&ontologyRows?ontologyRows:catalog.songs}),[catalog,ontologyRows]);
  const songs=useMemo(()=>archiveResults(library,{query:catalog.ontologyVersion?'':query,collectionId,sort:'curated'}).songs.filter(song=>song.audioUrl),[library,query,collectionId,catalog.ontologyVersion]);
  const activeIndex=Math.max(0,songs.findIndex(song=>song.id===selectedId));
  const song=songs[activeIndex],inPlayer=Boolean(song&&player.track?.id===song.id);
  const duration=inPlayer?player.duration:seconds(song?.duration),position=inPlayer?player.position:0;
  const progress=duration>0?Math.max(0,Math.min(1,position/duration)):0;
  const loading=inPlayer&&(player.preparing||player.buffering),playing=inPlayer&&player.playing;
  const collection=library.collections.find(item=>item.id===collectionId);
  const chooseCollection=id=>{setCollectionId(id);setSelectedId('');setQuery('');};
  const start=track=>{
    if(!track)return;
    setUnpackedId(track.id);
    window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:songs.map(item=>item.id),inline:true}}));
  };
  const select=index=>{
    if(!songs.length)return;
    const track=songs[(index+songs.length)%songs.length];setSelectedId(track.id);
    if(!catalog.ontologyVersion&&(player.playing||player.preparing))start(track);
  };
  const toggle=()=>{
    if(!song)return;
    setUnpackedId(song.id);
    const sameQueue=songs.length===player.tracks.length&&songs.every((item,index)=>player.tracks[index]?.id===item.id);
    if(inPlayer&&sameQueue)archivePlayerCommand('toggle');else start(song);
  };
  const stop=()=>{archivePlayerCommand('stop');setUnpackedId(null);};
  const artwork=track=>track.coverImage||'https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
  const backgroundTrack=player.playing&&!player.error?player.track:null;
  // Entrance and outro, in both scroll directions: the card comes in from whichever side it arrives from, and leaves toward
  // the side it exits on. phase is 'in', 'above' (left through the top / will return from the top) or 'below'.
  const [lyricMode,setLyricMode]=useState(()=>{try{const saved=localStorage.getItem('echo.lyricsMode');return saved==='line'||saved==='off'?saved:'stage';}catch{return 'stage';}});
  // Clicking the active system turns the lyrics off; clicking it again (or the other one) turns them back on.
  const chooseLyricMode=mode=>{const next=mode===lyricMode?'off':mode;setLyricMode(next);try{localStorage.setItem('echo.lyricsMode',next);}catch{/* preference just isn't remembered */}};
  const hasLyrics=Boolean(song?.lyricsTiming?.lines?.length);
  const playerRef=useRef(null);
  const phase=useViewportPhase(playerRef);
  const sleeves=songs.map((track,index)=>({track,index,offset:(index-activeIndex+songs.length+Math.floor(songs.length/2))%songs.length-Math.floor(songs.length/2)})).filter(item=>Math.abs(item.offset)<=1);
  const emptySides=[-1,1].filter(offset=>!sleeves.some(item=>item.offset===offset));
  const Browser=catalog.ontologyVersion?OntologyPlayerBrowser:ArchiveLibraryColumns;
  return fitViewport(<section className="echo-section echo-home-archive" id="home-music-archive" dir={ar?'rtl':'ltr'} aria-labelledby="home-archive-title">
    <header className="home-archive-section-heading"><div><p id="home-archive-title" className="echo-eyebrow">04 / {tr('THE MUSIC ARCHIVE','الأرشيف الموسيقي')}</p></div><button type="button" className="setup-simulation-toggle home-archive-mixer-toggle" aria-pressed={mixerOpen} aria-controls="home-archive-mixer" onClick={toggleMixer}>{mixerOpen?<ArrowLeft size={17}/>:<SlidersHorizontal size={17}/>}<span>{mixerOpen?tr('Back to archive','العودة إلى الأرشيف'):tr('Mixer','المازج')}</span></button></header>
    <div ref={playerRef} className={`home-archive-flip${mixerOpen?' is-flipped':''}${mixerFlat?' is-flat':''}${mixerResetting?' is-resetting':''}`}><div className="home-archive-flip-inner">
    <div inert={mixerOpen} aria-hidden={mixerOpen||undefined} className={`home-archive-player home-archive-flip-front${backgroundTrack?' has-playing-artwork':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`} style={backgroundTrack?{'--archive-playing-artwork':`url(${JSON.stringify(artwork(backgroundTrack))})`}:undefined}>
      {lyricMode==='stage'&&hasLyrics&&<LyricsStage timing={song.lyricsTiming} position={position} active={inPlayer}/>}
      <header className="home-archive-topbar"><span><i/>{tr('DJ KHALIL / SELECTED SOUNDS','دي جي خليل / اختيارات موسيقية')}</span><label className="home-archive-search"><Search size={15}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Find a recording','ابحث عن تسجيل')} aria-label={tr('Search music archive','ابحث في الأرشيف الموسيقي')}/></label></header>
      <Browser filters={ontologyFilters} onFilters={setOntologyFilters} song={song} onSelect={id=>{setSelectedId(id);}} player={player} loading={ontologyLoading} error={ontologyError} library={library} collectionId={collectionId} onCollection={chooseCollection} artwork={artwork} ar={ar}>
      <div className="home-archive-center">
      <div className="home-archive-stage">
        <div className="home-archive-coverflow" role="group" aria-label={tr('Browse archive recordings','تصفح تسجيلات الأرشيف')} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(activeIndex+(event.key==='ArrowRight'?1:-1));}}}>
          <div className="home-archive-ground" aria-hidden="true"/>
          {song&&emptySides.map(offset=><span key={`empty-${offset}`} className="home-archive-sleeve is-empty" style={{'--sleeve-offset':offset,'--sleeve-depth':1}} aria-hidden="true"><span><Disc3 size={72} strokeWidth={.6}/></span></span>)}
          {sleeves.map(({track,index,offset})=><button type="button" key={track.id} className={`home-archive-sleeve${offset===0?' is-current':''}${offset===0&&unpackedId===track.id&&!(inPlayer&&player.error)?' is-unpacked':''}${offset===0&&playing&&!loading?' is-spinning':''}`} style={{'--sleeve-offset':offset,'--sleeve-depth':Math.abs(offset),zIndex:10-Math.abs(offset)}} aria-pressed={offset===0} aria-label={`${tr('Select','اختر')} ${track.title}`} onClick={()=>select(index)}>
            <span className="home-archive-record" aria-hidden="true"><span className="home-archive-vinyl"><span className="home-archive-vinyl-label"><img src={artwork(track)} alt="" loading="lazy"/><span>DJ KHALIL</span></span><i className="home-archive-spindle"/></span></span>
            <span className="home-archive-sleeve-front"><img src={artwork(track)} alt="" loading="lazy"/>
              {!track.coverImage&&<span className="home-archive-cover-label"><small>DJ KHALIL</small><strong>{track.title}</strong></span>}
            </span>
          </button>)}
          {!song&&<div className="home-archive-empty" role="status"><Disc3 size={68} strokeWidth={.7}/><h3>{status==='loading'?tr('Loading the collection…','جارٍ تحميل المجموعة…'):status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):query||collectionId?tr('No matching recordings.','لا توجد تسجيلات مطابقة.'):tr('The collection starts here.','تبدأ المجموعة من هنا.')}</h3><p>{status==='ready'&&!query&&!collectionId?tr('New recordings appear here when published.','ستظهر التسجيلات الجديدة هنا عند نشرها.'):tr('Explore the sound of DJ Khalil.','استكشف موسيقى دي جي خليل.')}</p>{status==='error'&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Try again','حاول مجدداً')}</button>}</div>}
        </div>
        <div className="home-archive-progress" dir="ltr">
          <svg viewBox="0 0 800 110" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={gradientId}><stop stopColor="#6d61c5"/><stop offset=".5" stopColor="#58cbd5"/><stop offset="1" stopColor="#8dd6b5"/></linearGradient></defs><path className="home-archive-arc-track" d="M40 30 Q400 110 760 30"/><path className="home-archive-arc-value" d="M40 30 Q400 110 760 30" pathLength="1" stroke={`url(#${gradientId})`} strokeDasharray="1" strokeDashoffset={1-progress}/><circle cx={40+720*progress} cy={30+160*progress*(1-progress)} r="5"/></svg>
          <div className="home-archive-time-labels"><span>{clock(position)}</span><span>{clock(duration)}</span></div>
          <input type="range" aria-label={tr('Seek archive recording','تقديم تسجيل الأرشيف')} min="0" max={duration||1} step=".1" value={Math.min(position,duration||1)} disabled={!inPlayer||!duration} onChange={event=>archivePlayerCommand('seek',Number(event.target.value))}/>
        </div>
      </div>
      <div className="home-archive-now" aria-live="polite" aria-atomic="true"><h3>{song?.title||tr('Your next soundtrack.','موسيقى لحظتك القادمة.')}</h3><p>{song?.artist||'DJ Khalil'}{collection?` · ${collection.title}`:''}</p><SyncedLyrics timing={song?.lyricsTiming} position={position} active={inPlayer} ar={ar} mode={lyricMode}/></div>
      <div className="home-archive-transport" dir="ltr" role="group" aria-label={tr('Playback controls','عناصر التحكم بالتشغيل')}><div className="home-archive-transport-buttons"><button type="button" disabled={songs.length<2} onClick={()=>select(activeIndex-1)} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack size={21} fill="currentColor"/></button><button type="button" className="home-archive-play" onClick={toggle} disabled={!song} aria-label={loading?tr('Cancel loading','إلغاء التحميل'):playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{loading?<LoaderCircle size={24}/>:playing?<Pause size={23} fill="currentColor"/>:<Play size={23} fill="currentColor"/>}</button><button type="button" className="home-archive-stop" onClick={stop} disabled={!song} aria-label={tr('Stop recording and return sleeve','إيقاف التسجيل وإعادة الغلاف')} title={tr('Stop and return sleeve','إيقاف وإعادة الغلاف')}><Square size={19} fill="currentColor"/></button><button type="button" disabled={songs.length<2} onClick={()=>select(activeIndex+1)} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward size={21} fill="currentColor"/></button>{hasLyrics&&<div className="home-archive-lyric-mode" role="group" aria-label={tr('Lyrics style','نمط الكلمات')}><button type="button" aria-pressed={lyricMode==='stage'} title={tr('Big lyrics across the player','كلمات كبيرة عبر المشغل')} aria-label={tr('Big lyrics across the player','كلمات كبيرة عبر المشغل')} onClick={()=>chooseLyricMode('stage')}><Type size={15}/></button><button type="button" aria-pressed={lyricMode==='line'} title={tr('One caption line','سطر واحد')} aria-label={tr('One caption line','سطر واحد')} onClick={()=>chooseLyricMode('line')}><Captions size={15}/></button></div>}</div><div className="home-archive-volume home-archive-toolbar-volume" role="group" aria-label={tr('Volume','مستوى الصوت')}><button type="button" onClick={toggleMute} aria-label={player.volume===0?tr('Unmute','إلغاء كتم الصوت'):tr('Mute','كتم الصوت')} title={player.volume===0?tr('Unmute','إلغاء كتم الصوت'):tr('Mute','كتم الصوت')}>{player.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><input type="range" min="0" max="1" step=".01" value={player.volume} style={{'--volume-fill':Math.round(player.volume*100)+'%'}} aria-label={tr('Archive volume','مستوى صوت الأرشيف')} aria-valuetext={Math.round(player.volume*100)+'%'} onChange={event=>archivePlayerCommand('volume',Number(event.target.value))}/><output aria-hidden="true">{Math.round(player.volume*100)}<small>%</small></output></div></div>

      {inPlayer&&player.error&&<p className="home-archive-error" role="alert">{player.error}</p>}
      </div>
      </Browser>
    </div>
    <section id="home-archive-mixer" className="home-archive-flip-back" inert={!mixerOpen} aria-hidden={!mixerOpen||undefined} aria-label={tr('Music Archive mixer','مازج الأرشيف الموسيقي')}>
      <div id="home-archive-channels" className="home-archive-controller"/>

      <footer className="home-archive-mixer-footer"><span>{song?.artist||'DJ Khalil'}</span><span id="home-archive-mixer-status" className="home-archive-mixer-status"/><label className="home-archive-volume">{player.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}<input type="range" min="0" max="1" step=".01" value={player.volume} aria-label={tr('Mixer volume','مستوى صوت المازج')} onChange={event=>archivePlayerCommand('volume',Number(event.target.value))}/></label></footer>
      {inPlayer&&player.error&&<p role="alert">{player.error}</p>}
    </section>
    </div></div>
  </section>);
}
