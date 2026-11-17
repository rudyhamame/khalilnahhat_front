import {useRef,useState} from 'react';
import {Paperclip,Image as ImageIcon,FileText} from 'lucide-react';
import {uploadEventFile} from '../lib/api';
import {EVENT_FILE_LIMITS,checkEventFile} from '../lib/eventFileLimits';

// The paperclip of the Echo AI conversation: add inspiration photos or event documents (and nothing else), within the quantity and size limits.
export default function ChatAttach({ctx,ar=false,disabled=false,onAdded}){
 const tr=(en,arabic)=>ar?arabic:en,[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),inputs={photo:useRef(null),file:useRef(null)};
 const count=kind=>ctx?.order?.references?.[EVENT_FILE_LIMITS[kind].field]?.length||0;
 const pick=async(kind,list)=>{
  const files=[...(list||[])];if(!files.length)return;
  setBusy(true);setError('');setOpen(false);
  const field=EVENT_FILE_LIMITS[kind].field;
  try{
   for(const file of files){
    const items=ctx.getOrder().references?.[field]||[],problem=checkEventFile(file,kind,items.length,ar);
    if(problem){setError(problem);break;}
    const {url,name}=await uploadEventFile(file,kind,ctx.token);
    ctx.setField('references.'+field,[...(ctx.getOrder().references?.[field]||[]),{url,name,comment:''}]);
    onAdded?.(kind,{url,name});
   }
  }catch(failure){setError(failure.message||tr('The upload failed. Please try again.','فشل الرفع. حاول مرة أخرى.'));}
  finally{setBusy(false);}
 };
 const option=(kind,Icon)=>{const limit=EVENT_FILE_LIMITS[kind],full=count(kind)>=limit.max;return <li key={kind}><button type="button" role="menuitem" disabled={full} onClick={()=>inputs[kind].current?.click()}><Icon size={16} aria-hidden="true"/><span><strong>{ar?limit.nameAr:limit.name}</strong><small>{count(kind)}/{limit.max} · {tr(`up to ${limit.mb} MB each`,`حتى ${limit.mb} ميغابايت للملف`)}</small></span></button><input ref={inputs[kind]} type="file" hidden multiple accept={limit.accept} onChange={event=>{const chosen=event.target.files;event.target.value='';pick(kind,chosen);}}/></li>;};
 return <span className="chat-attach">
  <button type="button" className="chat-attach-button" aria-haspopup="menu" aria-expanded={open} aria-label={tr('Attach photos or documents','إرفاق صور أو مستندات')} title={tr('Attach photos or documents','إرفاق صور أو مستندات')} disabled={disabled||busy} onClick={()=>setOpen(value=>!value)}><Paperclip size={16} aria-hidden="true"/></button>
  {open&&<ul className="chat-attach-menu" role="menu" aria-label={tr('What would you like to attach?','ماذا تريد أن ترفق؟')}>{option('photo',ImageIcon)}{option('file',FileText)}</ul>}
  {busy&&<span className="chat-attach-status" role="status">{tr('Uploading…','جارٍ الرفع…')}</span>}
  {error&&<span className="chat-attach-error" role="alert">{error}</span>}
 </span>;
}
