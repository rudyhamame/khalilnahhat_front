const text=value=>Array.isArray(value)?value.join(', '):value==null?'':String(value);
const duration=value=>{if(value==null)return '';const seconds=Math.round(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
const date=value=>/^\d{8}$/.test(value||'')?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:text(value);
export default function RequestSongMetadata({item,busy,fetching,onFetch}){
 const source=item.youtubeMetadata||{};
 const musical=[['Title',item.track==='Song request'?(source.track||source.title||item.track):item.track],['Artist',item.artist||source.artist],['Duration',item.duration||duration(source.durationSec)],['Album',source.album],['Genre',item.genres||item.genre],['Subgenres',item.subgenres],['BPM',item.bpm],['Key',item.musicalKey],['Language',item.language||source.language],['Mood',item.musicMoods||item.mood],['Instruments',item.instruments],['Vocals',item.vocals],['Energy',item.energy],['Beat',item.beat],['Themes',item.themes],['Explicit',item.explicit]];
 const video=[['YouTube title',source.title],['Video ID',source.videoId],['Channel',source.channel],['Uploader',source.uploader],['Published',date(source.uploadDate)],['Release date',date(source.releaseDate)],['Categories',source.categories],['Tags',source.tags],['Views',source.viewCount],['Likes',source.likeCount],['License',source.license],['Age rating',source.ageLimit==null?'':`${source.ageLimit}+`],['Source codec',source.audioCodec],['Source sample rate',source.audioSampleRate==null?'':`${source.audioSampleRate} Hz`],['Source bitrate',source.audioBitrate==null?'':`${source.audioBitrate} kbps`]];
 return <details className="ar-song-details"><summary>Song metadata <span>{source.fetchedAt?'YouTube details saved':'View available details'}</span></summary>
  <dl className="ar-song-metadata">{musical.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{text(value)||<span className="ar-metadata-missing">Not provided</span>}</dd></div>)}{video.filter(([,value])=>text(value)).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl>
  {source.description&&<div className="ar-metadata-description"><strong>YouTube description</strong><p>{source.description}</p></div>}
  {item.sourcePlatform==='youtube'&&item.sourceUrl&&<button type="button" className="ar-button" disabled={busy} onClick={onFetch}>{fetching?'Fetching metadata…':source.fetchedAt?'Refresh YouTube metadata':'Fetch YouTube metadata'}</button>}
 </details>;
}
