import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Disc3, Music2, Play, Search } from 'lucide-react';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import { usePageMeta } from './meta';
import { archiveResults } from '../lib/archiveSearch';
import './musicArchive.css';

function Cover({ item }) { return <div className="ma-artwork">{item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <Disc3 size={64} strokeWidth={1} />}</div>; }
export default function MusicArchivePage({ lang, albumId = '' }) {
  const ar = lang.lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;
  const [data, setData] = useState({ categories: [], albums: [], songs: [] });
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('curated');
  const [retry, setRetry] = useState(0);
  usePageMeta('Music Archive | DJ Khalil — Echo Event Entertainment', 'Discover the sound. Explore DJ Khalil albums, wedding entrances, remixes and live sets.');
  useEffect(() => {
    let active = true; setStatus('loading');
    fetchMusicArchiveCatalog({refresh:retry>0}).then(result => { if (!Array.isArray(result.albums) || !Array.isArray(result.songs)) throw new Error(); if (active) { setData(result); setStatus('ready'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { setQuery(''); setCategory(''); setYear(''); }, [albumId]);
  const results = useMemo(() => archiveResults(data, { query, category, year, sort, albumId }), [data, query, category, year, sort, albumId]);
  const album = data.albums.find(a => a.id === albumId);
  const years = [...new Set([...data.albums.map(a => a.year), ...data.songs.filter(s => !s.albumId).map(s => s.date?.slice(0, 4))].filter(Boolean).map(String))].sort().reverse();
  const play = song => window.dispatchEvent(new CustomEvent('echo:archive-play', { detail: { id: song.id, ids: results.songs.map(s => s.id) } }));
  return <section className="echo-section ma-public" dir={ar ? 'rtl' : 'ltr'}>
    <header className="ma-heading"><div><span className="ma-eyebrow">DJ KHALIL / MUSIC ARCHIVE</span><h1>{albumId ? album?.title || t('Album', 'الألبوم') : t('Discover the sound.', 'اكتشف الصوت.')}</h1><p>{albumId ? album?.description : t('Explore the collection. Music for every moment.', 'استكشف المجموعة. موسيقى لكل لحظة.')}</p></div>{albumId && <a className="ma-back" href="/music-archive"><ArrowLeft size={17} />{t('All albums', 'كل الألبومات')}</a>}</header>
    {status === 'error' && <p role="alert">{t('Unable to load the collection.', 'تعذر تحميل المجموعة.')} <button type="button" onClick={() => setRetry(v => v + 1)}>{t('Try again', 'حاول مجدداً')}</button></p>}
    {status === 'loading' && <p role="status">{t('Loading the collection…', 'جارٍ تحميل المجموعة…')}</p>}
    {status === 'ready' && albumId && !album && <p>{t('This album is unavailable or unpublished.', 'هذا الألبوم غير متاح أو غير منشور.')}</p>}
    {album && <div className="ma-album-intro"><Cover item={album} /><div><span className="ma-eyebrow">{data.categories.find(c => c.id === album.categoryId)?.title}</span><h2>{album.title}</h2><p>{album.description}</p><span>{album.year} · {album.songCount} {t('tracks', 'أغاني')}</span>{results.songs.length > 0 && <button type="button" className="ma-primary" onClick={() => play(results.songs[0])}><Play size={17} />{t('Play album', 'تشغيل الألبوم')}</button>}</div></div>}
    <div className="ma-toolbar"><label><span><Search size={14} /> {t('Search the archive', 'ابحث في الأرشيف')}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Song, artist, album, category or year…', 'أغنية، فنان، ألبوم، فئة أو سنة…')} /></label>
      {!albumId && <><label>{t('Category', 'الفئة')}<select value={category} onChange={e => setCategory(e.target.value)}><option value="">{t('All categories', 'كل الفئات')}</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>{t('Year', 'السنة')}<select value={year} onChange={e => setYear(e.target.value)}><option value="">{t('All years', 'كل السنوات')}</option>{years.map(y => <option key={y}>{y}</option>)}</select></label></>}
      <label>{t('Sort by', 'ترتيب حسب')}<select value={sort} onChange={e => setSort(e.target.value)}><option value="curated">{t('Curated order', 'الترتيب المختار')}</option><option value="newest">{t('Newest', 'الأحدث')}</option><option value="oldest">{t('Oldest', 'الأقدم')}</option><option value="alphabetical">{t('Alphabetical', 'أبجدياً')}</option></select></label>
    </div>
    {!albumId && <><h2 className="ma-section-title">{t('Albums', 'الألبومات')} <span>{results.albums.length}</span></h2><div className="ma-album-grid">{results.albums.map(a => <a className="ma-album-card" key={a.id} href={`/music-archive/albums/${encodeURIComponent(a.id)}`}><Cover item={a} /><div><span className="ma-eyebrow">{data.categories.find(c => c.id === a.categoryId)?.title}</span><h3>{a.title}</h3><p>{a.description}</p><small>{a.year ? `${a.year} · ` : ''}{a.songCount} {t('tracks', 'أغاني')}</small></div></a>)}</div></>}
    <h2 className="ma-section-title">{albumId ? t('Tracks', 'الأغاني') : query || category || year ? t('Matching songs', 'الأغاني المطابقة') : t('All recordings', 'كل التسجيلات')} <span>{results.songs.length}</span></h2>
    <div className="ma-song-grid">{results.songs.map(song => <article className="ma-song-card" key={song.id}><Cover item={song} /><div><h3>{song.title}</h3><strong>{song.artist}</strong>{song.date && <time dateTime={song.date}>{song.date}</time>}<p>{song.description}</p><button className="ma-primary" type="button" onClick={() => play(song)}><Play size={16} />{t('Play', 'تشغيل')}{song.duration && <span> · {song.duration}</span>}</button></div></article>)}</div>
    {status === 'ready' && !results.albums.length && !results.songs.length && <div className="ma-empty"><Music2 size={40} /><h2>{t('No recordings here yet', 'لا توجد تسجيلات هنا بعد')}</h2><p>{query || category || year ? t('Try another search or filter.', 'جرّب بحثاً أو تصفية أخرى.') : t('New collections will appear here when published.', 'ستظهر المجموعات الجديدة هنا عند نشرها.')}</p></div>}
  </section>;
}
