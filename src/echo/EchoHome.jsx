import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, Pause, Play, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from './meta';
import { playPercussion } from './percussion';
import HeroHeadphoneStudy from './HeroHeadphoneStudy';
import ServiceVinyl from './ServiceVinyl';
import FastBooking from './FastBooking';
import HomeLiveConsole from './HomeLiveConsole';

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
  const [data, setData] = useState({ media: [], reviews: [], failed: false });
  useEffect(() => {
    let alive = true;
    Promise.allSettled([apiRequest('/content/media'), apiRequest('/content/testimonials')]).then(([m, r]) => {
      if (alive) setData({ media: m.status === 'fulfilled' && Array.isArray(m.value.items) ? m.value.items : [],
        reviews: r.status === 'fulfilled' && Array.isArray(r.value.items) ? r.value.items : [], failed: m.status === 'rejected' || r.status === 'rejected' });
    });
    return () => { alive = false; };
  }, []);
  return data;
}

export default function EchoHome({ lang, liveStream, liveSessions, isSessionReady }) {
  const { t } = lang;
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const heroVisual = useRef(null);
  const heroMotion = new URLSearchParams(window.location.search).get('heroMotion') || 'clean';
  const headphoneStudy = heroMotion === 'preview' || heroMotion === 'clean';
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const data = useFeatured();
  const slides = ['/echo/jade-portrait-transparent.webp'];
  const mixes = data.media.filter((m) => m.kind === 'mix').slice(0, 2);
  const events = data.media.filter((m) => m.kind === 'photo' || m.kind === 'video').slice(0, 3);
  usePageMeta(tr('Echo Event Entertainment | DJ Khalil Toronto', 'إيكو لتنظيم وترفيه الفعاليات | دي جي خليل تورونتو'), t.intro);
  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % 4), 6500);
    return () => clearInterval(id);
  }, [paused, slides.length]);
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
  return <>
    <div className={`echo-artist-sequence${headphoneStudy ? ' echo-headphone-study' : ''}`}>{headphoneStudy ? <HeroHeadphoneStudy ar={ar} clean={heroMotion === 'clean'} /> : <img className="echo-continuous-artist" src="/echo/khalil-fresh-natural-hands.webp" alt={tr('Illustrative portrait of DJ Khalil at his mixer', 'صورة فنية لدي جي خليل عند الميكسر')} width="1024" height="1536" fetchPriority="high" />}

    <section className="echo-hero">
      <div className="echo-hero-copy">
        <h1 className="echo-hero-title" aria-label={t.heroLines[i]}>
          {t.heroLines.map((line, n) => <span key={line} aria-hidden="true" className={i === n ? 'is-active' : ''}>{line}</span>)}
        </h1>
        <p className="echo-hero-description">{tr('A room full of energy. A show that runs beautifully. DJ Khalil and Echo bring your entertainment, sound, lighting and visuals together.', 'قاعة مليئة بالطاقة وعرض متكامل بدقة. يجمع دي جي خليل وإيكو الترفيه والصوت والإضاءة والصورة لفعاليتك.')}</p>
        <FastBooking lang={lang} />
        <a className="echo-text-link" href="/quote">{t.cta.quote}<ArrowUpRight size={16} aria-hidden="true" /></a>
        <a className="echo-text-link" href="#services">{t.cta.services}<ArrowRight size={18} aria-hidden="true" /></a>
      </div>
      <div className="echo-hero-visual" ref={heroVisual}>
        <div className="echo-image-caption"><span>{tr('FEATURING', 'بمشاركة')}<strong>DJ KHALIL</strong></span><span>DJ / SOUND / LIGHTING / LED / FX</span></div>
      </div>
      <div className="echo-hero-bottom">{slides.length > 1 && <div className="echo-slide-controls">
        {t.heroLines.map((line, n) => <button key={line} type="button" aria-label={tr(`Show slide ${n + 1}`, `عرض الشريحة ${n + 1}`)} aria-pressed={i === n} className={i === n ? 'is-active' : ''} onClick={() => { setI(n); setPaused(true); }} />)}
        <button type="button" className="echo-pause" onClick={() => setPaused(!paused)} aria-label={paused ? tr('Play slideshow', 'تشغيل العرض') : tr('Pause slideshow', 'إيقاف العرض مؤقتاً')}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
      </div>}</div>
    </section>
    </div>
    <ServiceVinyl lang={lang} />
    <HomeLiveConsole lang={lang} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady} />
    <section className="echo-section echo-intro echo-continuous-intro">
      <div><p className="echo-eyebrow">{tr('THE PEOPLE BEHIND THE EXPERIENCE', 'الفريق وراء التجربة')}</p><h2>{tr('Great music.\nEvery detail in sync.', 'موسيقى رائعة.\nكل التفاصيل بتناغم.')}</h2><p>{t.intro}</p><a className="echo-text-link" href="/about">{tr('Meet DJ Khalil & Echo', 'تعرّف على دي جي خليل وإيكو')}<ArrowUpRight size={18} aria-hidden="true" /></a></div>
    </section>
    <section className="echo-section echo-process"><div><p className="echo-eyebrow">{tr('FROM FIRST IDEA TO FINAL ENCORE', 'من الفكرة الأولى إلى اللحظة الأخيرة')}</p><h2>{tr('Your event,\nmade personal.', 'فعاليتك،\nكما تتخيلها.')}</h2><a className="echo-text-link" href="/meeting">{t.nav.meeting}<ArrowUpRight size={18} aria-hidden="true" /></a></div><ol>{[
      [tr('Tell us the vision', 'شاركنا رؤيتك'), tr('Share your date, venue and the services you need. Your request does not reserve the date.', 'شارك التاريخ والمكان والخدمات المطلوبة. إرسال الطلب لا يحجز التاريخ.')],
      [tr('Make it yours', 'صمّم تجربتك'), tr('We review the details and prepare your custom quotation. View it and request changes in your portal.', 'نراجع التفاصيل ونعد عرض سعر مخصصاً. يمكنك مراجعته وطلب تعديلات من حسابك.')],
      [tr('Confirm & plan', 'أكّد وابدأ التخطيط'), tr('Accept your quote and arrange your deposit. Once our team records payment and confirms availability, we confirm your booking.', 'اقبل العرض ورتّب دفع العربون. نؤكد الحجز بعد تسجيل الدفعة والتحقق من التوفر.')],
    ].map(([title, text], n) => <li key={title}><span>0{n + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>
    <section className="echo-section"><div className="echo-section-heading"><div><p className="echo-eyebrow">{tr('SEE THE EXPERIENCE', 'شاهد التجربة')}</p><h2>{tr('In the spotlight.', 'تحت الأضواء.')}</h2></div><a className="echo-text-link" href="/gallery">{t.nav.gallery}<ArrowUpRight size={18} aria-hidden="true" /></a></div>
      {events.length ? <div className="echo-grid">{events.map((m) => <a className="echo-feature" href="/gallery" key={m.id}>{(m.coverUrl || m.kind === 'photo') && <img src={m.coverUrl || m.mediaUrl} loading="lazy" alt={ar && m.titleAr ? m.titleAr : m.title} />}<p className="echo-eyebrow">{m.category}</p><h3>{ar && m.titleAr ? m.titleAr : m.title}</h3></a>)}</div> : <div className="echo-empty"><Monitor size={28} strokeWidth={1.3} aria-hidden="true" /><p>{tr('Event highlights will appear here as our team publishes them.', 'ستظهر أبرز الفعاليات هنا عندما ينشرها فريقنا.')}</p></div>}
    </section>
    <section className="echo-section echo-sound-section"><div><p className="echo-eyebrow">{tr('THE SOUND OF DJ KHALIL', 'موسيقى دي جي خليل')}</p><h2>{tr('Find your rhythm.', 'اكتشف إيقاعك.')}</h2><p>{tr('Arabic mixes, wedding entrances and live sets. Explore the music behind your next celebration.', 'ميكسات عربية وموسيقى دخول الأعراس وعروض حيّة. اكتشف موسيقى احتفالك القادم.')}</p><a className="echo-text-link" href="/mixes">{tr('Explore mixes & remixes', 'استكشف الميكسات والريميكسات')}<ArrowUpRight size={18} aria-hidden="true" /></a></div><div className="echo-home-mixes">{mixes.length ? mixes.map((m) => <article key={m.id}><h3>{ar && m.titleAr ? m.titleAr : m.title}</h3><p>{m.category}</p><audio controls preload="none" src={m.mediaUrl} aria-label={m.title} /></article>) : <div className="echo-empty"><Disc3 size={44} strokeWidth={1} aria-hidden="true" /><p>{tr('New mixes will be available here when published.', 'ستتوفر الميكسات الجديدة هنا عند نشرها.')}</p></div>}</div></section>
    {data.reviews.length > 0 && <section className="echo-section"><p className="echo-eyebrow">{tr('FROM OUR CLIENTS', 'آراء عملائنا')}</p><h2>{tr('Their words. Our purpose.', 'كلماتهم. شغفنا.')}</h2><div className="echo-grid">{data.reviews.slice(0, 3).map((r) => <figure className="echo-review" key={r.id}><blockquote>{ar && r.textAr ? r.textAr : r.text}</blockquote><figcaption><strong>{r.name}</strong><span>{r.eventType}</span></figcaption></figure>)}</div></section>}
    {data.failed && <p className="echo-section echo-muted" role="status">{tr('Some featured content could not be loaded. You can still explore our services and request a quote.', 'تعذر تحميل بعض المحتوى. يمكنك استكشاف الخدمات وطلب عرض سعر.')}</p>}
    <section className="echo-final"><div className="echo-section"><p className="echo-eyebrow">{tr('LET’S CREATE SOMETHING UNFORGETTABLE', 'لنصنع تجربة لا تُنسى')}</p><h2>{t.finalTitle}</h2><p>{t.finalText}</p><a className="echo-btn" href="/quote">{t.cta.quote}<ArrowUpRight size={20} aria-hidden="true" /></a></div></section>
  </>;
}
