import { useRef, useState } from 'react';
import { Check, Link2, Music2, Search, Send, PlaySquare } from 'lucide-react';
import { apiRequest } from '../lib/api';

const cleanTitle = (value) => String(value || '').replace(/&(amp|quot|apos|lt|gt|#39);/g, (_, entity) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'" })[entity]);

function duration(value) {
  const m = String(value || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const seconds = Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export default function LiveSongRequest({ live, ar }) {
  const [method, setMethod] = useState('name');
  const [track, setTrack] = useState(''); const [artist, setArtist] = useState('');
  const [link, setLink] = useState(''); const [linkTitle, setLinkTitle] = useState('');
  const [name, setName] = useState(''); const [note, setNote] = useState('');
  const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [selection, setSelection] = useState(null);
  const [searching, setSearching] = useState(false); const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(''); const [sending, setSending] = useState(false);
  const requestId = useRef(0);
  const search = async (event) => {
    event.preventDefault(); if (query.trim().length < 2) return;
    const id = ++requestId.current; setSearching(true); setSearchError(''); setSelection(null);
    try { const data = await apiRequest(`/youtube/search?q=${encodeURIComponent(query.trim())}`); if (requestId.current === id) { setResults((data.items || []).map((item) => ({ ...item, title: cleanTitle(item.title) })));  setSearched(true); } }
    catch (e) { if (requestId.current === id) { setResults([]); setSearchError(ar ? 'البحث غير متاح حالياً. يمكنك إرسال اسم الأغنية أو رابطها.' : `${e.message} You can still request by song name or link.`); } }
    finally { if (requestId.current === id) setSearching(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); if (!live || sending) return;
    setError(''); setSent(''); setSending(true);
    const sourceUrl = method === 'youtube' ? selection?.url || '' : method === 'link' ? link.trim() : '';
    const title = method === 'name' ? track.trim() : method === 'link' ? linkTitle.trim() : selection?.title || '';
    try {
      const result = await apiRequest('/live-suggestions', { method: 'POST', body: { requesterName: name.trim(), track: title, artist: method === 'name' ? artist.trim() : '', sourceUrl, note: note.trim() } });
      setSent(result.confirmationCode); setTrack(''); setArtist(''); setLink(''); setLinkTitle(''); setNote(''); setSelection(null); setResults([]); setSearched(false);
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };
  const ready = method === 'name' ? Boolean(track.trim()) : method === 'link' ? /^https:\/\//i.test(link.trim()) : Boolean(selection);
  return <aside className="echo-song-request" aria-labelledby="song-request-title">
    <div className="echo-request-title"><Music2 size={22} /><div><span className="echo-eyebrow">{ar ? 'لكل مستمع إيقاع' : 'YOUR SONG. OUR NEXT MOMENT.'}</span><h2 id="song-request-title">{ar ? 'اطلب أغنيتك' : 'Request a song'}</h2></div></div>
    <p>{ar ? 'اختر أغنية وأرسلها مباشرة إلى خليل.' : 'Send your pick straight to Khalil’s live studio.'}</p>
    <div className="echo-request-methods" role="group" aria-label={ar ? 'طريقة الطلب' : 'Song request method'}>
      {[['name', Music2, ar ? 'اسم الأغنية' : 'Song name'], ['link', Link2, ar ? 'رابط الأغنية' : 'Song link'], ['youtube', PlaySquare, ar ? 'بحث يوتيوب' : 'YouTube']].map(([key, Icon, label]) => <button type="button" key={key} aria-pressed={method === key} onClick={() => { requestId.current++; setSearching(false); setMethod(key); setError(''); setSent(''); }}><Icon size={16} />{label}</button>)}
    </div>
    {sent && <div className="echo-request-success" role="status"><Check size={20} /><div><strong>{ar ? 'وصل طلبك إلى خليل' : 'Your request is with Khalil.'}</strong><small>{sent} · {ar ? 'بانتظار المراجعة' : 'Awaiting his review'}</small></div></div>}
    {method === 'youtube' && <div className="echo-youtube-search"><form onSubmit={search}><label htmlFor="song-search">{ar ? 'ابحث عن أغنية أو فنان' : 'Find a song or artist'}</label><div><input id="song-search" type="search" maxLength={150} value={query} onChange={(e) => { requestId.current++; setQuery(e.target.value); setSearching(false); setResults([]); setSearched(false); setSelection(null); }} placeholder={ar ? 'اسم الأغنية أو الفنان' : 'Song title or artist'} /><button type="submit" aria-label={ar ? 'بحث يوتيوب' : 'Search YouTube'} disabled={searching || query.trim().length < 2}>{searching ? '…' : <Search size={18} />}</button></div></form>
      {searchError && <p role="alert">{searchError}</p>}
      {searched && !results.length && !searchError && <p role="status">{ar ? 'لا توجد نتائج.' : 'No matches. Try another song or artist.'}</p>}
      <div className="echo-youtube-results" aria-label={ar ? 'نتائج بحث يوتيوب' : 'YouTube song results'}>{results.map((item) => <button type="button" className={selection?.id === item.id ? 'is-selected' : ''} aria-pressed={selection?.id === item.id} key={item.id} onClick={() => { setSelection(item); setSent(''); }}><img src={item.thumbnail} alt="" loading="lazy" /><span><strong>{item.title}</strong><small>{item.channelTitle}{duration(item.duration) ? ` · ${duration(item.duration)}` : ''}</small></span>{selection?.id === item.id && <Check size={18} />}</button>)}</div>
      {selection && <p className="echo-song-selected"><Check size={15} />{ar ? 'تم اختيار الأغنية. أرسل طلبك أدناه.' : 'Song selected. Send your request below.'}</p>}
    </div>}
    <form className="echo-song-form" onSubmit={submit}>
      {method === 'name' && <><label>{ar ? 'اسم الأغنية' : 'Song name'}<input required maxLength={200} value={track} onChange={(e) => { setTrack(e.target.value); setSent(''); }} placeholder={ar ? 'ما الأغنية التي تريد سماعها؟' : 'What do you want to hear?'} /></label><label>{ar ? 'الفنان (اختياري)' : 'Artist (optional)'}<input maxLength={120} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={ar ? 'اسم الفنان' : 'Help us find the right version'} /></label></>}
      {method === 'link' && <><label>{ar ? 'رابط الأغنية' : 'Song link'}<input required type="url" inputMode="url" maxLength={2048} value={link} onChange={(e) => { setLink(e.target.value); setSent(''); }} placeholder="https://youtube.com/watch?v=…" /></label><label>{ar ? 'اسم الأغنية (اختياري)' : 'Song title (optional)'}<input maxLength={200} value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder={ar ? 'اسم الأغنية' : 'A title helps Khalil spot your song'} /></label></>}
      <label>{ar ? 'اسمك (اختياري)' : 'Your name (optional)'}<input autoComplete="given-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? 'كيف نناديك؟' : 'Who’s this one for?'} /></label>
      <label>{ar ? 'ملاحظة أو إهداء (اختياري)' : 'Note or dedication (optional)'}<input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? 'رسالة قصيرة لخليل' : 'A little context for Khalil'} /></label>
      {error && <p role="alert" className="echo-request-error">{error}</p>}
      <button className="echo-request-send" type="submit" disabled={!live || !ready || sending}><Send size={17} />{sending ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : ar ? 'أرسل إلى خليل' : 'Send to Khalil'}</button>
      <small className="echo-request-guidance">{!live ? (ar ? 'تُفتح الطلبات عند بدء البث المباشر.' : 'Requests open when Khalil goes live.') : (ar ? 'الطلبات مجانية وتخضع لمراجعة خليل.' : 'Free to request. Khalil reviews every song.')}</small>
    </form>
  </aside>;
}
