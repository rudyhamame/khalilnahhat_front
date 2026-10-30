import {cloudAsset} from '../lib/cloudAsset';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from './meta';
import { ServiceCards } from './EchoHome';

const L = (lang) => (en, ar) => (lang.lang === 'ar' ? ar || en : en);
const pick = (lang, en, ar) => (lang.lang === 'ar' && ar ? ar : en);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function useList(path) {
  const [state, setState] = useState({ items: [], loaded: false, error: false });
  useEffect(() => {
    let active = true;
    apiRequest(path).then((r) => {
      if (!Array.isArray(r.items)) throw new Error('Invalid content response');
      if (active) setState({ items: r.items, loaded: true, error: false });
    }).catch(() => { if (active) setState({ items: [], loaded: true, error: true }); });
    return () => { active = false; };
  }, [path]);
  return state;
}

export function MixesPage({ lang }) {
  const t = L(lang);
  usePageMeta('DJ Khalil Mixes & Remixes | Echo Event Entertainment', 'Listen to Arabic mixes, wedding mixes, live DJ sets and remixes by DJ Khalil.');
  const { items, loaded, error } = useList('/content/media?kind=mix');
  const [cat, setCat] = useState('');
  const [cur, setCur] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const audio = useRef(null);
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const shown = items.filter((i) => !cat || i.category === cat);

  useEffect(() => { if (audio.current) audio.current.volume = vol; }, [vol]);
  const play = (item) => {
    if (cur?.id === item.id) { if (playing) audio.current.pause(); else audio.current.play(); return; }
    setCur(item);
    setTimeout(() => audio.current?.play().catch(() => {}), 0);
  };
  const share = async (item) => {
    const url = `${window.location.origin}/mixes`;
    try { if (navigator.share) await navigator.share({ title: item.title, url }); else await navigator.clipboard.writeText(url); } catch { /* cancelled */ }
  };

  return (
    <section className="echo-section">
      <h1 className="echo-h1">{t('Mixes & Remixes', 'الميكسات والريميكسات')}</h1>
      {cats.length > 0 && (
        <div className="echo-tabs">
          <button type="button" className={!cat ? 'is-on' : ''} onClick={() => setCat('')}>{t('All', 'الكل')}</button>
          {cats.map((c) => <button key={c} type="button" className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      {error && <p role="alert">{t('Could not load mixes. Please refresh to try again.', 'تعذر تحميل الميكسات. يرجى تحديث الصفحة للمحاولة مجدداً.')}</p>}
      {loaded && !error && !shown.length && <p className="echo-muted">{t('Mixes are coming soon.', 'الميكسات قريباً.')}</p>}
      <div className="echo-grid">
        {shown.map((m) => (
          <article className="echo-card" key={m.id}>
            <div className="echo-photo">{m.coverUrl ? <img src={m.coverUrl} alt={pick(lang, m.title, m.titleAr)} loading="lazy" /> : <span>♪</span>}</div>
            <h3>{pick(lang, m.title, m.titleAr)}</h3>
            <p className="echo-muted">{m.category}{m.durationSec ? ` · ${fmt(m.durationSec)}` : ''}</p>
            <button type="button" className="echo-btn" onClick={() => play(m)}>{cur?.id === m.id && playing ? t('PAUSE', 'إيقاف مؤقت') : t('PLAY', 'تشغيل')}</button>
            <button type="button" className="echo-link" onClick={() => share(m)}>{t('Share', 'مشاركة')}</button>
            {m.downloadable && <a className="echo-link" href={m.mediaUrl} download>{t('Download', 'تنزيل')}</a>}
          </article>
        ))}
      </div>
      {cur && (
        <div className="echo-player" dir="ltr">
          <strong>{pick(lang, cur.title, cur.titleAr)}</strong>
          <input type="range" min="0" max={dur || 0} step="1" value={pos} aria-label="Progress"
            onChange={(e) => { audio.current.currentTime = Number(e.target.value); }} />
          <span>{fmt(pos)} / {fmt(dur)}</span>
          <input type="range" min="0" max="1" step="0.05" value={vol} aria-label="Volume" onChange={(e) => setVol(Number(e.target.value))} />
          <audio ref={audio} src={cur.mediaUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setPos(e.target.currentTime)} onLoadedMetadata={(e) => setDur(e.target.duration)}>
            <track kind="captions" />
          </audio>
        </div>
      )}
    </section>
  );
}

function embedUrl(url) {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/.exec(url);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : '';
}

export function GalleryPage({ lang }) {
  const t = L(lang);
  usePageMeta('Event Videos & Gallery | DJ Khalil Toronto', 'Wedding highlights, DJ Khalil live, lighting productions and LED wall installations by Echo Event Entertainment.');
  const video = useList('/content/media?kind=video');
  const photo = useList('/content/media?kind=photo');
  const items = [...video.items, ...photo.items];
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState(null);
  const dialog = useRef(null);
  useEffect(() => {
    if (!open || !dialog.current) return undefined;
    const previous = document.activeElement;
    const node = dialog.current;
    node.showModal();
    return () => { node.close(); previous?.focus(); };
  }, [open]);
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const shown = items.filter((i) => !cat || i.category === cat);
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{t('Videos & Gallery', 'الفيديو والمعرض')}</h1>
      {cats.length > 0 && (
        <div className="echo-tabs">
          <button type="button" className={!cat ? 'is-on' : ''} onClick={() => setCat('')}>{t('All', 'الكل')}</button>
          {cats.map((c) => <button key={c} type="button" className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      {(video.error || photo.error) && <p role="alert">{t('Some gallery content could not be loaded. Please refresh to try again.', 'تعذر تحميل بعض محتوى المعرض. يرجى تحديث الصفحة للمحاولة مجدداً.')}</p>}
      {video.loaded && photo.loaded && !video.error && !photo.error && !shown.length && <p className="echo-muted">{t('Real event highlights are coming soon.', 'أبرز الفعاليات الحقيقية قريباً.')}</p>}
      <div className="echo-grid">
        {shown.map((m) => (
          <button type="button" className="echo-card echo-tile" key={m.id} onClick={() => setOpen(m)}>
            <div className="echo-photo">{(m.coverUrl || m.kind === 'photo') ? <img src={m.coverUrl || m.mediaUrl} alt={pick(lang, m.title, m.titleAr)} loading="lazy" /> : <span>▶</span>}</div>
            <h3>{pick(lang, m.title, m.titleAr)}</h3>
          </button>
        ))}
      </div>
      <div className="echo-inspiration"><p className="echo-eyebrow">{t('BRAND VISUALS', 'صور العلامة')}</p><h2>{t('A vision for your event.', 'رؤية لفعاليتك.')}</h2><p>{t('Illustrative scenes created for the Echo brand. Real event highlights appear above when published by our team.', 'مشاهد فنية أُنشئت لعلامة إيكو. تظهر أبرز الفعاليات الحقيقية أعلاه عندما ينشرها فريقنا.')}</p>
        <div className="echo-grid">{[
          ['performance', t('DJ Khalil · wedding concept', 'دي جي خليل · تصور لحفل زفاف')],
          ['wedding-live', t('DJ Khalil · live concept', 'دي جي خليل · تصور لعرض حي')],
          ['production', t('Event production concept', 'تصور لإنتاج الفعاليات')],
          ['jade-portrait-transparent', t('DJ Khalil · studio portrait', 'دي جي خليل · صورة استوديو')],
          ['production-detail', t('Production detail concept', 'تصور لتفاصيل الإنتاج')],
        ].map(([asset, title]) => <button key={asset} type="button" className="echo-card echo-tile" onClick={() => setOpen({ title, kind: 'photo', mediaUrl: cloudAsset(`/echo/${asset}.webp`) })}><div className="echo-photo"><img src={cloudAsset(`/echo/${asset}.webp`)} alt={title} loading="lazy" /></div><h3>{title}</h3></button>)}</div>
      </div>
      {open && (
        <dialog ref={dialog} className="echo-modal echo-native-dialog" aria-label={open.title} onCancel={() => setOpen(null)}>
          <button type="button" className="echo-btn" onClick={() => setOpen(null)}>{t('Close', 'إغلاق')}</button>
          {open.kind === 'photo' ? <img src={open.mediaUrl} alt={open.title} />
            : embedUrl(open.mediaUrl) ? <iframe title={open.title} src={embedUrl(open.mediaUrl)} allow="autoplay; fullscreen" allowFullScreen />
              : <video src={open.mediaUrl} controls autoPlay playsInline><track kind="captions" /></video>}
        </dialog>
      )}
    </section>
  );
}

export function ReviewsPage({ lang }) {
  const t = L(lang);
  usePageMeta('Client Reviews | DJ Khalil & Echo Event Entertainment', 'Read reviews from wedding and event clients of DJ Khalil and Echo Event Entertainment in Toronto.');
  const { items, loaded, error } = useList('/content/testimonials');
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{t('Client Reviews', 'آراء العملاء')}</h1>
      {error && <p role="alert">{t('Could not load reviews. Please refresh to try again.', 'تعذر تحميل الآراء. يرجى تحديث الصفحة للمحاولة مجدداً.')}</p>}
      {loaded && !error && !items.length && <p className="echo-muted">{t('Reviews are coming soon.', 'الآراء قريباً.')}</p>}
      <div className="echo-grid">
        {items.map((r) => (
          <figure className="echo-card" key={r.id}>
            {r.imageUrl && <div className="echo-photo"><img src={r.imageUrl} alt={r.name} loading="lazy" /></div>}
            <blockquote>{pick(lang, r.text, r.textAr)}</blockquote>
            <figcaption><strong>{r.name}</strong>{r.eventType ? ` · ${r.eventType}` : ''}</figcaption>
            {r.reply && <div className="echo-review-reply"><strong>{t('Response from Echo', 'رد من إيكو')}</strong><p dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.reply}</p></div>}
          </figure>
        ))}
      </div>
    </section>
  );
}

export function ContactPage({ lang }) {
  const t = L(lang);
  usePageMeta('Contact Echo Event Entertainment | DJ Khalil Toronto', 'Contact DJ Khalil and Echo Event Entertainment in Toronto for weddings, private and corporate events.');
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{t('Contact Us', 'اتصل بنا')}</h1>
      <p>{t('Toronto, Ontario — serving the Greater Toronto Area and beyond.', 'تورونتو، أونتاريو — نخدم منطقة تورونتو الكبرى وما حولها.')}</p>
      <p><a href="mailto:khalilnahhatdj@gmail.com">khalilnahhatdj@gmail.com</a></p>
      <div className="echo-ctas">
        <a className="echo-btn" href="/#event-order">{t('REQUEST A QUOTE', 'اطلب عرض سعر')}</a>
        <a className="echo-btn echo-btn-alt" href="/#event-order">{t('BOOK A MEETING', 'احجز اجتماعاً')}</a>
      </div>
    </section>
  );
}

const SERVICES = {
  'wedding-dj-toronto': {
    en: ['Wedding DJ Toronto', 'Arabic & Middle Eastern wedding DJ in the GTA', 'DJ Khalil brings 10+ years of Arabic, Middle Eastern and multicultural wedding experience: live sets, music programming, MC announcements and customised entrance mixes.'],
    ar: ['دي جي أعراس في تورونتو', 'دي جي للأعراس العربية والشرق أوسطية', 'يقدّم دي جي خليل أكثر من 10 سنوات من الخبرة في الأعراس العربية والشرق أوسطية ومتعددة الثقافات: عروض حيّة وبرمجة موسيقية وتقديم وميكسات دخول مخصصة.'],
  },
  'led-wall-rental-toronto': {
    en: ['LED Wall Rental Toronto', 'Six-panel LED screens for weddings and events', 'LED wall arrangements and visual designs can be customised to your event, subject to available equipment and an approved production plan.'],
    ar: ['تأجير شاشات LED في تورونتو', 'شاشات LED من ست وحدات للأعراس والفعاليات', 'يمكن تخصيص ترتيب شاشات LED والتصاميم المرئية حسب فعاليتك، بحسب المعدات المتاحة وخطة إنتاج معتمدة.'],
  },
  'sound-system-rental-toronto': {
    en: ['Sound System Rental Toronto', 'QSC, JBL concert-level sound and Shure wireless microphones', 'From QSC K12.2 powered speakers and ES18P subwoofers to a JBL SRX 725 / STX 828 concert system, with Soundcraft mixing and Shure wireless microphones.'],
    ar: ['تأجير أنظمة الصوت في تورونتو', 'صوت QSC وJBL بمستوى الحفلات وميكروفونات Shure اللاسلكية', 'من سماعات QSC K12.2 ومضخمات ES18P إلى نظام JBL SRX 725 / STX 828، مع مكسر Soundcraft وميكروفونات Shure اللاسلكية.'],
  },
  'wedding-lighting-toronto': {
    en: ['Wedding Lighting Toronto', 'Moving heads, trussing and uplights', 'Intelligent moving heads, professional trussing and wireless uplights (minimum 10) to transform your venue.'],
    ar: ['إضاءة الأعراس في تورونتو', 'رؤوس متحركة وهياكل وإضاءة أرضية', 'رؤوس إضاءة ذكية متحركة وهياكل احترافية وإضاءة لاسلكية (بحد أدنى 10 وحدات) لتحويل مكان فعاليتك.'],
  },
  'special-effects-toronto': {
    en: ['Special Effects Toronto', 'Memorable entrances and unforgettable moments', 'Cold spark effects, dry ice, atmospheric smoke and CO₂ effects for weddings and celebrations. Every effect is planned around your venue requirements and an approved production plan.'],
    ar: ['مؤثرات خاصة في تورونتو', 'دخول مميز ولحظات لا تُنسى', 'شرارات باردة وثلج جاف ودخان ومؤثرات CO₂ للأعراس والاحتفالات. تُخطط المؤثرات وفق متطلبات المكان وخطة إنتاج معتمدة.'],
  },
  'corporate-event-production-toronto': {
    en: ['Corporate Event Production Toronto', 'Audio, lighting, LED, projection and MC as one production', 'Echo Event Entertainment coordinates audio, wireless microphones, lighting, LED screens, projection, announcements and MC services as one integrated production.'],
    ar: ['إنتاج فعاليات الشركات في تورونتو', 'صوت وإضاءة وLED وعرض وتقديم كإنتاج واحد', 'تنسّق إيكو الصوت والميكروفونات اللاسلكية والإضاءة وشاشات LED والعرض والتقديم كإنتاج واحد متكامل.'],
  },
};
export const SERVICE_SLUGS = Object.keys(SERVICES);

export function ServicePage({ lang, slug }) {
  const t = L(lang);
  const [title, sub, body] = SERVICES[slug][lang.lang];
  usePageMeta(`${SERVICES[slug].en[0]} | Echo Event Entertainment`, SERVICES[slug].en[2]);
  useEffect(() => {
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Service', name: SERVICES[slug].en[0],
      description: SERVICES[slug].en[2], areaServed: 'Greater Toronto Area', provider: { '@type': 'LocalBusiness', name: 'Echo Event Entertainment', address: { '@type': 'PostalAddress', addressLocality: 'Toronto', addressRegion: 'ON', addressCountry: 'CA' } } });
    document.head.appendChild(ld);
    return () => ld.remove();
  }, [slug]);
  const image = slug === 'wedding-dj-toronto' ? 'wedding-live' : slug === 'sound-system-rental-toronto' ? 'production-detail' : 'production';
  return <><section className="echo-section echo-service-detail"><div><p className="echo-eyebrow">{t('ECHO EVENT ENTERTAINMENT', 'إيكو لتنظيم وترفيه الفعاليات')}</p><h1 className="echo-h1">{title}</h1><p className="echo-kicker-dark">{sub}</p><p>{body}</p><div className="echo-ctas"><a className="echo-btn" href="/#event-order">{t('REQUEST A QUOTE', 'اطلب عرض سعر')}</a><a className="echo-text-link" href="/#services">{t('Explore setups', 'استكشف التجهيزات')}</a></div></div><figure><img src={cloudAsset(`/echo/${image}.webp`)} alt={t('Illustrative event production scene', 'مشهد فني لإنتاج الفعاليات')} /><figcaption>{t('Illustrative brand scene', 'مشهد فني للعلامة')}</figcaption></figure></section>
    <section className="echo-section echo-service-note"><h2>{t('Designed around your event.', 'مصمّم لفعاليتك.')}</h2><p>{t('Tell us about your venue, guest count, timing and vision. We coordinate the equipment, entertainment and production details in a custom quotation, with availability confirmed before booking.', 'شاركنا المكان وعدد الضيوف والتوقيت ورؤيتك. ننسّق المعدات والترفيه وتفاصيل الإنتاج في عرض سعر مخصص، ونتحقق من التوفر قبل تأكيد الحجز.')}</p><a className="echo-text-link" href="/#event-order">{t('Talk through your ideas', 'ناقش أفكارك معنا')}</a></section></>;
}

export function ServicesOverview({ lang }) {
  const t = L(lang);
  usePageMeta(t('Event Entertainment & Production Toronto | Echo', 'خدمات الترفيه وإنتاج الفعاليات | إيكو'), lang.t.intro);
  return <section className="echo-section"><div className="echo-route-intro"><p className="echo-eyebrow">{t('ENTERTAINMENT + PRODUCTION', 'الترفيه وإنتاج الفعاليات')}</p><h1 className="echo-h1">{lang.t.servicesTitle}</h1><p>{t('From the first entrance to the final track, bring every element together with one team. Choose the services that fit your event; we will prepare a quotation around your venue, guests and vision.', 'من لحظة الدخول إلى آخر أغنية، اجمع جميع التفاصيل مع فريق واحد. اختر الخدمات المناسبة لفعاليتك لنعد عرض سعر يناسب المكان والضيوف ورؤيتك.')}</p></div><ServiceCards lang={lang} /><div className="echo-draft-bar"><p>{lang.t.finalText}</p><a className="echo-btn" href="/#event-order">{lang.t.cta.quote}</a></div></section>;
}
