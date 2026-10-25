import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,AudioLines,Disc3,Maximize2,MessageCircle,Music2,Radio,RefreshCw,Video,Volume2,VolumeX} from 'lucide-react';
import {apiRequest} from '../lib/api';
import WebrtcViewer from '../components/WebrtcViewer';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import LiveSongRequest from './LiveSongRequest';
import LiveComments from './LiveComments';
import './live.css';
import './homeLiveConsole.css';

export default function HomeLiveConsole({lang,liveStream,liveSessions=[],isSessionReady}) {
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const section=useRef(null),preview=useRef(null);
  const [active,setActive]=useState(false),[stream,setStream]=useState(liveStream),[retry,setRetry]=useState(0),[checking,setChecking]=useState(false),[error,setError]=useState('');
  const [muted,setMuted]=useState(true),[volume,setVolume]=useState(.75),[previewOn,setPreviewOn]=useState(true);
  useEffect(()=>setStream(liveStream),[liveStream]);
  useEffect(()=>{
    if(!('IntersectionObserver' in window)){setActive(true);return undefined;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'200px'});
    observer.observe(section.current);return()=>observer.disconnect();
  },[]);
  const live=Boolean(stream?.isLive),webRtc=stream?.broadcastMode==='webrtc';
  const planned=(isSessionReady?liveSessions:[]).filter(song=>song.playState!=='played').slice().sort((a,b)=>Number(b.playState==='live')-Number(a.playState==='live')||Number(a.sortOrder||0)-Number(b.sortOrder||0));
  const nowPlaying=planned.find(song=>song.playState==='live');
  const reconnect=async()=>{
    setChecking(true);setError('');
    try{const data=await apiRequest('/live-stream');setStream(data.item);setRetry(value=>value+1);}
    catch{setError(tr('Could not refresh the broadcast. Try again.','تعذر تحديث البث. حاول مرة أخرى.'));}
    finally{setChecking(false);}
  };
  const fullscreen=async()=>{try{await preview.current?.requestFullscreen?.();}catch{setError(tr('Fullscreen is unavailable in this browser.','ملء الشاشة غير متاح في هذا المتصفح.'));}};
  const sessionIdentity=stream?.webrtcRoomName||stream?.activeSessionId||stream?.updatedAt||'';
  return <section className="echo-home-live echo-section" id="live" ref={section} dir={ar?'rtl':'ltr'} aria-labelledby="home-live-title">
    <header className="home-live-section-heading"><div><p className="echo-eyebrow">03 / ECHO ON AIR</p><h2 id="home-live-title">{tr('Inside the live room.','من قلب البث المباشر.')}</h2></div><a href="/live">{tr('Open live room','افتح غرفة البث')}<ArrowUpRight size={15}/></a></header>
    <div className="home-live-console">
      <nav className="home-live-rail" aria-label={tr('Live console sections','أقسام لوحة البث')}><span>E.</span><a href="#home-live-preview" aria-label={tr('Live preview','معاينة البث')}><Video size={19}/></a><a href="#home-live-catalog" aria-label={tr('Planned songs','الأغاني المخطط لها')}><Disc3 size={19}/></a><a href="#home-live-requests" aria-label={tr('Audience requests','طلبات الجمهور')}><Music2 size={19}/></a><a href="#home-live-audio" aria-label={tr('Audio controls','التحكم بالصوت')}><AudioLines size={19}/></a><a href="#home-live-comments" aria-label={tr('Comments','التعليقات')}><MessageCircle size={19}/></a><i className={live?'is-live':''} title={live?tr('Live','مباشر'):tr('Offline','غير متصل')}/></nav>
      <div className="home-live-grid">
        <div className="home-live-preview" id="home-live-preview" ref={preview}>
          {active&&previewOn&&live?(webRtc?<WebrtcViewer key={`${sessionIdentity}:${retry}`} lang={lang.lang} muted={muted||volume===0} volume={volume}/>:stream?.streamUrl?<LiveStreamPlayer key={retry} liveStream={stream}/>:null):null}
          {(!active||!previewOn||!live||(!webRtc&&!stream?.streamUrl))&&<div className="home-live-standby"><div className="home-live-stage-lines" aria-hidden="true"/><Radio size={38} strokeWidth={1}/><span>ECHO / LIVE SESSIONS</span><h3>{!previewOn?tr('Preview paused.','المعاينة متوقفة.'):!isSessionReady?tr('Checking the stage…','جارٍ التحقق…'):tr('Next set. Same energy.','البث القادم. نفس الطاقة.')}</h3><p>{!previewOn?tr('Turn the preview back on below.','شغّل المعاينة من الأسفل.'):tr('The live picture appears here when Khalil goes on air.','تظهر صورة البث هنا عند بدء بث خليل.')}</p></div>}
          <div className="home-live-preview-top"><span><i className={live?'is-live':''}/>{live?'LIVE':'STANDBY'}</span><button type="button" onClick={fullscreen} aria-label={tr('Fullscreen preview','معاينة بملء الشاشة')}><Maximize2 size={15}/></button></div>
          <div className="home-live-preview-bottom"><div><span>{tr('ON THE DECKS','على الميكسر')}</span><strong>{nowPlaying?.track||stream?.title||'DJ KHALIL NAHHAT'}</strong></div><button type="button" onClick={reconnect} disabled={checking} aria-label={tr('Reconnect live preview','إعادة الاتصال بالبث')}><RefreshCw size={15} className={checking?'is-refreshing':''}/></button></div>
        </div>
        <aside className="home-live-catalog home-live-card" id="home-live-catalog" aria-labelledby="home-live-catalog-title"><header><span><Disc3 size={16}/><h3 id="home-live-catalog-title">{tr('The set list','قائمة الأغاني')}</h3></span><small>{String(planned.length).padStart(2,'0')}</small></header><p className="home-live-subtitle">{tr('Planned for this live','مخطط لها في هذا البث')}</p><ol>{planned.map((song,index)=><li key={song.id} className={song.playState==='live'?'is-current':''}><span className="home-live-song-art">{song.coverImage?<img src={song.coverImage} alt="" loading="lazy"/>:<Disc3 size={20}/>}</span><div><strong>{song.track}</strong><small>{song.artist||song.genre||'DJ Khalil'}</small></div><span className="home-live-song-number">{song.playState==='live'?<AudioLines size={14}/>:String(index+1).padStart(2,'0')}<small>{song.duration}</small></span></li>)}</ol>{!planned.length&&<div className="home-live-empty"><Disc3 size={28}/><p>{isSessionReady?tr('Khalil’s next set list will appear here.','ستظهر قائمة البث القادم هنا.'):tr('Loading the set list…','جارٍ تحميل القائمة…')}</p></div>}<footer><Radio size={14}/><span>{tr('Selected by Khalil. Shaped by you.','يختارها خليل. ويكملها ذوقك.')}</span></footer></aside>
        <div className="home-live-lower"><div className="home-live-requests" id="home-live-requests"><LiveSongRequest live={live} ar={ar}/></div><div className="home-live-utilities">
          <section className="home-live-audio home-live-card" id="home-live-audio" aria-labelledby="home-live-audio-title"><header><span><AudioLines size={16}/><h3 id="home-live-audio-title">{tr('Your listening desk','التحكم بالاستماع')}</h3></span><small>AUDIO</small></header><div className="home-live-audio-row"><button type="button" className="home-live-sound" disabled={!live||!webRtc} onClick={()=>setMuted(value=>!value)} aria-label={muted?tr('Unmute live audio','تشغيل صوت البث'):tr('Mute live audio','كتم صوت البث')} aria-pressed={!muted}>{muted||!volume?<VolumeX size={21}/>:<Volume2 size={21}/>}</button><label>{tr('Live volume','صوت البث')}<input aria-label={tr('Live playback volume','مستوى صوت البث')} type="range" min="0" max="1" step=".01" value={volume} disabled={!live||!webRtc} onChange={event=>{setVolume(Number(event.target.value));setMuted(false);}}/></label><output>{Math.round(volume*100)}<small>%</small></output></div><div className="home-live-audio-actions"><button type="button" onClick={()=>setPreviewOn(value=>!value)} aria-pressed={previewOn}><Video size={13}/>{previewOn?tr('Pause preview','إيقاف المعاينة'):tr('Resume preview','تشغيل المعاينة')}</button><span>{live&&!webRtc?tr('Sound controls are in the video.','الصوت من داخل الفيديو.'):muted?tr('Sound is off','الصوت مكتوم'):tr('Listening live','صوت مباشر')}</span></div>{error&&<p className="home-live-error" role="status">{error}</p>}</section>
          <LiveComments live={live} active={active} ar={ar} sessionIdentity={sessionIdentity}/>
        </div></div>
      </div>
    </div>
  </section>;
}
