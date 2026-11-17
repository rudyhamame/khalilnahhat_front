import {bookingFieldValue} from '../lib/bookingPresentation';
import {dialectRecord} from '../lib/dialects';
import {SONG_PHASES,optionLabel} from '../lib/djOptions';
import './musicPreferenceValue.css';

const safeLink=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
// Read the canonical values directly: never flatten song records into a recap.
export default function MusicPreferenceValue({path,value,ar=false}){
 const tr=(en,arabic)=>ar?arabic:en;
 if(Array.isArray(value)&&!value.length||value==null||value==='')return <span className="music-value-empty">{tr('Not set yet','لم يُحدّد بعد')}</span>;
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
