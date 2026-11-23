import {bookingFieldValue} from '../lib/bookingPresentation';
import {dialectRecord} from '../lib/dialects';
import {SONG_PHASES,optionLabel} from '../lib/djOptions';
import './musicPreferenceValue.css';

const safeLink=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
// Read the canonical values directly: never flatten song records into a recap.
export default function MusicPreferenceValue({path,value,ar=false,table=false}){
 const tr=(en,arabic)=>ar?arabic:en;
 if(Array.isArray(value)&&!value.length||value==null||value==='')return <span className="music-value-empty">{tr('Not set yet','لم يُحدّد بعد')}</span>;
 if(table&&Array.isArray(value)){ // a mini table: one row per entry, columns that fit the kind of value
  const num=index=><td className="mini-num">{index+1}</td>,head=(...labels)=><thead><tr><th className="mini-num">#</th>{labels.map(label=><th key={label}>{label}</th>)}</tr></thead>;
  if(['music.suggestedSongs','music.favouriteSongs'].includes(path)){
   const rows=value.map(entry=>{const song=typeof entry==='string'?{song:entry}:entry,parts=String(song.song||'').split(/\s+[–—]\s+/u),separated=!song.artist&&parts.length===2;return {title:separated?parts[0]:song.song,artist:song.artist||(separated?parts[1]:''),phase:song.phase,link:safeLink(song.link),raw:song.song};}),moments=rows.some(row=>row.phase);
   return <table className="mini-table">{head(tr('Song','الأغنية'),tr('Artist','الفنان'),...(moments?[tr('Moment','اللحظة')]:[]),tr('Link','الرابط'))}<tbody>{rows.map((row,index)=><tr key={index}>{num(index)}<td dir="auto"><strong>{row.title}</strong></td><td dir="auto">{row.artist||'—'}</td>{moments&&<td>{row.phase?optionLabel(SONG_PHASES,row.phase,ar):'—'}</td>}<td>{row.link?<a href={row.link} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>{tr('Listen','استمع')}<span className="music-link-arrow" aria-hidden="true"> ↗</span><span className="music-sr">: {row.raw}</span></a>:'—'}</td></tr>)}</tbody></table>;
  }
  if(path==='music.languagePairs')return <table className="mini-table">{head(tr('Language','اللغة'),tr('Dialect','اللهجة'))}<tbody>{value.map((item,index)=><tr key={index}>{num(index)}<td dir="auto"><strong>{item.language}</strong></td><td dir="auto">{item.dialect||'—'}</td></tr>)}</tbody></table>;
  return <table className="mini-table">{head(tr('Name','الاسم'))}<tbody>{value.map((item,index)=>{const dialect=path==='music.dialects'?dialectRecord(item):null;return <tr key={index}>{num(index)}<td dir="auto">{dialect?ar?dialect.display_name_ar:dialect.display_name:bookingFieldValue({},path,ar,[item])}</td></tr>;})}</tbody></table>;
 }
 if(['music.suggestedSongs','music.favouriteSongs'].includes(path))return <span className="music-song-list" role="list">{(Array.isArray(value)?value:[value]).map((entry,index)=>{
  const song=typeof entry==='string'?{song:entry}:entry,link=safeLink(song.link);
  const parts=String(song.song||'').split(/\s+[–—]\s+/u),separated=!song.artist&&parts.length===2;
  const title=separated?parts[0]:song.song,artist=song.artist||(separated?parts[1]:'');
  return <span className="music-song" role="listitem" key={index}>
   {song.phase&&<span className="music-song-moment">{optionLabel(SONG_PHASES,song.phase,ar)}</span>}
   <strong className="music-song-title" dir="auto">{title}</strong>
   {artist&&<span className="music-song-artist" dir="auto">{artist}</span>}
   {link&&<a href={link} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>{tr('Listen','استمع')}<span className="music-link-arrow" aria-hidden="true"> ↗</span><span className="music-sr">: {song.song}</span></a>}
  </span>;
 })}</span>;
 if(path==='music.languagePairs')return <span className="music-language-list" role="list">{value.map((item,index)=><span className="music-language" role="listitem" key={index}><strong dir="auto">{item.language}</strong>{item.dialect&&<span dir="auto">{item.dialect}</span>}</span>)}</span>;
 if(Array.isArray(value))return <span className="music-value-list" role="list">{value.map((item,index)=>{const dialect=path==='music.dialects'?dialectRecord(item):null;return <span role="listitem" key={index} dir="auto">{dialect?ar?dialect.display_name_ar:dialect.display_name:bookingFieldValue({},path,ar,[item])}</span>;})}</span>;
 return <span className="music-value-text" dir="auto">{bookingFieldValue({},path,ar,value)}</span>;
}
