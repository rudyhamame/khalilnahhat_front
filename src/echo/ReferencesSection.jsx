import {useEffect,useState} from 'react';
import {ExternalLink,FileText,Image as ImageIcon,Link as LinkIcon,Plus,Trash2,Upload} from 'lucide-react';
import {isPending,pendingUrl,stageFile,stagedFile,unstageFile} from '../lib/pendingFiles';
import {EVENT_FILE_LIMITS,checkEventFile} from '../lib/eventFileLimits';
import {duplicateAttachmentHash,hashFile} from '../lib/photoHash';
import {useEventOrder} from './eventOrderContext';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import './referencesSection.css';

// Booking-page references section of the Booking summary: inspiration photos (upload) and links, and event documents (upload).
// photos + comments (references.photos), photo links (references.images) and documents + notes (references.files).
// A staged photo is shown from this browser's copy; a stored one from its URL.
function Preview({item}){
  const [src,setSrc]=useState(isPending(item)?'':item.url);
  useEffect(()=>{if(!isPending(item)){setSrc(item.url);return undefined;}let url,alive=true;stagedFile(item.sha256).then(blob=>{if(alive&&blob){url=URL.createObjectURL(blob);setSrc(url);}});return()=>{alive=false;if(url)URL.revokeObjectURL(url);};},[item.url,item.sha256]);
  return <img src={src} alt="" loading="lazy"/>;
}
function Attachments({kind,field,title,hint,icon:Icon,ctx,ar,tr}){
  const items=ctx?.order?.references?.[field]||[],[busy,setBusy]=useState(false),[error,setError]=useState('');
  const canEdit=Boolean(ctx?.draftEditable),set=next=>ctx.setField('references.'+field,next);
  const add=async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    const problem=checkEventFile(file,kind,items.length,ar);if(problem){setError(problem);return;}
    setBusy(true);setError('');
    try{
      const contentHash=await hashFile(file);
      if(duplicateAttachmentHash(items,contentHash)){setError(kind==='photo'?tr('This photo is already attached.','هذه الصورة مرفقة بالفعل.'):tr('This document is already attached.','هذا المستند مرفق بالفعل.'));return;}
      await stageFile(contentHash,file);
      set([...items,{url:pendingUrl(contentHash),name:file.name,comment:'',sha256:contentHash,size:file.size}]);
    }
    catch(failure){setError(failure.message);}
    finally{setBusy(false);}
  };
  return <div className="ref-block" data-booking-field={`references.${field}`}><h4><Icon size={17} aria-hidden="true"/>{title}<FieldCode k={`references.${field}`} star/></h4><div className="ref-hint-row"><p>{hint}</p>{kind==='photo'?<label className={`ref-photo-add${busy||!canEdit||items.length>=EVENT_FILE_LIMITS[kind].max?' is-disabled':''}`}><Upload size={20} aria-hidden="true"/><span>{busy?tr('Uploading…','جارٍ الرفع…'):tr('Add photo','أضف صورة')}</span><input type="file" accept={EVENT_FILE_LIMITS[kind].accept} disabled={busy||!canEdit||items.length>=EVENT_FILE_LIMITS[kind].max} onChange={add}/></label>:<label className={`ref-file-add${busy||!canEdit||items.length>=EVENT_FILE_LIMITS[kind].max?' is-disabled':''}`}><Upload size={20} aria-hidden="true"/><span>{busy?tr('Uploading…','جارٍ الرفع…'):tr('Add document','أضف مستنداً')}</span><input type="file" accept={EVENT_FILE_LIMITS[kind].accept} disabled={busy||!canEdit||items.length>=EVENT_FILE_LIMITS[kind].max} onChange={add}/></label>}</div>
    {!items.length?null:kind==='photo'?<div className="ref-photo-dropzone"><ul className="ref-items is-grid">{items.map((item,index)=><li key={item.url}>
      <Preview item={item}/>
      <div><textarea rows={2} maxLength={500} dir="auto" disabled={!canEdit} value={item.comment||''} placeholder={tr('Add a comment about this photo','أضف تعليقاً على هذه الصورة')} aria-label={`${tr('Comment for','تعليق على')} ${item.name}`} onChange={e=>set(items.map((row,i)=>i===index?{...row,comment:e.target.value}:row))}/></div>
      <button type="button" className="ref-x" disabled={!canEdit} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>{if(isPending(item))unstageFile(item.sha256);set(items.filter((_,i)=>i!==index));}}><Trash2 size={15}/></button>
    </li>)}</ul></div>:<div className="ref-file-dropzone"><ul className="ref-items">{items.map((item,index)=><li key={item.url}>
      <strong className="ref-doc-name" dir="auto">{item.name}</strong><span className="ref-doc"><FileText size={22} aria-hidden="true"/></span><div><textarea rows={2} maxLength={500} dir="auto" disabled={!canEdit} value={item.comment||''} placeholder={tr('Add a note about this document','أضف ملاحظة عن هذا المستند')} aria-label={`${tr('Comment for','تعليق على')} ${item.name}`} onChange={e=>set(items.map((row,i)=>i===index?{...row,comment:e.target.value}:row))}/></div>
      <a className="ref-x ref-open" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${tr('Open','فتح')} ${item.name}`} title={tr('Open document','فتح المستند')}><ExternalLink size={15} aria-hidden="true"/></a>
      <button type="button" className="ref-x" disabled={!canEdit} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>{if(isPending(item))unstageFile(item.sha256);set(items.filter((_,i)=>i!==index));}}><Trash2 size={15}/></button>
    </li>)}</ul></div>}
    {error&&<p role="alert" className="ref-error">{error}</p>}
    </div>;
}
// The second way to add inspiration photos: paste links instead of uploading (references.images).
const safeHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&Boolean(url.hostname)?url.href:null;}catch{return null;}};
function PhotoLinks({ctx,tr}){
  const links=ctx?.order?.references?.images||[],[text,setText]=useState(''),canEdit=Boolean(ctx?.draftEditable),href=safeHttps(text.trim());
  const add=()=>{if(!href||!canEdit||links.includes(href)||links.length>=30)return;ctx.setField('references.images',[...links,href]);setText('');};
  return <div className="ref-block ref-links" data-booking-field="references.images"><h4><LinkIcon size={17} aria-hidden="true"/>{tr('Inspiration photo links','روابط صور ملهمة')}<FieldCode k="references.images" star/></h4><p>{tr('Or paste a link to a photo instead of uploading one (Pinterest, Instagram, Google Drive…).','أو الصق رابط صورة بدلاً من رفعها (Pinterest أو Instagram أو Google Drive…).')}</p>
    <div className="ref-link-form"><input type="url" inputMode="url" maxLength={2048} dir="ltr" disabled={!canEdit||links.length>=30} value={text} aria-invalid={Boolean(text.trim())&&!href} placeholder="https://…" aria-label={tr('Link to an inspiration photo','رابط صورة ملهمة')} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}}}/><button type="button" disabled={!href||!canEdit||links.length>=30} onClick={add}><Plus size={15} aria-hidden="true"/>{tr('Add link','أضف الرابط')}</button></div>
    {Boolean(text.trim())&&!href&&<p className="ref-error" role="status">{tr('Use a link that starts with https://.','استخدم رابطاً يبدأ بـ https://.')}</p>}
    <ul className="ref-items ref-link-list">{links.map((link,index)=><li key={link}><span className="ref-doc"><LinkIcon size={20} aria-hidden="true"/></span><div><span className="ref-link-text" dir="ltr">{link.replace(/^https:\/\//,'').slice(0,70)}</span></div><a className="ref-x ref-open" href={link} target="_blank" rel="noopener noreferrer" aria-label={`${tr('Open link','فتح الرابط')} ${link}`} title={tr('Open link','فتح الرابط')}><ExternalLink size={15} aria-hidden="true"/></a><button type="button" className="ref-x" disabled={!canEdit} aria-label={`${tr('Remove','إزالة')} ${link}`} onClick={()=>ctx.setField('references.images',links.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></li>)}</ul></div>;
}
export default function ReferencesSection({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder();
  // Arriving from the Booking summary on another page: scroll here once the page has rendered (#special-requests is the old name of this link).
  useEffect(()=>{if(['#references','#special-requests'].includes(window.location.hash))document.getElementById('references')?.scrollIntoView({block:'start'});},[]);
  const common={ctx,ar,tr};
  return <div id="references" className="booking-services" dir={ar?'rtl':'ltr'}>
    <BookingStep number={8} title={tr('Anything to show us?','هل لديك ما تريد أن تُرينا إياه؟')} cardTitle={<>{tr('Inspiration & documents','الإلهام والمستندات')}</>} copy={tr('Share inspiration photos, links (a playlist, a video, a Pinterest board), or documents such as a run-of-show, a floor plan or a guest list, each with your own note about why it matters. Everything here appears under References in your Booking summary.','شاركنا صوراً ملهمة أو روابط (قائمة تشغيل، فيديو، لوحة بينترست)، أو مستندات مثل برنامج الحفل أو مخطط القاعة أو قائمة الضيوف، مع ملاحظتك عن أهميتها. كل ما هنا يظهر ضمن المراجع في ملخص حجزك.')}>
      <div className="ref-stack">
      <Attachments {...common} kind="photo" field="photos" icon={ImageIcon} title={tr('Inspiration photos','صور ملهمة')} hint={tr('JPG, PNG or WebP, up to 10 MB each.','JPG أو PNG أو WebP، حتى 10 ميجابايت للملف.')}/>
      <PhotoLinks ctx={ctx} tr={tr}/>
      <Attachments {...common} kind="file" field="files" icon={FileText} title={tr('Event documents','مستندات الفعالية')} hint={tr('PDF, Word or text files with your own notes about the event.','ملفات PDF أو Word أو نصية تحوي ملاحظاتك عن الفعالية.')}/>
      </div>
    </BookingStep>
  </div>;
}
