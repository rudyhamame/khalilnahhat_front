import {liveGoal} from '../lib/liveGoals';
import {useViewportPhase} from './useViewportPhase';
import {fitViewport} from './fitViewport';
import {useEffect,useRef,useState} from 'react';
import {AudioLines,Disc3,Maximize2,MessageCircle,Music2,Radio,RefreshCw,Video,Volume2,VolumeX} from 'lucide-react';
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
  const section=useRef(null),preview=useRef(null);
  const [active,setActive]=useState(false),[retry,setRetry]=useState(0),[error,setError]=useState('');
  const [muted,setMuted]=useState(true);
  const [panel,setPanel]=useState(null);
  const selectTab=name=>setPanel(name);
  const tabKeyDown=event=>{
    const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')];
    const current=tabs.indexOf(document.activeElement);
    let next;
    if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else if(event.key==='ArrowRight')next=(current+(ar?-1:1)+tabs.length)%tabs.length;
    else if(event.key==='ArrowLeft')next=(current+(ar?1:-1)+tabs.length)%tabs.length;
    else return;
    event.preventDefault();tabs[next].focus();tabs[next].click();
  };
  const toggleSound=()=>setMuted(value=>!value);
  const {item:stream,error:statusError,loading:checking,refresh}=useLiveStatus({token,initial:liveStream,enabled:active});
  const signedIn=Boolean(user&&token);
  useEffect(()=>{
    if(!('IntersectionObserver' in window)){setActive(true);return undefined;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'200px'});
    observer.observe(section.current);return()=>observer.disconnect();
  },[]);
  const live=Boolean(stream?.isLive),webRtc=['webrtc','whep'].includes(stream?.broadcastMode);
  const planned=(signedIn&&isSessionReady?liveSessions:[]).filter(song=>song.playState!=='played').slice().sort((a,b)=>Number(b.playState==='live')-Number(a.playState==='live')||Number(a.sortOrder||0)-Number(b.sortOrder||0));
  const nowPlaying=planned.find(song=>song.playState==='live');
  const reconnect=()=>{setError('');refresh();setRetry(value=>value+1);};
  const fullscreen=async()=>{try{await preview.current?.requestFullscreen?.();}catch{setError(tr('Fullscreen is unavailable in this browser.','ملء الشاشة غير متاح في هذا المتصفح.'));}};
  const sessionIdentity=liveSessionIdentity(stream);
  // Power-on entrance and outro in both scroll directions: 'in', or 'above'/'below' = the edge it last left through.
  // The section is observed (not the console), because the console is clipped to a thin line while it is away.
  const phase=useViewportPhase(section);
  return fitViewport(<section className="echo-home-live echo-section" id="live" ref={section} dir={ar?'rtl':'ltr'} aria-labelledby="home-live-title">
    <div className={`home-live-console home-live-switcher${panel?' has-open-panel':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`}>
    <header className="home-live-section-heading"><div><p id="home-live-title" className="echo-eyebrow">01 / ECHO ON AIR</p></div></header>
      <nav className="home-live-rail" role="tablist" onKeyDown={tabKeyDown} aria-label={tr('Live console sections','أقسام لوحة البث')}><button type="button" role="tab" id="home-live-tab-preview" aria-selected={!panel} tabIndex={!panel?0:-1} aria-label={tr('Live preview only','معاينة البث فقط')} title={tr('Live preview only','معاينة البث فقط')} aria-pressed={!panel} aria-controls="home-live-preview" onClick={()=>setPanel(null)}><Video size={19}/></button>{[
        ['catalog',Disc3,tr('Planned songs','الأغاني المخطط لها')],
        ['requests',Music2,tr('Audience requests','طلبات الجمهور')],
        ['comments',MessageCircle,tr('Comments','التعليقات')],
      ].map(([name,Icon,label])=><button key={name} type="button" role="tab" id={`home-live-tab-${name}`} aria-selected={panel===name} tabIndex={panel===name?0:-1} aria-label={label} title={label} aria-pressed={panel===name} aria-controls={`home-live-${name}`} onClick={()=>selectTab(name)}><Icon size={19}/></button>)}<i className={live?'is-live':''} title={live?tr('Live','مباشر'):tr('Offline','غير متصل')}/></nav>
      <div className="home-live-grid">
        <div className="home-live-preview" id="home-live-preview" role="tabpanel" aria-labelledby="home-live-tab-preview" hidden={Boolean(panel)} inert={panel?true:undefined} ref={preview}>
          {active&&live&&signedIn?(webRtc?<WebrtcViewer token={token} sessionIdentity={sessionIdentity} key={`${sessionIdentity}:${retry}`} lang={lang.lang} muted={muted} volume={.75}/>:stream?.streamUrl?<LiveStreamPlayer key={retry} liveStream={stream} token={token}/>:null):null}
          {!signedIn?<div className="home-live-standby"><LiveSignInPrompt ar={ar} kind="watch"/></div>:(!active||!live||(!webRtc&&!stream?.streamUrl))&&<div className="home-live-standby"><div className="home-live-stage-lines" aria-hidden="true"/><Radio size={38} strokeWidth={1}/><span>ECHO / LIVE SESSIONS</span><h3>{!isSessionReady?tr('Checking the stage…','جارٍ التحقق…'):tr('Next set. Same energy.','البث القادم. نفس الطاقة.')}</h3><p>{tr('The live picture appears here when Khalil goes on air.','تظهر صورة البث هنا عند بدء بث خليل.')}</p></div>}
          <div className="home-live-preview-top"><span><i className={live?'is-live':''}/>{live?'LIVE':'STANDBY'}{stream?.goal&&<> · {ar?liveGoal(stream.goal).ar:liveGoal(stream.goal).en}</>}</span>{signedIn&&live&&webRtc&&<button type="button" className="home-live-sound-toggle" onClick={toggleSound} aria-label={muted?tr('Enable live sound','تشغيل صوت البث'):tr('Mute live sound','كتم صوت البث')} aria-pressed={!muted}>{muted?<Volume2 size={15}/>:<VolumeX size={15}/>}<span>{muted?tr('Enable sound','تشغيل الصوت'):tr('Mute','كتم الصوت')}</span></button>}<button type="button" onClick={fullscreen} aria-label={tr('Fullscreen preview','معاينة بملء الشاشة')}><Maximize2 size={15}/></button></div>
          {(error||statusError)&&<p className="home-live-error home-live-preview-error" role="status">{error||tr('Could not refresh live status. Reconnect to try again.','تعذر تحديث حالة البث. حاول إعادة الاتصال.')}</p>}
          <div className="home-live-preview-bottom"><div><span>{tr('ON THE DECKS','على الميكسر')}</span><strong>{nowPlaying?.track||stream?.title||'DJ KHALIL NAHHAT'}</strong></div><button type="button" onClick={reconnect} disabled={checking} aria-label={tr('Reconnect live preview','إعادة الاتصال بالبث')}><RefreshCw size={15} className={checking?'is-refreshing':''}/></button></div>
        </div>
        <div className="home-live-panel-stack" aria-hidden={!panel} inert={!panel?true:undefined}>
        <aside hidden={panel!=='catalog'} className="home-live-catalog home-live-card" id="home-live-catalog" role="tabpanel" aria-labelledby="home-live-tab-catalog"><header><span><Disc3 size={16}/><h3 id="home-live-catalog-title">{tr('The set list','قائمة الأغاني')}</h3></span><small>{String(planned.length).padStart(2,'0')}</small></header><p className="home-live-subtitle">{tr('Planned for this live','مخطط لها في هذا البث')}</p><ol>{planned.map((song,index)=><li key={song.id} className={song.playState==='live'?'is-current':''}><span className="home-live-song-art">{song.coverImage?<img src={song.coverImage} alt="" loading="lazy"/>:<Disc3 size={20}/>}</span><div><strong>{song.track}</strong><small>{song.artist||song.genre||'DJ Khalil'}</small></div><span className="home-live-song-number">{song.playState==='live'?<AudioLines size={14}/>:String(index+1).padStart(2,'0')}<small>{song.duration}</small></span></li>)}</ol>{!planned.length&&<div className="home-live-empty"><Disc3 size={28}/><p>{isSessionReady?tr('Khalil’s next set list will appear here.','ستظهر قائمة البث القادم هنا.'):tr('Loading the set list…','جارٍ تحميل القائمة…')}</p></div>}<footer><Radio size={14}/><span>{tr('Selected by Khalil. Shaped by you.','يختارها خليل. ويكملها ذوقك.')}</span></footer></aside>
        <div hidden={panel!=='requests'} className="home-live-requests" id="home-live-requests" role="tabpanel" aria-labelledby="home-live-tab-requests"><LiveSongRequest key={sessionIdentity} user={user} token={token} sessionIdentity={sessionIdentity} live={live} ar={ar}/></div>
          <div hidden={panel!=='comments'} className="home-live-comments-panel" id="home-live-comments" role="tabpanel" aria-labelledby="home-live-tab-comments"><LiveComments key={sessionIdentity} user={user} token={token} live={live} active={active&&panel==='comments'} ar={ar} sessionIdentity={sessionIdentity}/></div>
        </div>
      </div>
    </div>
  </section>);
}
