import {NEXT_LIVE_DATE} from '../config/features';
import {useViewportPhase} from './useViewportPhase';
import {fitViewport} from './fitViewport';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AudioLines,Disc3,Maximize2,Radio,Volume2,VolumeX} from 'lucide-react';
import {useLiveStatus,liveSessionIdentity} from '../hooks/useLiveStatus';
import LiveSignInPrompt from './LiveSignInPrompt';
import WebrtcViewer from '../components/WebrtcViewer';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import LiveSongRequest from './LiveSongRequest';
import LiveComments from './LiveComments';
import './live.css';
import './homeLiveConsole.css';
import './livePanelLayout.css';

export default function HomeLiveConsole({lang,user,token,liveStream,liveSessions=[],isSessionReady}) {
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  useLayoutEffect(()=>{
    document.documentElement.classList.add('echo-live-page-open');
    return()=>document.documentElement.classList.remove('echo-live-page-open');
  },[]);
  // "Next live" comes from VITE_NEXT_LIVE_DATE; a past or unreadable date shows nothing.
  const nextLiveLabel=(()=>{const when=new Date(NEXT_LIVE_DATE);if(!NEXT_LIVE_DATE||Number.isNaN(+when)||when<new Date())return '';return when.toLocaleString(ar?'ar-CA':'en-CA',{weekday:'long',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZone:'America/Toronto'});})();
  const section=useRef(null),preview=useRef(null);
  const [active,setActive]=useState(false),[error,setError]=useState('');
  const [muted,setMuted]=useState(true);
  const toggleSound=()=>setMuted(value=>!value);
  const {item:stream}=useLiveStatus({token,initial:liveStream,enabled:active});
  const signedIn=Boolean(user&&token);
  useEffect(()=>{
    if(!('IntersectionObserver' in window)){setActive(true);return undefined;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'200px'});
    observer.observe(section.current);return()=>observer.disconnect();
  },[]);
  const live=Boolean(stream?.isLive),webRtc=['webrtc','whep'].includes(stream?.broadcastMode);
  const planned=(signedIn&&isSessionReady?liveSessions:[]).filter(song=>song.playState!=='played').slice().sort((a,b)=>Number(b.playState==='live')-Number(a.playState==='live')||Number(a.sortOrder||0)-Number(b.sortOrder||0));
  const fullscreen=async()=>{try{await preview.current?.requestFullscreen?.();}catch{setError(tr('Fullscreen is unavailable in this browser.','ملء الشاشة غير متاح في هذا المتصفح.'));}};
  const sessionIdentity=liveSessionIdentity(stream);
  // Power-on entrance and outro in both scroll directions: 'in', or 'above'/'below' = the edge it last left through.
  // The section is observed (not the console), because the console is clipped to a thin line while it is away.
  const phase=useViewportPhase(section);
  return fitViewport(<section className="echo-home-live echo-section" id="live" ref={section} dir={ar?'rtl':'ltr'} aria-label={tr('Live','البث المباشر')}>
    <div className="home-live-layout">
    <div className={`home-live-console home-live-switcher home-live-columns has-comments${phase==='in'?' is-in':` is-away is-away-${phase}`}`}>

      <div className="home-live-grid">
        <aside className="home-live-catalog home-live-card" id="home-live-catalog" aria-labelledby="home-live-catalog-title"><header><span><Disc3 size={16}/><h3 id="home-live-catalog-title">{tr('The set list','قائمة الأغاني')}</h3></span><small>{String(planned.length).padStart(2,'0')}</small></header><p className="home-live-subtitle">{tr('Planned for this live','مخطط لها في هذا البث')}</p><ol>{planned.map((song,index)=><li key={song.id} className={song.playState==='live'?'is-current':''}><span className="home-live-song-art">{song.coverImage?<img src={song.coverImage} alt="" loading="lazy"/>:<Disc3 size={20}/>}</span><div><strong>{song.track}</strong><small>{song.artist||song.genre||'DJ Khalil'}</small></div><span className="home-live-song-number">{song.playState==='live'?<AudioLines size={14}/>:String(index+1).padStart(2,'0')}<small>{song.duration}</small></span></li>)}</ol>{!planned.length&&<div className="home-live-empty"><Disc3 size={28}/><p>{isSessionReady?tr('Khalil’s next set list will appear here.','ستظهر قائمة البث القادم هنا.'):tr('Loading the set list…','جارٍ تحميل القائمة…')}</p></div>}<footer><Radio size={14}/><span>{tr('Selected by Khalil. Shaped by you.','يختارها خليل. ويكملها ذوقك.')}</span></footer></aside>
        <div className="home-live-broadcast">
        <div className="home-live-preview" id="home-live-preview" role="region" aria-label={tr('Live preview','معاينة البث')} ref={preview}>
          {active&&live&&signedIn?(webRtc?<WebrtcViewer token={token} sessionIdentity={sessionIdentity} key={sessionIdentity} lang={lang.lang} muted={muted} volume={.75}/>:stream?.streamUrl?<LiveStreamPlayer key={sessionIdentity} liveStream={stream} token={token}/>:null):null}
          {!signedIn?<div className="home-live-standby"><LiveSignInPrompt ar={ar} kind="watch"/></div>:(!active||!live||(!webRtc&&!stream?.streamUrl))&&<div className="home-live-standby"><div className="home-live-stage-lines" aria-hidden="true"/><Radio size={38} strokeWidth={1}/><span>ECHO / LIVE SESSIONS</span><h3>{!isSessionReady?tr('Checking the stage…','جارٍ التحقق…'):tr('Next set. Same energy.','البث القادم. نفس الطاقة.')}</h3><p>{tr('The live picture appears here when Khalil goes on air.','تظهر صورة البث هنا عند بدء بث خليل.')}</p>{nextLiveLabel&&<p className="home-live-next"><strong>{tr('Next live:','البث القادم:')}</strong> {nextLiveLabel}</p>}</div>}
          <div className="home-live-preview-top home-live-player-controls">{signedIn&&live&&webRtc&&<button type="button" className="home-live-sound-toggle" onClick={toggleSound} aria-label={muted?tr('Enable live sound','تشغيل صوت البث'):tr('Mute live sound','كتم صوت البث')} aria-pressed={!muted}>{muted?<Volume2 size={15}/>:<VolumeX size={15}/>}</button>}<button type="button" onClick={fullscreen} disabled={!signedIn} aria-label={tr('Fullscreen preview','معاينة بملء الشاشة')}><Maximize2 size={15}/></button></div>
          {error&&<p className="home-live-preview-error" role="status">{error}</p>}
          <span className={`home-live-status${live?' is-live':''}`} role="status" title={live?tr('Live','مباشر'):tr('Offline','غير متصل')}><span className="home-live-status-label">{live?tr('Live','مباشر'):tr('Offline','غير متصل')}</span></span>

        </div>
          <div className="home-live-comments-wrapper" id="home-live-comments" role="region" aria-label={tr('Live comments','التعليقات المباشرة')}><LiveComments key={sessionIdentity} user={user} token={token} live={live} active={active} ar={ar} sessionIdentity={sessionIdentity} startedAt={stream?.liveStartedAt}/></div>
        </div>

        <div className="home-live-requests" id="home-live-requests" role="region" aria-label={tr('Song requests','طلبات الأغاني')}><LiveSongRequest key={sessionIdentity} user={user} token={token} sessionIdentity={sessionIdentity} live={live} ar={ar}/></div>
      </div>
    </div>
    </div>
  </section>,{natural:true});
}
