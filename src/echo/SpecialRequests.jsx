import {useEffect,useState} from 'react';
import {ExternalLink,FileText,Image as ImageIcon,Link as LinkIcon,Plus,Upload,X} from 'lucide-react';
import {uploadEventFile} from '../lib/api';
import {useEventOrder} from './eventOrderContext';
import './specialRequests.css';

// Services-page viewport feeding the "Special requests" section of the Booking summary:
// photos + comments (references.photos), documents + notes (references.files) and a free text area (additional.notes, the Additional notes).
const ACCEPT={photo:'image/jpeg,image/png,image/webp',file:'application/pdf,.doc,.docx,.txt'};
function Attachments({kind,field,title,hint,icon:Icon,ctx,ar,tr}){
  const items=ctx?.order?.references?.[field]||[],[busy,setBusy]=useState(false),[error,setError]=useState('');
  const canEdit=Boolean(ctx?.draftEditable),set=next=>ctx.setField('references.'+field,next);
  const add=async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    setBusy(true);setError('');
    try{const {url,name}=await uploadEventFile(file,kind,ctx.token);set([...items,{url,name,comment:''}]);}
    catch(failure){setError(failure.message);}
    finally{setBusy(false);}
  };
  return <div className="sr-block"><h4><Icon size={17} aria-hidden="true"/>{title}</h4><p>{hint}</p>
    {!ctx?.signedIn?<p className="sr-note">{tr('Sign in to upload files.','سجّل الدخول لرفع الملفات.')}</p>:
    <label className={`sr-upload${busy||!canEdit||items.length>=12?' is-disabled':''}`}><Upload size={16} aria-hidden="true"/>{busy?tr('Uploading…','جارٍ الرفع…'):tr('Choose file','اختر ملفاً')}<input type="file" accept={ACCEPT[kind]} disabled={busy||!canEdit||items.length>=12} onChange={add}/></label>}
    {error&&<p role="alert" className="sr-error">{error}</p>}
    <ul className="sr-items">{items.map((item,index)=><li key={item.url}>
      {kind==='photo'?<img src={item.url} alt="" loading="lazy"/>:<span className="sr-doc"><FileText size={22} aria-hidden="true"/></span>}
      <div><strong dir="auto">{item.name}</strong>
        <textarea rows={2} maxLength={500} dir="auto" disabled={!canEdit} value={item.comment||''} placeholder={kind==='photo'?tr('Add a comment about this photo','أضف تعليقاً على هذه الصورة'):tr('Add a note about this document','أضف ملاحظة عن هذا المستند')} aria-label={`${tr('Comment for','تعليق على')} ${item.name}`} onChange={e=>set(items.map((row,i)=>i===index?{...row,comment:e.target.value}:row))}/></div>
      <button type="button" className="sr-x" disabled={!canEdit} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>set(items.filter((_,i)=>i!==index))}><X size={15}/></button>
    </li>)}</ul></div>;
}
// The second way to add inspiration photos: paste links instead of uploading (references.images).
const safeHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&Boolean(url.hostname)?url.href:null;}catch{return null;}};
function PhotoLinks({ctx,tr}){
  const links=ctx?.order?.references?.images||[],[text,setText]=useState(''),canEdit=Boolean(ctx?.draftEditable),href=safeHttps(text.trim());
  const add=()=>{if(!href||!canEdit||links.includes(href)||links.length>=30)return;ctx.setField('references.images',[...links,href]);setText('');};
  return <div className="sr-block sr-links"><h4><LinkIcon size={17} aria-hidden="true"/>{tr('Inspiration photo links','روابط صور ملهمة')}</h4><p>{tr('Or paste a link to a photo instead of uploading one (Pinterest, Instagram, Google Drive…).','أو الصق رابط صورة بدلاً من رفعها (Pinterest أو Instagram أو Google Drive…).')}</p>
    <div className="sr-link-form"><input type="url" inputMode="url" maxLength={2048} dir="ltr" disabled={!canEdit||links.length>=30} value={text} aria-invalid={Boolean(text.trim())&&!href} placeholder="https://…" aria-label={tr('Link to an inspiration photo','رابط صورة ملهمة')} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}}}/><button type="button" disabled={!href||!canEdit||links.length>=30} onClick={add}><Plus size={15} aria-hidden="true"/>{tr('Add link','أضف الرابط')}</button></div>
    {Boolean(text.trim())&&!href&&<p className="sr-error" role="status">{tr('Use a link that starts with https://.','استخدم رابطاً يبدأ بـ https://.')}</p>}
    <ul className="sr-items sr-link-list">{links.map((link,index)=><li key={link}><span className="sr-doc"><LinkIcon size={20} aria-hidden="true"/></span><div><a href={link} target="_blank" rel="noopener noreferrer" dir="ltr">{link.replace(/^https:\/\//,'').slice(0,70)} <ExternalLink size={12} aria-hidden="true"/></a></div><button type="button" className="sr-x" disabled={!canEdit} aria-label={`${tr('Remove','إزالة')} ${link}`} onClick={()=>ctx.setField('references.images',links.filter((_,i)=>i!==index))}><X size={15}/></button></li>)}</ul></div>;
}
export default function SpecialRequests({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder(),value=ctx?.order?.additional?.notes||'';
  // Arriving from the Booking summary on another page: scroll here once the page has rendered.
  useEffect(()=>{if(window.location.hash==='#special-requests')document.getElementById('special-requests')?.scrollIntoView({block:'start'});},[]);
  const common={ctx,ar,tr};
  return <section id="special-requests" className="rsf sr rw-vp" aria-labelledby="sr-title" dir={ar?'rtl':'ltr'}>
    <div className="rsf-copy">
      <h2 id="sr-title">{tr('Anything special on your mind?','هل لديك طلبات خاصة؟')}</h2>
      <p>{tr('Share inspiration photos, documents with your own notes, or simply tell us what matters most. Everything here appears in your Booking summary.','شاركنا صوراً ملهمة، أو مستندات بملاحظاتك، أو اكتب ما يهمك. كل ما تضيفه هنا يظهر ضمن «طلبات خاصة» في ملخص الحجز.')}</p></div>
    <div className="rsf-card sr-card">
      <Attachments {...common} kind="photo" field="photos" icon={ImageIcon} title={tr('Inspiration photos','صور ملهمة')} hint={tr('JPG, PNG or WebP, up to 10 MB each.','JPG أو PNG أو WebP، حتى 10 ميجابايت للملف.')}/>
      <PhotoLinks ctx={ctx} tr={tr}/>
      <Attachments {...common} kind="file" field="files" icon={FileText} title={tr('Event documents','مستندات الفعالية')} hint={tr('PDF, Word or text files with your own notes about the event.','ملفات PDF أو Word أو نصية تحوي ملاحظاتك عن الفعالية.')}/>
      <label className="sr-block"><h4>{tr('Additional notes','ملاحظات إضافية')}</h4>
        <textarea data-booking-field="additional.notes" rows={5} maxLength={3000} dir="auto" disabled={!ctx?.draftEditable} value={value} placeholder={tr('Write anything on your mind — surprises, must-haves, things to avoid…','اكتب أي شيء يخطر ببالك — مفاجآت، أمور أساسية، أو أشياء تتجنبها…')} onChange={e=>ctx?.setField('additional.notes',e.target.value||null)}/></label>
    </div>
  </section>;
}
