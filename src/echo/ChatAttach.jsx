import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Paperclip,Image as ImageIcon,FileText} from 'lucide-react';
import {pendingUrl,stageFile} from '../lib/pendingFiles';
import {EVENT_FILE_LIMITS,checkEventFile} from '../lib/eventFileLimits';
import {duplicateAttachmentHash,hashFile} from '../lib/photoHash';

// The paperclip of the Echo AI conversation: add inspiration photos or event documents (and nothing else), within the quantity and size limits.
export default function ChatAttach({ctx,ar=false,disabled=false,onAdded}){
 const tr=(en,arabic)=>ar?arabic:en,[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[menuPosition,setMenuPosition]=useState(null);
 const button=useRef(null),photoInput=useRef(null),fileInput=useRef(null),inputs={photo:photoInput,file:fileInput},menuId=useId();
 const count=kind=>ctx?.order?.references?.[EVENT_FILE_LIMITS[kind].field]?.length||0;
 const pick=async(kind,list)=>{
  const files=[...(list||[])];if(!files.length)return;
  setBusy(true);setError('');setOpen(false);
  const field=EVENT_FILE_LIMITS[kind].field;
  let saved=[...(ctx.getOrder().references?.[field]||[])];
  try{
   for(const file of files){
    const problem=checkEventFile(file,kind,saved.length,ar);
    if(problem){setError(problem);break;}
    const contentHash=await hashFile(file);
    if(duplicateAttachmentHash(saved,contentHash)){setError(kind==='photo'?tr('This photo is already attached.','هذه الصورة مرفقة بالفعل.'):tr('This document is already attached.','هذا المستند مرفق بالفعل.'));continue;}
    await stageFile(contentHash,file);
    const url=pendingUrl(contentHash),name=file.name;
    saved=[...saved,{url,name,comment:'',sha256:contentHash,size:file.size}];
    ctx.setField('references.'+field,saved);
    onAdded?.(kind,{url,name});
   }
  }catch(failure){setError(failure.message||tr('The upload failed. Please try again.','فشل الرفع. حاول مرة أخرى.'));}
  finally{setBusy(false);}
 };
 const placeMenu=useCallback(()=>{
  const rect=button.current?.getBoundingClientRect();if(!rect)return;
  const width=Math.min(260,Math.max(230,window.innerWidth-24)),edge=12;
  const preferred=ar?rect.right-width:rect.left;
  setMenuPosition({width,left:Math.max(edge,Math.min(preferred,window.innerWidth-width-edge)),bottom:Math.max(edge,window.innerHeight-rect.top+8)});
 },[ar]);
 useLayoutEffect(()=>{if(open)placeMenu();},[open,placeMenu]);
 useEffect(()=>{
  if(!open)return undefined;
  const close=event=>{if(event.type==='keydown'&&event.key!=='Escape')return;if(event.type==='pointerdown'&&(button.current?.contains(event.target)||event.target.closest?.('.chat-attach-menu')))return;setOpen(false);};
  const reposition=()=>placeMenu();
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};
 },[open,placeMenu]);
 const choose=(kind,event)=>{const chosen=Array.from(event.target.files||[]);event.target.value='';void pick(kind,chosen);};
 const option=(kind,Icon)=>{const limit=EVENT_FILE_LIMITS[kind],full=count(kind)>=limit.max;return <li key={kind}><button type="button" role="menuitem" disabled={full} onClick={()=>inputs[kind].current?.click()}><Icon size={16} aria-hidden="true"/><span><strong>{ar?limit.nameAr:limit.name}</strong><small>{count(kind)}/{limit.max} · {tr(`up to ${limit.mb} MB each`,`حتى ${limit.mb} ميغابايت للملف`)}</small></span></button></li>;};
 return <span className="chat-attach">
  <button ref={button} type="button" className="chat-attach-button" aria-haspopup="menu" aria-controls={open?menuId:undefined} aria-expanded={open} aria-label={tr('Attach photos or documents','إرفاق صور أو مستندات')} title={tr('Attach photos or documents','إرفاق صور أو مستندات')} disabled={disabled||busy} onClick={()=>setOpen(value=>!value)}><Paperclip size={16} aria-hidden="true"/></button>
  <input ref={photoInput} type="file" hidden multiple accept={EVENT_FILE_LIMITS.photo.accept} onChange={event=>choose('photo',event)}/>
  <input ref={fileInput} type="file" hidden multiple accept={EVENT_FILE_LIMITS.file.accept} onChange={event=>choose('file',event)}/>
  {open&&menuPosition&&createPortal(<ul id={menuId} className="chat-attach-menu is-portal" dir={ar?'rtl':'ltr'} role="menu" aria-label={tr('What would you like to attach?','ماذا تريد أن ترفق؟')} style={menuPosition}>{option('photo',ImageIcon)}{option('file',FileText)}</ul>,document.body)}
  {busy&&<span className="chat-attach-status" role="status">{tr('Uploading…','جارٍ الرفع…')}</span>}
  {error&&<span className="chat-attach-error" role="alert">{error}</span>}
 </span>;
}
