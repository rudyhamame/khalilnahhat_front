import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import ProjectChatVoicePlayer from './ProjectChatVoicePlayer';

// History contains only metadata. Download private media once when it is used,
// rather than sending every voice note again with each chat refresh.
export default function ProjectChatAttachment({message,token}) {
 const attachment=message.attachment,root=useRef(null),cached=useRef(null);
 const [image,setImage]=useState(attachment.data||''),[error,setError]=useState('');
 const load=useCallback(async()=>{
  if(attachment.data)return attachment.data;
  if(!cached.current)cached.current=apiRequest(`/echo-project-chat/${message.id}/attachment`,{token}).then(result=>{
   if(!result.attachment?.data)throw new Error('Attachment is no longer available.');
   return result.attachment.data;
  }).catch(cause=>{cached.current=null;throw cause;});
  return cached.current;
 },[attachment.data,message.id,token]);
 useEffect(()=>{
  if(attachment.type!=='image'||image)return;
  let cancelled=false,observer;
  const show=()=>{observer?.disconnect();load().then(src=>{if(!cancelled){setImage(src);setError('');}}).catch(cause=>{if(!cancelled)setError(cause.message);});};
  if(typeof IntersectionObserver==='undefined')show();
  else{observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))show();});observer.observe(root.current);}
  return()=>{cancelled=true;observer?.disconnect();};
 },[attachment.type,image,load]);
 if(attachment.type==='audio')return <ProjectChatVoicePlayer label={`Voice note from ${message.senderName}`} loadSource={load}/>;
 return <div ref={root}>
  {image?<img src={image} alt={attachment.name||'Shared image'} loading="lazy"/>:error?<button type="button" onClick={()=>{setError('');load().then(setImage).catch(cause=>setError(cause.message));}}>Retry image</button>:<span>Loading image…</span>}
  {error&&<span role="status">{error}</span>}
 </div>;
}
