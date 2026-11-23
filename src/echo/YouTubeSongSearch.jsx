import {useRef,useState} from 'react';
import {Check,Play,Search,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {songFromVideo} from '../lib/youtubeSong.mjs';
import './favouriteSongsEditor.css';

const clock=value=>{const m=String(value||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!m)return '';const seconds=Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
// Way 1 of adding a song: search YouTube and pick the result. The song name, artist and link come from the video, so the client types nothing else.
export default function YouTubeSongSearch({token,disabled=false,ar=false,onPick,initial,onState}){
 const tr=(en,arabic)=>ar?arabic:en;
 const [query,setQuery]=useState(initial?.query||''),[results,setResults]=useState(initial?.results||[]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(Boolean(initial?.searched)),[picked,setPicked]=useState(()=>new Set()),[previewId,setPreviewId]=useState(null),latest=useRef(0);
 const search=async event=>{
  event.preventDefault();if(disabled||query.trim().length<2)return;
  const id=++latest.current;setBusy(true);setError('');
  try{const data=await apiRequest(`/youtube/search?q=${encodeURIComponent(query.trim())}`,{token});if(latest.current===id){setResults(data.items||[]);setSearched(true);onState?.({query:query.trim(),results:data.items||[],searched:true});}}
  catch{if(latest.current===id){setResults([]);setSearched(true);setError(tr('YouTube search is not available right now. Add the song manually instead.','بحث يوتيوب غير متاح حالياً. أضف الأغنية يدوياً.'));}}
  finally{if(latest.current===id)setBusy(false);}
 };
 const pick=item=>{onPick(songFromVideo(item));setPicked(current=>new Set(current).add(item.id));};
 return <>
  <form className="youtube-search-form" onSubmit={search} role="search"><input className="djf-input" type="search" maxLength={120} value={query} disabled={disabled} onChange={event=>setQuery(event.target.value)} placeholder={tr('Search the song on YouTube','ابحث عن الأغنية في يوتيوب')} aria-label={tr('Search the song on YouTube','ابحث عن الأغنية في يوتيوب')}/><button type="submit" className="djf-add" disabled={disabled||!signedIn||busy||query.trim().length<2}><Search size={15} aria-hidden="true"/>{busy?tr('Searching…','جارٍ البحث…'):tr('Search','بحث')}</button></form>
  {error&&<p className="favourite-song-error" role="status">{error}</p>}
  {searched&&!error&&!results.length&&<p className="djf-empty">{tr('Nothing found. Try other words, or add the song manually.','لا نتائج. جرّب كلمات أخرى أو أضف الأغنية يدوياً.')}</p>}
  {results.length>0&&<ul className="youtube-results">{results.map(item=>{const entry=songFromVideo(item),done=picked.has(item.id);return <li key={item.id}><button type="button" className="yt-preview-btn" aria-pressed={previewId===item.id} aria-label={`${previewId===item.id?tr('Close preview','إغلاق المعاينة'):tr('Preview','معاينة')} ${entry.song}`} onClick={()=>setPreviewId(current=>current===item.id?null:item.id)}>{item.thumbnail&&<img src={item.thumbnail} alt="" width="64" height="36" loading="lazy"/>}<span aria-hidden="true">{previewId===item.id?<X size={16}/>:<Play size={16}/>}</span></button><span className="youtube-result-copy"><strong>{entry.song}</strong><small>{entry.artist}{clock(item.duration)?` · ${clock(item.duration)}`:''}</small></span><button type="button" className="djf-add" disabled={disabled||done} onClick={()=>pick(item)}>{done?<Check size={14} aria-hidden="true"/>:null}{done?tr('Added','تمت الإضافة'):tr('Use this song','استخدم هذه الأغنية')}</button>{previewId===item.id&&<div className="yt-preview"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?autoplay=1&rel=0`} title={entry.song} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>}</li>;})}</ul>}
 </>;
}
