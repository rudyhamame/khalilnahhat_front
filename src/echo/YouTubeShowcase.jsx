import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

// Curated from Khalil's official channel, verified 2026-10-13.
const CHANNEL = 'https://www.youtube.com/@djkhalilnahhat8943';
const VIDEOS = [
  { id: 'R_cGXiUToJg', title: 'Khawa — DJ Khalil Remix' },
  { id: 'vvEcoXn22mw', title: 'Bab Al Hara — Full Remix' },
  { id: 'jS57i-d2jsY', title: 'Wafeek Habib — Esh Maana Remix' },
  { id: 'hd9lm4fDFz0', title: 'Helwe El Dnye — Afrohouse Remix' },
];
const SHORTS = [
  { id: 'EQLyKuGfZ4E', title: 'Two tracks. One live mix.' },
  { id: 'lcQK5jJy0LQ', title: 'Reading the dance floor' },
  { id: '1QhHVLr0V34', title: 'I Know You Want Me × Ta3al' },
  { id: 'PZye0PL6x9Q', title: 'DJ & Music Production Room' },
];

function ChannelPlayer({ items, short, lang }) {
  const [index, setIndex] = useState(0);
  const ar = lang.lang === 'ar';
  const item = items[index];
  const label = short ? 'Shorts' : (ar ? 'فيديوهات' : 'Videos');
  const move = (step) => setIndex((current) => (current + step + items.length) % items.length);
  return <article className={`echo-channel-player${short ? ' is-short' : ''}`} aria-label={label}>
    <div className="echo-channel-toolbar"><strong>{label}</strong><span>{index + 1} / {items.length}</span><div>
      <button type="button" aria-label={ar ? `السابق — ${label}` : `Previous ${label}`} onClick={() => move(-1)}><ChevronLeft size={16} /></button>
      <button type="button" aria-label={ar ? `التالي — ${label}` : `Next ${label}`} onClick={() => move(1)}><ChevronRight size={16} /></button>
    </div></div>
    <iframe key={item.id} src={`https://www.youtube-nocookie.com/embed/${item.id}?rel=0&playsinline=1&hl=${ar ? 'ar' : 'en'}`} title={`DJ Khalil ${label}: ${item.title}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
    <a className="echo-channel-title" href={`https://www.youtube.com/${short ? 'shorts/' : 'watch?v='}${item.id}`} target="_blank" rel="noopener noreferrer">{item.title}<ArrowUpRight size={13} aria-hidden="true" /></a>
  </article>;
}

export default function YouTubeShowcase({ lang }) {
  const [kind, setKind] = useState('videos');
  return <section className="echo-youtube-showcase" aria-label={lang.lang === 'ar' ? 'فيديوهات دي جي خليل وShorts' : 'DJ Khalil videos and Shorts'}>
    <div className="echo-youtube-heading"><p>{lang.t.tagline}</p><a href={CHANNEL} target="_blank" rel="noopener noreferrer">YouTube<ArrowUpRight size={13} aria-hidden="true" /></a></div>
    <div className="echo-youtube-mobile-tabs" aria-label={lang.lang === 'ar' ? 'نوع الفيديو' : 'Video format'}><button type="button" aria-pressed={kind === 'videos'} onClick={() => setKind('videos')}>{lang.lang === 'ar' ? 'فيديوهات' : 'Videos'}</button><button type="button" aria-pressed={kind === 'shorts'} onClick={() => setKind('shorts')}>Shorts</button></div>
    <div className={`echo-youtube-players show-${kind}`}><ChannelPlayer items={VIDEOS} lang={lang} /><ChannelPlayer items={SHORTS} short lang={lang} /></div>
  </section>;
}
