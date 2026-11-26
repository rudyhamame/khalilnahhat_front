import {useCallback,useEffect,useRef,useState} from 'react';
import {Paperclip,Trash2} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import './bookingFiles.css';

const size=bytes=>bytes>=1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
// The files shared with one booking. The admin uploads and removes them; the client only views them. Both read through owner-scoped routes.
export default function BookingFiles({requestId,token,admin=false,ar=false}){
 const tr=(en,arabic)=>ar?arabic:en,[items,setItems]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),input=useRef(null);
 const load=useCallback(()=>(admin?apiRequest(`/admin/service-requests/${encodeURIComponent(requestId)}/files`,{token}):apiRequest('/documents/mine',{token}).then(r=>({items:r.items.filter(file=>file.requestId===requestId)})))
  .then(r=>setItems(r.items)).catch(e=>setError(e.message)),[admin,requestId,token]);
 useEffect(()=>{load();},[load]);
 const open=async file=>{try{const {url}=await apiRequest(admin?`/admin/storage/${file.id}/download`:`/documents/${file.id}/download`,{token});window.open(url,'_blank','noopener');}catch(e){setError(e.message);}};
 const upload=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setBusy(true);setError('');
  try{const body=new FormData();body.append('file',file);
   const response=await fetch(`${apiBaseUrl}/admin/service-requests/${encodeURIComponent(requestId)}/files`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
   const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.message||tr('Upload failed.','فشل الرفع.'));await load();}
  catch(e){setError(e.message);}finally{setBusy(false);}};
 const remove=async file=>{if(!window.confirm(tr(`Remove “${file.name}” from this booking?`,`إزالة «${file.name}» من هذا الحجز؟`)))return;
  try{await apiRequest(`/admin/storage/${file.id}`,{method:'PATCH',token,body:{archived:true}});await load();}catch(e){setError(e.message);}};
  return <section className="booking-files" aria-label={tr('Files','الملفات')}>
  <header><h4><Paperclip size={14} aria-hidden="true"/>{tr('Files','الملفات')}</h4>{admin&&<><input ref={input} type="file" hidden onChange={upload}/><button type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?tr('Uploading…','جارٍ الرفع…'):tr('Share a file','مشاركة ملف')}</button></>}</header>
  {items===null?<p>{tr('Loading…','جارٍ التحميل…')}</p>:!items.length?<p className="booking-files-empty">{tr('No files shared with this booking yet.','لا توجد ملفات مشاركة مع هذا الحجز بعد.')}</p>
   :<ul>{items.map(file=><li key={file.id}><button type="button" className="booking-files-open" onClick={()=>open(file)}><strong>{file.name}</strong><small>{size(file.bytes)} · {new Date(file.createdAt).toLocaleDateString(ar?'ar':'en-CA')}</small></button>{admin&&<button type="button" className="booking-files-remove" onClick={()=>remove(file)} aria-label={tr('Remove','إزالة')}><Trash2 size={14}/></button>}</li>)}</ul>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
