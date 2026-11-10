import {useViewportAlignment} from './useViewportAlignment';
import {scrollToAppSection} from '../lib/bookingViewport';
import useHeroHeadphoneAnimation from './useHeroHeadphoneAnimation';
import { useEffect, useRef, useState } from 'react';
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from './meta';
import { playPercussion } from './percussion';
import ServiceVinyl from './ServiceVinyl';
import HomeLiveConsole from './HomeLiveConsole';
import HomeBookingAssistant from './HomeBookingAssistant';
import HomeWorkArchive from './HomeWorkArchive';
import HomeAvailability from './HomeAvailability';
import SeasonalTree from './SeasonalTree';
import {useSeasonalTheme} from './seasonalTheme';
import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {fitHomepageViewports} from './fitViewport';
import './homepageReadability.css';
import HomeAbout from './HomeAbout';
import HomeSectionNav from './HomeSectionNav';
import HeroIntroductionAudio from './HeroIntroductionAudio';
import HeroRecordVideo from './HeroRecordVideo';
import HomeContact from './HomeContact';
import './zoomReflow.css';
import './heroIntroduction.css';
import './liveViewport.css';
import './tabletLandscape.css';
import './portraitViewports.css';
import './wrapperHeaders.css';
import './liveSongRequest.css';

const ICONS = [Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2];
export function ServiceCards({ lang }) {
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const [selected, setSelected] = useState(0);
  const [hit, setHit] = useState(null);
  const [notice, setNotice] = useState('');
  const audio = useRef(null);
  const timer = useRef(null);
  const sounds = ['KICK', 'SNARE', 'HI-HAT', 'TOM', 'CLAP', 'BELL'];
  useEffect(() => () => { clearTimeout(timer.current); audio.current?.close(); }, []);
  const strike = async (index) => {
    setSelected(index); setHit(index); clearTimeout(timer.current);
    timer.current = setTimeout(() => setHit(null), 180);
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('unsupported');
      if (!audio.current) audio.current = new Audio();
      if (audio.current.state === 'suspended') await audio.current.resume();
      playPercussion(audio.current, index);
      setNotice('');
    } catch { setNotice(tr('Sound is unavailable in this browser. You can still explore every service.', 'الصوت غير متاح في هذا المتصفح. يمكنك استكشاف جميع الخدمات.')); }
  };
  return <div className="echo-service-performance"><div className="echo-percussion">
    <div className="echo-percussion-head"><div><span className="echo-console-brand">ECHO / PERCUSSION</span><p>{tr('Six services. One rhythm. Tap a pad.', 'ست خدمات. إيقاع واحد. اضغط على أحد الأزرار.')}</p></div>

    </div>
    <div className="echo-pad-grid" role="group" aria-label={tr('Service percussion pads', 'أزرار إيقاع الخدمات')}>
      {lang.t.services.map(([title], index) => {
        const Icon = ICONS[index];
        return <button type="button" className={`echo-pad ${hit === index ? 'is-hit' : ''} ${selected === index ? 'is-selected' : ''}`} key={title}
          aria-pressed={selected === index} aria-label={`${title} — ${tr('play', 'تشغيل')} ${sounds[index]}`} onClick={() => strike(index)}>
          <span className="echo-pad-top" aria-hidden="true"><span className="echo-pad-led" /></span>
          <Icon size={32} strokeWidth={1.3} aria-hidden="true" /><span className="echo-pad-title">{title}</span>
        </button>;
      })}
    </div>

    {notice && <p className="echo-pad-notice" role="status">{notice}</p>}
  </div>
    <div className={`echo-service-stage stage-${selected}`} aria-live="polite" aria-atomic="true">
      <div className="echo-stage-scene" key={selected} aria-hidden="true">
        {selected === 0 && <div className="echo-stage-deck"><div className="echo-deck-wing"><div className="echo-platter" /><div className="echo-deck-cues">{[0, 1, 2, 3].map((n) => <i key={n} />)}</div></div><div className="echo-deck-mixer"><span className="echo-mixer-screen">ECHO<span>124.0 / SYNC</span></span><div className="echo-mixer-eq">{Array.from({ length: 8 }, (_, n) => <i key={n} />)}</div><div className="echo-mixer-channels">{[0, 1, 2, 3].map((n) => <span key={n}><i /><b /></span>)}</div><div className="echo-mixer-crossfader"><i /></div></div><div className="echo-deck-wing"><div className="echo-platter" /><div className="echo-deck-cues">{[0, 1, 2, 3].map((n) => <i key={n} />)}</div></div></div>}
        {selected === 1 && <div className="echo-stage-speakers">{[0, 1].map((n) => <div className="echo-speaker" key={n}><i /><i /></div>)}<div className="echo-stage-wave">{Array.from({ length: 15 }, (_, n) => <i key={n} style={{ '--bar': `${25 + (n * 37 % 75)}%`, '--delay': `${n * .07}s` }} />)}</div></div>}
        {selected === 2 && <div className="echo-stage-lights">{[0, 1, 2].map((n) => <div className="echo-light" key={n} style={{ '--angle': `${(n - 1) * 22}deg` }}><i /></div>)}</div>}
        {(selected === 3 || selected === 5) && <div className="echo-stage-screen"><div>{Array.from({ length: 24 }, (_, n) => <i key={n} style={{ '--delay': `${n * .06}s` }} />)}</div>{selected === 5 && <span className="echo-stage-podium"><i /></span>}</div>}
        {selected === 4 && <div className="echo-stage-sparks">{Array.from({ length: 26 }, (_, n) => <i key={n} style={{ '--angle': `${(n - 13) * 5}deg`, '--delay': `${n * .045}s`, '--spark-height': `${80 + (n * 31 % 120)}px` }} />)}<span /></div>}
      </div>
      <div className="echo-stage-copy" key={`copy-${selected}`}><p className="echo-eyebrow">{tr('ONE TEAM. TOTAL IMPACT.', 'فريق واحد. تأثير كامل.')}</p><h3>{lang.t.services[selected][0]}</h3><p>{lang.t.services[selected][1]}</p></div>
    </div>
  </div>;
}

function useFeatured() {
  const [data, setData] = useState({ media: [], reviews: [], reviewsLoading:true,reviewsFailed:false, failed: false });
  useEffect(() => {
    let alive = true;
    Promise.allSettled([apiRequest('/content/media'), apiRequest('/content/testimonials')]).then(([m, r]) => {
      if (alive) setData({ media: m.status === 'fulfilled' && Array.isArray(m.value.items) ? m.value.items : [],
        reviews: r.status === 'fulfilled' && Array.isArray(r.value.items) ? r.value.items : [], reviewsLoading:false,reviewsFailed:r.status==='rejected',failed: m.status === 'rejected' || r.status === 'rejected' });
    });
    return () => { alive = false; };
  }, []);
  return data;
}

function EchoHomeContent({ lang, user, token, onCreateServiceRequest, liveStream, liveSessions, isSessionReady, auth }) {
  const orderDraft=useEventOrder();
  const seasonalTheme=useSeasonalTheme();
  const { t } = lang;
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const clientName = user?.firstName?.trim() || user?.displayName?.trim() || user?.name?.trim() || user?.username?.trim();
  const heroVisual = useRef(null);
  const [greetingStart,setGreetingStart]=useState(0),[greetingReady,setGreetingReady]=useState(0);
  const [introTransport,setIntroTransport]=useState(null);
  // After a refresh on a later chapter, skip the language intro and land on that chapter again.
  const [heroLanguageChosen,setHeroLanguageChosen]=useState(()=>{try{const saved=sessionStorage.getItem('echo-home-section');return Boolean(saved&&saved!=='home');}catch{return false;}});
  useViewportAlignment(orderDraft?.resetVersion,seasonalTheme.enabled,heroLanguageChosen);
  const headphone=useHeroHeadphoneAnimation(greetingStart,setGreetingReady);
  const setBooking=initial=>{if(initial===null){orderDraft.closeEditor();return;}orderDraft.begin(orderDraft.order.source,initial);orderDraft.openEditor();};
  const data = useFeatured();
  usePageMeta(tr('Echo Event Entertainment | DJ Khalil Toronto', 'إيكو لتنظيم وترفيه الفعاليات | دي جي خليل تورونتو'), t.intro);
  useEffect(() => {
    let frame=0,attempt=0;
    const land=()=>{
      const id=window.location.hash.slice(1);
      if(!['contact','about-dj-khalil'].includes(id))return;
      const target=document.getElementById(id);
      if(target){target.scrollIntoView({block:'start',behavior:'instant'});return;}
      if(attempt++<12)frame=requestAnimationFrame(land);
    };
    frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(land);});
    window.addEventListener('hashchange',land);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',land);};
  },[]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)');
    let frame = 0;
    const update = () => {
      frame = 0;
      heroVisual.current?.style.setProperty('--echo-parallax', motion.matches ? '0px' : `${Math.min(window.scrollY * 0.08, 30)}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    motion.addEventListener('change', schedule);
    update();
    return () => { window.removeEventListener('scroll', schedule); motion.removeEventListener('change', schedule); cancelAnimationFrame(frame); };
  }, []);
  return fitHomepageViewports(<>
    <div className="echo-artist-sequence echo-headphone-study hero-introduction" ref={headphone.sceneRef} data-language-selected={heroLanguageChosen?'true':'false'} data-headphone-playing={headphone.playing?'':undefined}>
    <div className="hero-character-window">
    <HeroRecordVideo playing={Boolean(introTransport?.playing)} language={introTransport?.language}/>
    <div className="hero-character-frames">
    {headphone.frames.map((src,index)=><img key={src} className="echo-continuous-artist" src={src} data-headphone-frame={index} aria-hidden={index!==headphone.frame} alt={index===headphone.frame?tr('Illustrative portrait of DJ Khalil','صورة فنية لدي جي خليل'):''} width="1024" height="1536" fetchPriority="high" loading="eager" decoding="async" style={{opacity:index===headphone.frame?1:0}}/>)}
    </div>
    </div>

    <section className="echo-hero">
      <div className="echo-hero-copy"><div className="hero-copy-content"><div className="hero-intro-heading-group">
        {user&&<p className="hero-returning-greeting">{tr('Welcome back','أهلاً بعودتك')}{clientName&&<>{ar?'، ':', '}<bdi className="echo-client-name">{clientName}</bdi></>}</p>}
        <h1 className="echo-hero-title"><span className="is-active">{tr('Welcome to Echo Event services!','مرحباً بكم في إيكو لخدمات الفعاليات!')}</span></h1>
        <HeroIntroductionAudio lang={lang} animationReady={headphone.ready} animationFailed={headphone.failed} onAnimationRetry={headphone.retry} onSkip={()=>scrollToAppSection(document.getElementById('seasonal-tree-viewport')?'tree':'live',{source:'navigation',force:true})} onLanguageSelect={()=>setHeroLanguageChosen(true)} onLanguageReset={()=>{setHeroLanguageChosen(false);setGreetingStart(0);setGreetingReady(0);}} onTransportState={setIntroTransport} animationComplete={greetingReady} onBegin={()=>{setGreetingReady(0);setGreetingStart(value=>Math.abs(value)+1);}} onStop={()=>{setGreetingReady(0);setGreetingStart(value=>-(Math.abs(value)+1));}}/>
      </div></div></div>
      <div className="echo-hero-visual" ref={heroVisual}/>

    </section>
    {heroLanguageChosen&&<HomeSectionNav ar={ar}/>}
    </div>
    {heroLanguageChosen&&<>
    {seasonalTheme.enabled&&<SeasonalTree standalone reviews={data.reviews} media={data.media} loading={data.reviewsLoading} ar={ar} lights={seasonalTheme.lights} audio={seasonalTheme.audio} photoIds={seasonalTheme.photoIds}/>}
    <HomeLiveConsole lang={lang} user={user} token={token} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady} />
    <HomeAvailability key={`availability:${orderDraft.resetVersion}`} lang={lang} />
    <HomeWorkArchive key={`work:${orderDraft.resetVersion}`} lang={lang} />
    <ServiceVinyl key={`rentals:${orderDraft.resetVersion}`} lang={lang} onPlan={setBooking}/>
    <HomeBookingAssistant lang={lang} user={user} token={token} auth={auth}/>
    {data.failed && <p className="echo-section echo-muted" role="status">{tr('Some featured content could not be loaded. You can still explore our services and request a quote.', 'تعذر تحميل بعض المحتوى. يمكنك استكشاف الخدمات وطلب عرض سعر.')}</p>}
    <HomeContact lang={lang}/>
    <HomeAbout lang={lang}/>
    </>}
  </>);
}

export default function EchoHome(props){
  const key=props.user?.id||props.user?._id||props.user?.username||'guest';
  return <EventOrderProvider key={key} user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><EchoHomeContent {...props}/></EventOrderProvider>;
}
