import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState,useArchivePlaybackPosition} from '../hooks/useArchivePlayerState';
import OntologyPlayerBrowser from './OntologyPlayerBrowser';
import {fetchOntologyRecordings,recordingTypeLabel} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Heart,Share2,SlidersHorizontal,Disc3,LoaderCircle,Pause,Play,RotateCcw,Search,SkipBack,SkipForward,Square,Volume2,VolumeX} from 'lucide-react';
import EqualizerKnob from '../components/EqualizerKnob';
import {EQUALIZER_BANDS} from '../lib/audioEqualizer';
import {fitViewport} from './fitViewport';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {archivePlayerCommand,publishArchiveMixerState} from '../lib/archivePlayerBridge';
import {archiveResults} from '../lib/archiveSearch';
import {archiveLibrary} from '../lib/archiveLibrary';
import './archiveLibraryColumns.css';
import './homeMusicArchive.css';
import './archiveReadability.css';
import './zoomReflow.css';
import './setupSimulation.css';
import './archiveMixerFlip.css';
import './archiveHeader.css';
import './musicPlayerCard.css';
import './recordingKeycaps.css';
import ArtworkGlow from './ArtworkGlow';

const clock=value=>Number.isFinite(value)&&value>=0?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
const seconds=value=>{const parts=String(value||'').split(':').map(Number);return parts.length>1&&parts.every(Number.isFinite)?parts.reduce((sum,part)=>sum*60+part,0):0;};

function PlaybackPosition({trackId,children}){const position=useArchivePlaybackPosition(trackId);return children(position);}

export default function HomeMusicArchive({lang,embedded=false,workFilter=null,onBack}){
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const [catalog,setCatalog]=useState({collections:[],songs:[]});
  const [ontologyFilters,setOntologyFilters]=useState({}),[ontologyRows,setOntologyRows]=useState(null),[ontologyLoading,setOntologyLoading]=useState(false),[ontologyError,setOntologyError]=useState('');
  const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
  const [query,setQuery]=useState(''),[selectedId,setSelectedId]=useState('');
  const player=useArchivePlayerState();
  const unmutedVolume=useRef(.75);
  const toggleMute=()=>{if(player.volume>0){unmutedVolume.current=player.volume;archivePlayerCommand('volume',0);}else archivePlayerCommand('volume',unmutedVolume.current);};

  const [unpackedId,setUnpackedId]=useState(null);
  const [mixerOpen,setMixerOpen]=useState(false),[mixerFlat,setMixerFlat]=useState(false),[mixerResetting,setMixerResetting]=useState(false);
  useEffect(()=>{publishArchiveMixerState(mixerOpen);return()=>publishArchiveMixerState(false);},[mixerOpen]);
  useEffect(()=>{if(!mixerOpen)return undefined;const timer=setTimeout(()=>setMixerFlat(true),900);return()=>clearTimeout(timer);},[mixerOpen]);
  const toggleMixer=()=>{if(mixerOpen&&mixerFlat){setMixerResetting(true);setMixerFlat(false);requestAnimationFrame(()=>requestAnimationFrame(()=>{setMixerResetting(false);setMixerOpen(false);}));}else{setMixerFlat(false);setMixerOpen(open=>!open);}};
  const gradientId=useId().replace(/:/g,'');
  // Favourites live in this browser; share uses the device share sheet or copies the link.
  const [likes,setLikes]=useState(()=>{try{return JSON.parse(localStorage.getItem('echo-archive-likes')||'[]');}catch{return [];}});
  const toggleLike=track=>{if(!track)return;setLikes(current=>{const next=current.includes(track.id)?current.filter(id=>id!==track.id):[...current,track.id];try{localStorage.setItem('echo-archive-likes',JSON.stringify(next));}catch{/* optional */}return next;});};
  const shareSong=async track=>{if(!track)return;const data={title:track.title,text:`${track.title} · ${track.artist||'DJ Khalil'}`,url:`${window.location.origin}/music`};try{if(navigator.share)await navigator.share(data);else await navigator.clipboard?.writeText(data.url);}catch{/* cancelled */}};
  useEffect(()=>{
    let alive=true;setStatus('loading');
    fetchMusicArchiveCatalog({refresh:retry>0}).then(data=>{if(alive){setCatalog(data);setStatus('ready');}}).catch(()=>{if(alive)setStatus('error');});
    return()=>{alive=false;};
  },[retry]);
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
  const songs=useMemo(()=>archiveResults(library,{query:catalog.ontologyVersion?'':query,sort:'curated'}).songs.filter(song=>song.audioUrl),[library,query,catalog.ontologyVersion]);
  const activeIndex=Math.max(0,songs.findIndex(song=>song.id===selectedId));
  const song=songs[activeIndex],inPlayer=Boolean(song&&player.track?.id===song.id);
  const duration=inPlayer?player.duration:seconds(song?.duration);
  const loading=inPlayer&&(player.preparing||player.buffering),playing=inPlayer&&player.playing;
  // Choosing a DJ work type narrows the archive to that type’s recordings.
  useEffect(()=>{if(!workFilter)return;setOntologyFilters(workFilter.type?{recordingType:workFilter.type}:{});setSelectedId('');setQuery('');},[workFilter]);
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
  const artwork=track=>displayImageUrl(track.coverImage)||'https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
  const backgroundTrack=player.playing&&!player.error?player.track:null;
  // Entrance and outro, in both scroll directions: the card comes in from whichever side it arrives from, and leaves toward
  // the side it exits on. phase is 'in', 'above' (left through the top / will return from the top) or 'below'.
  const playerRef=useRef(null);
  const phase=useViewportPhase(playerRef);
  const sleeves=songs.map((track,index)=>({track,index,offset:(index-activeIndex+songs.length+Math.floor(songs.length/2))%songs.length-Math.floor(songs.length/2)})).filter(item=>Math.abs(item.offset)<=1);
  const emptySides=[-1,1].filter(offset=>!sleeves.some(item=>item.offset===offset));
  const Browser=OntologyPlayerBrowser;
  const Root=embedded?'div':'section';
  const mixerToggle=<button type="button" className="setup-simulation-toggle home-archive-mixer-toggle" aria-pressed={mixerOpen} aria-controls="home-archive-mixer" onClick={toggleMixer}>{mixerOpen?<ArrowLeft size={17}/>:<SlidersHorizontal size={17}/>}<span>{mixerOpen?tr('Back to archive','العودة إلى الأرشيف'):tr('Mixer','المازج')}</span></button>;
  return fitViewport(<Root className="echo-section echo-home-archive" id="home-music-archive" dir={ar?'rtl':'ltr'} aria-labelledby="home-archive-title">
    <ArtworkGlow url={player.track?artwork(player.track):''}/>

    <div ref={playerRef} className={`home-archive-flip${mixerOpen?' is-flipped':''}${mixerFlat?' is-flat':''}${mixerResetting?' is-resetting':''}`}><div className="home-archive-flip-inner">
    <div inert={mixerOpen} aria-hidden={mixerOpen||undefined} className={`home-archive-player home-archive-flip-front${backgroundTrack?' has-playing-artwork':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`} style={backgroundTrack?{'--archive-playing-artwork':`url(${JSON.stringify(artwork(backgroundTrack))})`}:undefined}>
      <header className="home-archive-topbar"><div className="home-archive-section-heading"><div><p id="home-archive-title" className="echo-eyebrow">{embedded?'03':'04'} / {tr('THE MUSIC ARCHIVE','الأرشيف الموسيقي')}{workFilter?.type&&<> · {recordingTypeLabel(workFilter.type)}</>}</p></div>{onBack?<button type="button" className="setup-simulation-toggle home-archive-mixer-toggle home-archive-back-toggle" onClick={onBack}><ArrowLeft size={17}/><span>{tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}</span></button>:mixerToggle}</div><label className="home-archive-search"><Search size={15}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Find a recording','ابحث عن تسجيل')} aria-label={tr('Search music archive','ابحث في الأرشيف الموسيقي')}/></label>{onBack&&mixerToggle}</header>
      <Browser filters={ontologyFilters} onFilters={setOntologyFilters} song={song} onSelect={id=>{setSelectedId(id);}} player={player} loading={ontologyLoading} error={ontologyError} library={{...library,songs}} artwork={artwork} ar={ar}>
      <div className="home-archive-center">
      <div className="mp-wrap">
        <PlaybackPosition trackId={song?.id}>{position=>{const progress=duration>0?Math.max(0,Math.min(1,position/duration)):0,left=Math.max(0,duration-position),liked=Boolean(song&&likes.includes(song.id));return <article className="mp-card" aria-label={song?.title||tr('Music player','مشغل الموسيقى')}>
          <div className="mp-frame">
            {song?<img className="mp-art" src={artwork(song)} alt=""/>:<div className="mp-empty" role="status"><strong>{status==='loading'?tr('Loading recordings…','جارٍ تحميل التسجيلات…'):status==='error'?tr('The archive could not load.','تعذر تحميل الأرشيف.'):query?tr('No matching recordings.','لا توجد تسجيلات مطابقة.'):tr('Your recordings start here.','تبدأ تسجيلاتك من هنا.')}</strong><span>{status==='ready'&&!query?tr('New recordings appear here when published.','ستظهر التسجيلات الجديدة هنا عند نشرها.'):tr('Explore the sound of DJ Khalil.','استكشف موسيقى دي جي خليل.')}</span>{status==='error'&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Try again','حاول مجدداً')}</button>}</div>}
            <header className="mp-top">
              <div className="mp-who">{song&&<img className="mp-avatar" src={artwork(song)} alt=""/>}<span><strong>{song?.title||tr('Your next soundtrack.','موسيقى لحظتك القادمة.')}</strong><small>{song?.artist||'DJ Khalil'}</small></span></div>
              <button type="button" className="mp-round" disabled={!song} onClick={()=>shareSong(song)} aria-label={tr('Share this recording','مشاركة التسجيل')}><Share2/></button>
              <button type="button" className="mp-round" disabled={!song} aria-pressed={liked} onClick={()=>toggleLike(song)} aria-label={liked?tr('Remove from favourites','إزالة من المفضلة'):tr('Add to favourites','إضافة إلى المفضلة')}><Heart/></button>
            </header>
            <footer className="mp-bottom" dir="ltr">
              <div className="mp-times"><span>{clock(position)}</span><span>-{clock(left)}</span></div>
              <div className="mp-bar"><i style={{width:`${progress*100}%`}}/><input type="range" aria-label={tr('Seek archive recording','تقديم تسجيل الأرشيف')} min="0" max={duration||1} step=".1" value={Math.min(position,duration||1)} disabled={!inPlayer||!duration} onChange={event=>archivePlayerCommand('seek',Number(event.target.value))}/></div>
              <div className="mp-controls" role="group" aria-label={tr('Playback controls','عناصر التحكم بالتشغيل')}>
                <button type="button" className="mp-round" disabled={songs.length<2} onClick={()=>select(activeIndex-1)} aria-label={tr('Previous recording','التسجيل السابق')}><SkipBack fill="currentColor"/></button>
                <button type="button" className="mp-round" onClick={toggle} disabled={!song} aria-label={loading?tr('Cancel loading','إلغاء التحميل'):playing?tr('Pause recording','إيقاف التسجيل مؤقتاً'):tr('Play recording','تشغيل التسجيل')}>{loading?<LoaderCircle/>:playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button>
                <button type="button" className="mp-round" disabled={songs.length<2} onClick={()=>select(activeIndex+1)} aria-label={tr('Next recording','التسجيل التالي')}><SkipForward fill="currentColor"/></button>
              </div>
            </footer>
          </div>
        </article>;}}</PlaybackPosition>
      </div>
      {inPlayer&&player.error&&<p className="home-archive-error" role="alert">{player.error}</p>}
      </div>
      </Browser>
    </div>
    <section id="home-archive-mixer" className="home-archive-flip-back" inert={!mixerOpen} aria-hidden={!mixerOpen||undefined} aria-label={tr('Music Archive mixer','مازج الأرشيف الموسيقي')}>
      {onBack&&<div className="home-archive-mixer-bar">{mixerToggle}</div>}
      <div id="home-archive-channels" className="home-archive-controller"/>

      <footer className="home-archive-mixer-footer"><span>{song?.artist||'DJ Khalil'}</span><span id="home-archive-mixer-status" className="home-archive-mixer-status"/><label className="home-archive-volume">{player.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}<input type="range" min="0" max="1" step=".01" value={player.volume} aria-label={tr('Mixer volume','مستوى صوت المازج')} onChange={event=>archivePlayerCommand('volume',Number(event.target.value))}/></label></footer>
      {inPlayer&&player.error&&<p role="alert">{player.error}</p>}
    </section>
    </div></div>
  </Root>,{natural:true});
}
