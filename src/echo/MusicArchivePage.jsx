import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Disc3, Music2, Play, Search } from 'lucide-react';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import { usePageMeta } from './meta';
import { archiveResults } from '../lib/archiveSearch';
import './musicArchive.css';

function Cover({ item }) { return <div className="ma-artwork">{item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <Disc3 size={64} strokeWidth={1} />}</div>; }
export default function MusicArchivePage({ lang, collectionId = '' }) {
  const ar = lang.lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;
  const [data, setData] = useState({ collections: [], songs: [] });
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('curated');
  const [retry, setRetry] = useState(0);
  usePageMeta('Music Archive | DJ Khalil — Echo Event Entertainment', 'Discover the sound. Explore DJ Khalil collections, wedding entrances, remixes and live sets.');
  useEffect(() => {
    let active = true; setStatus('loading');
    fetchMusicArchiveCatalog({refresh:retry>0}).then(result => { if (!Array.isArray(result.collections) || !Array.isArray(result.songs)) throw new Error(); if (active) { setData(result); setStatus('ready'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { setQuery(''); }, [collectionId]);
  const results = useMemo(() => archiveResults(data, { query, sort, collectionId }), [data, query, sort, collectionId]);
  const collection = data.collections.find(c => c.id === collectionId);
  const play = song => window.dispatchEvent(new CustomEvent('echo:archive-play', { detail: { id: song.id, ids: results.songs.map(s => s.id) } }));
  return <section className="echo-section ma-public" dir={ar ? 'rtl' : 'ltr'}>
    <header className="ma-heading"><div><span className="ma-eyebrow">DJ KHALIL / MUSIC ARCHIVE</span><h1>{collectionId ? collection?.title || t('Collection', 'المجموعة') : t('Discover the sound.', 'اكتشف الصوت.')}</h1><p>{collectionId ? collection?.description : t('Explore the collection. Music for every moment.', 'استكشف المجموعة. موسيقى لكل لحظة.')}</p></div>{collectionId && <a className="ma-back" href="/music-archive"><ArrowLeft size={17} />{t('All collections', 'كل المجموعات')}</a>}</header>
    {status === 'error' && <p role="alert">{t('Unable to load the collection.', 'تعذر تحميل المجموعة.')} <button type="button" onClick={() => setRetry(v => v + 1)}>{t('Try again', 'حاول مجدداً')}</button></p>}
    {status === 'loading' && <p role="status">{t('Loading the collection…', 'جارٍ تحميل المجموعة…')}</p>}
    {status === 'ready' && collectionId && !collection && <p>{t('This collection is unavailable or unpublished.', 'هذه المجموعة غير متاحة أو غير منشورة.')}</p>}
    {collection && <div className="ma-album-intro"><Cover item={collection} /><div><h2>{collection.title}</h2><p>{collection.description}</p><span>{collection.songCount} {t('tracks', 'أغاني')}</span>{results.songs.length > 0 && <button type="button" className="ma-primary" onClick={() => play(results.songs[0])}><Play size={17} />{t('Play collection', 'تشغيل المجموعة')}</button>}</div></div>}
    <div className="ma-toolbar"><label><span><Search size={14} /> {t('Search the archive', 'ابحث في الأرشيف')}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Song, artist or collection…', 'أغنية، فنان أو مجموعة…')} /></label>
      <label>{t('Sort by', 'ترتيب حسب')}<select value={sort} onChange={e => setSort(e.target.value)}><option value="curated">{t('Curated order', 'الترتيب المختار')}</option><option value="newest">{t('Newest', 'الأحدث')}</option><option value="oldest">{t('Oldest', 'الأقدم')}</option><option value="alphabetical">{t('Alphabetical', 'أبجدياً')}</option></select></label>
    </div>
    {!collectionId && <><h2 className="ma-section-title">{t('Collections', 'المجموعات')} <span>{results.collections.length}</span></h2><div className="ma-album-grid">{results.collections.map(c => <a className="ma-album-card" key={c.id} href={`/music-archive/collections/${encodeURIComponent(c.id)}`}><Cover item={c} /><div><h3>{c.title}</h3><p>{c.description}</p><small>{c.songCount} {t('tracks', 'أغاني')}</small></div></a>)}</div></>}
    <h2 className="ma-section-title">{collectionId ? t('Tracks', 'الأغاني') : query ? t('Matching songs', 'الأغاني المطابقة') : t('All recordings', 'كل التسجيلات')} <span>{results.songs.length}</span></h2>
    <div className="ma-song-grid">{results.songs.map(song => <article className="ma-song-card" key={song.id}><Cover item={song} /><div><h3>{song.title}</h3><strong>{song.artist}</strong>{song.date && <time dateTime={song.date}>{song.date}</time>}<p>{song.description}</p><button className="ma-primary" type="button" onClick={() => play(song)}><Play size={16} />{t('Play', 'تشغيل')}{song.duration && <span> · {song.duration}</span>}</button></div></article>)}</div>
    {status === 'ready' && !results.collections.length && !results.songs.length && <div className="ma-empty"><Music2 size={40} /><h2>{t('No recordings here yet', 'لا توجد تسجيلات هنا بعد')}</h2><p>{query ? t('Try another search or filter.', 'جرّب بحثاً أو تصفية أخرى.') : t('New collections will appear here when published.', 'ستظهر المجموعات الجديدة هنا عند نشرها.')}</p></div>}
  </section>;
}
