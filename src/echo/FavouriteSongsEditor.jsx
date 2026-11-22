import {useState} from 'react';
import {Check,ExternalLink,Plus,SquarePen,Trash2,X} from 'lucide-react';
import {favouriteSongEntries,isSafeLink,isYouTubeLink} from '../lib/favouriteSongs.mjs';
import YouTubeSongSearch from './YouTubeSongSearch';
import './favouriteSongsEditor.css';

export default function FavouriteSongsEditor({value=[],onChange,ar=false,disabled=false,token='',signedIn=false}){
 const tr=(en,arabic)=>ar?arabic:en;
 const [mode,setMode]=useState('youtube'),[song,setSong]=useState(''),[artist,setArtist]=useState(''),[link,setLink]=useState(''),[editing,setEditing]=useState(null);
 const entries=favouriteSongEntries(value);
 const source=Array.isArray(value)?value:entries.map(row=>row.song);
 const invalidLink=Boolean(link.trim())&&!isSafeLink(link.trim());
 // Manual entry: the song name and the artist are both needed; the link is optional and can be from anywhere.
 const canSave=!disabled&&song.trim()&&artist.trim()&&!invalidLink&&(editing!==null||entries.length<40);
 const reset=()=>{setSong('');setArtist('');setLink('');setEditing(null);};
 const save=()=>{
  if(!canSave)return;
  const entry={song:song.trim(),...(artist.trim()?{artist:artist.trim()}:{}),...(link.trim()?{link:link.trim()}:{})};
  onChange(editing===null?[...source,entry]:source.map((row,index)=>index===editing?entry:row));
  reset();
 };
 const remove=index=>{onChange(source.filter((_,at)=>at!==index));if(editing===index)reset();else if(editing!==null&&editing>index)setEditing(editing-1);};
 const addFound=entry=>{if(!disabled&&entries.length<40)onChange([...source,entry]);};
 return <div className="favourite-songs-editor">
  <div className="song-entry-modes" role="group" aria-label={tr('How to add a song','طريقة إضافة الأغنية')}><button type="button" aria-pressed={mode==='youtube'} onClick={()=>setMode('youtube')}>{tr('Search YouTube','بحث يوتيوب')}</button><button type="button" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')}>{tr('Add manually','إضافة يدوية')}</button></div>
  {mode==='youtube'&&<><YouTubeSongSearch ar={ar} token={token} signedIn={signedIn} disabled={disabled||entries.length>=40} onPick={addFound}/></>}
  {(mode==='manual'||editing!==null)&&<>
  <div className="favourite-song-fields" onKeyDown={event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'){event.preventDefault();save();}}}>
   <label><span>{tr('Song name','اسم الأغنية')}</span><input className="djf-input" type="text" maxLength={200} required value={song} disabled={disabled} onChange={event=>setSong(event.target.value)} placeholder={tr('Name of the song','اسم الأغنية')}/></label>
   <label><span>{tr('Artist name','اسم الفنان')}</span><input className="djf-input" type="text" maxLength={200} required value={artist} disabled={disabled} onChange={event=>setArtist(event.target.value)} placeholder={tr('Who performs it?','من يؤديها؟')}/></label>
   <label className="favourite-song-link"><span>{tr('Link (optional)','رابط (اختياري)')}</span><input className="djf-input" type="url" inputMode="url" maxLength={2048} value={link} disabled={disabled} onChange={event=>setLink(event.target.value)} aria-invalid={invalidLink} aria-describedby={invalidLink?'favourite-song-link-error':undefined} placeholder="https://www.youtube.com/watch?v=…" dir="ltr"/></label>
   {invalidLink&&<p id="favourite-song-link-error" className="favourite-song-error" role="status">{tr('Use a link that starts with https://.','استخدم رابطاً يبدأ بـ https://.')}</p>}
   <div className="favourite-song-actions"><button type="button" className="djf-add" disabled={!canSave} onClick={save}>{editing===null?<Plus size={15}/>:<Check size={15}/>} {editing===null?tr('Add song','أضف أغنية'):tr('Save song','احفظ الأغنية')}</button>{editing!==null&&<button type="button" className="djf-back" disabled={disabled} onClick={reset}><X size={14}/>{tr('Cancel','إلغاء')}</button>}</div>
  </div>
  </>}
  {entries.length>0&&<ol className="favourite-song-list">{entries.map((entry,index)=><li key={index}>
   <span className="djf-num" aria-hidden="true">{index+1}</span>
   <div className="favourite-song-copy"><strong>{entry.song}</strong>{entry.artist&&<span>{entry.artist}</span>}{isSafeLink(entry.link)&&<a href={entry.link} target="_blank" rel="noopener noreferrer">{isYouTubeLink(entry.link)?'YouTube':tr('Link','رابط')} <ExternalLink size={12} aria-hidden="true"/></a>}</div>
   <div className="favourite-song-row-actions"><button type="button" className="djf-back" disabled={disabled} aria-label={`${tr('Edit','تعديل')} ${entry.song}`} title={tr('Edit','تعديل')} onClick={()=>{setEditing(index);setSong(entry.song);setArtist(entry.artist);setLink(entry.link);}}><SquarePen size={16}/></button><button type="button" className="djf-back" disabled={disabled} aria-label={`${tr('Remove','إزالة')} ${entry.song}`} title={tr('Remove','إزالة')} onClick={()=>remove(index)}><Trash2 size={16}/></button></div>
  </li>)}</ol>}
 </div>;
}
