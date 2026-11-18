import RecordingLoadingHint from './RecordingLoadingHint';
import {useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
// The audio's identity: SHA-256 of its bytes. Uploads are stored under this name, so identical audio is stored once.
const fromUrl=url=>/\/khalil\/assets\/[^/]+\/([0-9a-f]{64})\.[a-z0-9]+(?:$|\?)/i.exec(String(url||''))?.[1]?.toLowerCase()||'';
export const audioHash=fromUrl;
const publicIdOf=url=>/(khalil\/assets\/[^/]+\/[0-9a-f]{64})\.[a-z0-9]+(?:$|\?)/i.exec(String(url||''))?.[1]||'';
const versionOf=url=>/\/v(\d+)\//.exec(String(url||''))?.[1]||'';
// Whether the channel list is open outlives any re-render or remount of the panel (it was closing and reopening on its own).
let channelsOpen=false;
function IdRow({label,hint,value,title}){
 const [copied,setCopied]=useState(false);
 if(!value)return null;
 return <div className="recording-audio-id-row"><span>{label}{hint&&<small>{hint}</small>}</span><code title={title||value}>{value}</code><button type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} onClick={()=>{navigator.clipboard?.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1500);}}>{copied?<Check size={14}/>:<Copy size={14}/>}</button></div>;
}
// Every identifier the audio has: its content fingerprint, where it is stored, the recording that owns it, and one ID per separated channel.
export default function RecordingAudioId({url,file,usedBy,recordingId='',stems=[]}){
 const [hash,setHash]=useState(fromUrl(url)),[calculating,setCalculating]=useState(false),lastChannels=useRef([]);
 window.__layoutLog?.(`AudioId render  calc=${calculating} hash=${hash.slice(0,6)} stems=${(stems||[]).length} usedBy=${usedBy||'-'}`);
 useEffect(()=>{
  window.__layoutLog?.(`AudioId effect  url=${String(url).slice(-18)} file=${file?file.size:'-'}`);
  let live=true;const known=fromUrl(url);
  setCalculating(false);
  if(known){setHash(known);return undefined;}
  setHash('');
  if(file){setCalculating(true);file.arrayBuffer().then(bytes=>crypto.subtle.digest('SHA-256',bytes)).then(digest=>{if(live)setHash(Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''));}).catch(()=>{}).finally(()=>{if(live)setCalculating(false);});}
  return()=>{live=false;};
 },[url,file]);
 if(!url)return null;
 const fresh=(stems||[]).map(channel=>({name:channel.name,hash:fromUrl(channel.storedUrl||channel.url),publicId:publicIdOf(channel.storedUrl||channel.url)})).filter(channel=>channel.hash);
 // A momentarily empty channel list (while the stems reload) keeps the last good one, so the list never disappears and reappears.
 if(fresh.length)lastChannels.current=fresh;
 const channels=fresh.length?fresh:(stems===null||stems===undefined?[]:lastChannels.current);
 const publicId=publicIdOf(url),version=versionOf(url);
 return <div className="recording-audio-id"><RecordingLoadingHint message={calculating?'Calculating audio ID…':''}/>
  <IdRow label="Audio ID" hint="SHA-256 of the audio file" value={hash} title="SHA-256 fingerprint of the audio file: the same audio always has the same ID, so it is stored once. It is not the recording\u2019s own ID."/>
  <IdRow label="Storage ID" hint="Cloudinary public ID" value={publicId}/>
  <IdRow label="Storage version" hint="Cloudinary" value={version}/>
  <IdRow label="Recording ID" hint="owner of this audio" value={recordingId}/>
  {channels.length>0&&<details className="recording-audio-id-channels" open={channelsOpen} onToggle={event=>{channelsOpen=event.currentTarget.open;}}><summary>Channel IDs <small>{channels.length} channels</small></summary>
   <div className="recording-audio-id-channel-list">{channels.map(channel=><IdRow key={channel.name} label={`${channel.name[0].toUpperCase()}${channel.name.slice(1)}`} hint="SHA-256 of the channel file" value={channel.hash}/>)}</div>
  </details>}
  {!hash&&!calculating&&<p className="recording-audio-id-empty">Audio ID unavailable</p>}
  {usedBy&&<small role="status" className="recording-audio-id-used">Already used by “{usedBy}”.</small>}
 </div>;
}
