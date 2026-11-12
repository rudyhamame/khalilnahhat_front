import {useEffect,useState} from 'react';
import {Check,Copy} from 'lucide-react';
// The audio's identity: SHA-256 of its bytes. Uploads are stored under this name, so identical audio is stored once.
const fromUrl=url=>/\/khalil\/assets\/[^/]+\/([0-9a-f]{64})\.[a-z0-9]+(?:$|\?)/i.exec(String(url||''))?.[1]?.toLowerCase()||'';
export const audioHash=fromUrl;
export default function RecordingAudioId({url,file,usedBy}){
 const [hash,setHash]=useState(fromUrl(url)),[copied,setCopied]=useState(false);
 useEffect(()=>{
  let live=true;const known=fromUrl(url);
  if(known){setHash(known);return undefined;}
  setHash('');
  if(file)file.arrayBuffer().then(bytes=>crypto.subtle.digest('SHA-256',bytes)).then(digest=>{if(live)setHash(Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''));}).catch(()=>{});
  return()=>{live=false;};
 },[url,file]);
 if(!url)return null;
 return <div className="recording-audio-id"><span>Audio ID</span><code title={hash||'Calculating…'}>{hash||'Calculating…'}</code>{hash&&<button type="button" aria-label="Copy the audio ID" title="Copy the audio ID" onClick={()=>{navigator.clipboard?.writeText(hash);setCopied(true);setTimeout(()=>setCopied(false),1500);}}>{copied?<Check size={14}/>:<Copy size={14}/>}</button>}{usedBy&&<small role="status">Already used by “{usedBy}”.</small>}</div>;
}
