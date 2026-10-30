import QuotePage from './QuotePage';
import {useViewportAlignment} from './useViewportAlignment';
import {cloudAsset} from '../lib/cloudAsset';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, Pause, Play } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from './meta';
import { playPercussion } from './percussion';
import ServiceVinyl from './ServiceVinyl';
import HomeLiveConsole from './HomeLiveConsole';
import HomeMusicArchive from './HomeMusicArchive';
import HomeAvailability from './HomeAvailability';
import HomeWork from './HomeWork';
import HeroReviews from './HeroReviews';
import HeroGallery from './HeroGallery';
import SeasonalTree from './SeasonalTree';
import {useSeasonalTheme} from './seasonalTheme';
import BookingDetailsDialog from './BookingDetailsDialog';
import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import './draftReview.css';
import {fitHomepageViewports} from './fitViewport';
import './homepageReadability.css';
import HomeAbout from './HomeAbout';
import './zoomReflow.css';
import './liveViewport.css';

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

function EchoHomeContent({ lang, user, onCreateServiceRequest, liveStream, liveSessions, isSessionReady }) {
  useViewportAlignment();
  const { t } = lang;
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const heroVisual = useRef(null);
  const heroCopy = useRef(null);
  useLayoutEffect(()=>{
    const content=heroCopy.current,column=content.parentElement;
    let frame=0,alive=true;
    const fit=()=>{
      frame=0;if(!alive)return;
      if(content.querySelector('.seasonal-tree')||!matchMedia('(max-width:1000px), (max-height:600px)').matches){
        content.style.removeProperty('width');content.style.removeProperty('transform');
        return;
      }
      const css=getComputedStyle(column);
      const width=column.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
      const height=column.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
      const designWidth=Math.max(width,900);
      content.style.width=`${designWidth}px`;
      const scale=Math.min(1,width/designWidth,height/Math.max(1,content.scrollHeight));
      content.style.transform=`scale(${scale})`;
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(fit);};
    const observer=new ResizeObserver(schedule);observer.observe(column);observer.observe(content);
    const mutations=new MutationObserver(schedule);mutations.observe(content,{childList:true,subtree:true,characterData:true});
    window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);fit();
    return()=>{alive=false;observer.disconnect();mutations.disconnect();window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
  },[]);
  const orderDraft=useEventOrder();
  const booking=orderDraft.editorOpen;
  const setBooking=initial=>{if(initial===null){orderDraft.closeEditor();return;}orderDraft.begin(orderDraft.order.source,initial);orderDraft.openEditor();};
  const heroMotion = new URLSearchParams(window.location.search).get('heroMotion') || 'clean';
  const headphoneStudy = heroMotion === 'preview' || heroMotion === 'clean';

  // Scroll-driven headphones sequence in the first viewport. The page stays pinned at the top while a short stretch of
  // scrolling plays the whole sequence by itself; after that the page scrolls normally. Scrolling back
  // up from the top rewinds it.
  const heroFrames=useMemo(()=>Array.from({length:8},(_,index)=>cloudAsset(`/echo/${heroMotion==='clean'?'headphone-motion-clean-v2':'headphone-motion-cutout'}/pose-${String(index).padStart(2,'0')}.webp`)),[heroMotion]);
  const [heroFrame,setHeroFrame]=useState(0);
  const [treeEntering,setTreeEntering]=useState(()=>headphoneStudy&&window.scrollY<=2&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    if(!headphoneStudy||matchMedia('(prefers-reduced-motion: reduce)').matches)return undefined;
    const HERO_MS=2600;
    let alive=true,ready=false,progress=window.scrollY>2?1:0;
    const sequence=document.querySelector('.echo-artist-sequence');
    const settle=value=>{const c1=1.25,c3=c1+1;return 1+c3*Math.pow(value-1,3)+c1*Math.pow(value-1,2);};// ease-out with a small overshoot
    const show=()=>{setHeroFrame(Math.round(progress*(heroFrames.length-1)));const t=settle(progress),clamped=Math.max(0,Math.min(1,progress));// the tree orbits out from behind the character: across the screen, along an arc, growing as it comes forward
    if(sequence){sequence.style.setProperty('--tree-x',String((1-t)*52));sequence.style.setProperty('--tree-y',String(-Math.sin(Math.PI*clamped)*14));sequence.style.setProperty('--tree-s',String(.28+.72*t));sequence.style.setProperty('--tree-o',String(Math.min(1,clamped*4)));sequence.style.setProperty('--hero-relax',String(1-clamped));}setTreeEntering(progress<1);};
    // One scroll gesture plays the whole sequence (character frames and the tree's orbit) as a single timed animation, like the other sections.
    let raf=0,playing=false,quietUntil=0;
    const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    const play=to=>{
      if(playing)return;playing=true;const from=progress,begin=performance.now();
      const tick=now=>{const k=Math.min(1,(now-begin)/HERO_MS);progress=from+(to-from)*ease(k);show();if(k<1)raf=requestAnimationFrame(tick);else{playing=false;quietUntil=performance.now()+450;}};
      raf=requestAnimationFrame(tick);
    };
    const failsafe=setTimeout(()=>{if(!ready){progress=1;setTreeEntering(false);}},6000);
    Promise.all(heroFrames.map(src=>new Promise(resolve=>{const image=new Image();image.onload=resolve;image.onerror=resolve;image.src=src;}))).then(()=>{if(alive){ready=true;show();}});
    const own=target=>{for(let node=target;node&&node!==document.body;node=node.parentElement){if(node.matches?.('input,textarea,select,dialog,[role=dialog],[role=listbox],.event-order-aside'))return true;const style=getComputedStyle(node);if(/(auto|scroll)/.test(style.overflowY)&&node.tagName!=='SECTION'&&node.scrollHeight-node.clientHeight>60)return true;}return false;};
    const wheel=event=>{
      if(!ready||event.ctrlKey||Math.abs(event.deltaY)<Math.abs(event.deltaX)||own(event.target))return;
      // While it plays (and for a moment after, so trackpad momentum does not carry on) the page stays put.
      if(playing||performance.now()<quietUntil){event.preventDefault();return;}
      if(window.scrollY>2)return;
      const delta=event.deltaMode===1?event.deltaY*16:event.deltaY;
      if(delta>0&&progress<1){event.preventDefault();play(1);}
      else if(delta<0&&progress>0){event.preventDefault();play(0);}
    };
    // Touch (iPad, phones): the first swipe up at the top plays the whole sequence while the page stays put, as the wheel does.
    let touchY=null;
    const touchStart=event=>{touchY=event.touches[0]?.clientY??null;};
    const touchMove=event=>{
      if(!ready||touchY===null||event.touches.length>1||own(event.target))return;
      if(playing||performance.now()<quietUntil){if(event.cancelable)event.preventDefault();return;}
      if(window.scrollY>2)return;
      const dy=(event.touches[0]?.clientY??touchY)-touchY;
      if(Math.abs(dy)<8)return;
      if(dy<0&&progress<1){if(event.cancelable)event.preventDefault();play(1);}
      else if(dy>0&&progress>0){if(event.cancelable)event.preventDefault();play(0);}
    };
    // Other ways of moving the page (keys, scrollbar, anchors, momentum) skip straight to the finished state.
    const scroll=()=>{
      if(!ready||playing||window.scrollY<=2||progress>=1)return;
      progress=1;show();
    };
    window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('wheel',wheel,{passive:false,capture:true});
    window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false,capture:true});
    return()=>{alive=false;clearTimeout(failsafe);cancelAnimationFrame(raf);['--tree-x','--tree-y','--tree-s','--tree-o','--hero-relax'].forEach(name=>sequence?.style.removeProperty(name));window.removeEventListener('scroll',scroll);window.removeEventListener('wheel',wheel,true);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove,true);};
  },[headphoneStudy,heroFrames]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const data = useFeatured();
  const seasonalTheme=useSeasonalTheme();
  const slides = ['https://res.cloudinary.com/nqiooluk/image/upload/v1793064103/khalil/site-assets/ef485552dfca/echo/jade-portrait-transparent.webp'];
  usePageMeta(tr('Echo Event Entertainment | DJ Khalil Toronto', 'إيكو لتنظيم وترفيه الفعاليات | دي جي خليل تورونتو'), t.intro);
  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % 4), 6500);
    return () => clearInterval(id);
  }, [paused, slides.length]);
  useEffect(() => {
    let frame=0,attempt=0;
    const land=()=>{
      if(window.location.hash!=='#about-dj-khalil')return;
      const target=document.getElementById('about-dj-khalil');
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
    <div className={`echo-artist-sequence${seasonalTheme.enabled?' has-seasonal-theme':''}${headphoneStudy ? ' echo-headphone-study' : ''}`} data-tree-entering={treeEntering?'':undefined}>
    <img className="echo-continuous-artist" src={headphoneStudy?heroFrames[heroFrame]:'https://res.cloudinary.com/nqiooluk/image/upload/v1793064104/khalil/site-assets/3691073b9e76/echo/khalil-fresh-natural-hands.webp'} alt={tr('Illustrative portrait of DJ Khalil at his mixer', 'صورة فنية لدي جي خليل عند الميكسر')} width="1024" height="1536" fetchPriority="high"/>

    <section className="echo-hero">
      <div className="echo-hero-copy"><div className="hero-copy-content" ref={heroCopy}>
        <h1 className="echo-hero-title" aria-label={t.heroLines[i]}>
          {t.heroLines.map((line, n) => <span key={line} aria-hidden="true" className={i === n ? 'is-active' : ''}>{line}</span>)}
        </h1>
        <p className="echo-hero-description">{tr('Music, sound, lighting and visuals for weddings, private celebrations and corporate events. DJ Khalil and Echo bring every detail into sync.', 'موسيقى وصوت وإضاءة وصورة للأعراس والاحتفالات الخاصة وفعاليات الشركات. يجمع دي جي خليل وإيكو كل التفاصيل في تناغم.')}</p>
        <div className="hero-carousel-group">
          {seasonalTheme.enabled?<SeasonalTree reviews={data.reviews} media={data.media} loading={data.reviewsLoading} ar={ar} lights={seasonalTheme.lights} audio={seasonalTheme.audio}/>:<>
          <HeroReviews reviews={data.reviews} loading={data.reviewsLoading} failed={data.reviewsFailed} ar={ar}/>
          <HeroGallery media={data.media} loading={data.reviewsLoading} ar={ar}/></>}
        </div>
      </div></div>
      <div className="echo-hero-visual" ref={heroVisual}>
        <div className="echo-image-caption"><span>{tr('FEATURING', 'بمشاركة')}<strong>DJ KHALIL</strong></span><span>DJ / SOUND / LIGHTING / LED / FX</span></div>
      </div>
      <div className="echo-hero-bottom">{slides.length > 1 && <div className="echo-slide-controls">
        {t.heroLines.map((line, n) => <button key={line} type="button" aria-label={tr(`Show slide ${n + 1}`, `عرض الشريحة ${n + 1}`)} aria-pressed={i === n} className={i === n ? 'is-active' : ''} onClick={() => { setI(n); setPaused(true); }} />)}
        <button type="button" className="echo-pause" onClick={() => setPaused(!paused)} aria-label={paused ? tr('Play slideshow', 'تشغيل العرض') : tr('Pause slideshow', 'إيقاف العرض مؤقتاً')}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
      </div>}</div>
    </section>
    </div>
    <span id="how-to-book" className="event-order-entry-anchor" aria-hidden="true"/>
    <HomeWork lang={lang} />
    <HomeAvailability lang={lang} />
    <HomeMusicArchive lang={lang} />
    <ServiceVinyl lang={lang} onPlan={setBooking}/>
    <HomeLiveConsole lang={lang} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady} />
    {data.reviews.length > 0 && <section className="echo-section"><p className="echo-eyebrow">{tr('FROM OUR CLIENTS', 'آراء عملائنا')}</p><h2>{tr('Their words. Our purpose.', 'كلماتهم. شغفنا.')}</h2><div className="echo-grid">{data.reviews.slice(0, 3).map((r) => <figure className="echo-review" key={r.id}><blockquote>{ar && r.textAr ? r.textAr : r.text}</blockquote><figcaption><strong>{r.name}</strong><span>{r.eventType}</span></figcaption></figure>)}</div></section>}
    {data.failed && <p className="echo-section echo-muted" role="status">{tr('Some featured content could not be loaded. You can still explore our services and request a quote.', 'تعذر تحميل بعض المحتوى. يمكنك استكشاف الخدمات وطلب عرض سعر.')}</p>}
    <HomeAbout lang={lang}/>
    {booking&&<BookingDetailsDialog key={orderDraft.revision} inline initialEvent={{}} onClose={()=>setBooking(null)} lang={lang} user={user} isSessionReady={isSessionReady} onCreateServiceRequest={onCreateServiceRequest}/>}
  </>);
}

function DraftReviewPage(props){
  const ctx=useEventOrder(),ar=props.lang.lang==='ar';
  usePageMeta(ar?'راجع تفاصيل فعاليتك | إيكو':'Review your event | Echo',ar?'راجع تفاصيل فعاليتك قبل طلب عرض السعر.':'Review your event details before requesting your quotation.');
  if(props.user&&!ctx.cloudReady)return <section className="echo-section" aria-label={ar?'مراجعة مسودة الفعالية':'Review event draft'}><h1>{ar?'مراجعة مسودة الفعالية':'Review event draft'}</h1><p role="status">{ctx.saveState==='load-failed'?(ar?'تعذر تحميل المسودة.':'Could not load your draft.'):(ar?'جارٍ تحميل المسودة…':'Loading your draft…')}</p>{ctx.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{ar?'إعادة المحاولة':'Retry'}</button>}</section>;
  return <QuotePage {...props} review/>;
}

function EchoBody(props){
  const ctx=useEventOrder();
  return ctx.reviewing?<DraftReviewPage {...props}/>:<EchoHomeContent {...props}/>;
}

export default function EchoHome(props){
  const reviewOnly=window.location.pathname==='/draft-review';
  const key=props.user?.id||props.user?._id||props.user?.username||'guest';
  return <EventOrderProvider key={key} user={props.user} token={props.token} lang={props.lang} auth={props.auth} reviewOnly={reviewOnly}>{reviewOnly?<DraftReviewPage {...props}/>:<EchoBody {...props}/>}</EventOrderProvider>;
}
