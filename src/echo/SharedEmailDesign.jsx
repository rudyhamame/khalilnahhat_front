import {emailPreviewHtml} from './emailPreviewHtml';
import {useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,ImagePlus,Monitor,RefreshCw,Save,Smartphone} from 'lucide-react';
import {apiRequest} from '../lib/api';
import GalleryPicker from './GalleryPicker';

const fields=['revision','brandName','tagline','photoUrl','photoAlt'];
const editable=value=>Object.fromEntries(fields.map(key=>[key,value[key]]));
export default function SharedEmailDesign({token,onDirtyChange,onSaved}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(null),[loading,setLoading]=useState(true),[action,setAction]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null),[previewError,setPreviewError]=useState(''),[gallery,setGallery]=useState(false),[size,setSize]=useState('desktop'),[retry,setRetry]=useState(0),[conflict,setConflict]=useState(false);
 const previewSequence=useRef(0),dirty=Boolean(saved&&draft&&fields.some(key=>saved[key]!==draft[key])),busy=Boolean(action);
 const valid=Boolean(draft?.brandName?.trim()&&draft.brandName.length<=80&&draft.tagline.length<=120&&draft.photoUrl&&draft.photoAlt.trim()&&draft.photoAlt.length<=160);
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');
  apiRequest('/admin/notifications/email-design',{token}).then(data=>{if(alive){setSaved(editable(data.design));setDraft(editable(data.design));setConflict(false);}}).catch(e=>{if(alive)setError(e.message||'Could not load the shared email design.');}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[token,retry]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{
  if(!draft||!valid){previewSequence.current++;setPreview(null);return;}
  const sequence=++previewSequence.current;let alive=true;
  // Preview the exact server renderer after a short pause in typing.
  const timer=setTimeout(()=>{
   setPreviewError('');
   apiRequest('/admin/notifications/email-design/preview',{token,method:'POST',body:draft}).then(data=>{if(alive&&sequence===previewSequence.current)setPreview(data);}).catch(e=>{if(alive&&sequence===previewSequence.current){setPreview(null);setPreviewError(e.message||'Could not load the preview.');}});
  },350);
  return()=>{alive=false;clearTimeout(timer);};
 },[draft,token,valid]);
 const change=(key,value)=>{setDraft(current=>({...current,[key]:value}));setNotice('');setError('');setPreview(null);};
 const save=async event=>{
  event.preventDefault();if(!dirty||busy)return;
  if(!valid){setError('Add a brand name, a photo, and a short photo description.');return;}
  setAction('save');setError('');setNotice('');
  try{const data=await apiRequest('/admin/notifications/email-design',{token,method:'PUT',body:draft});setSaved(editable(data.design));setDraft(editable(data.design));setConflict(false);setNotice('Shared design saved. Future notification and bookings emails will use this design.');onSaved();}
  catch(e){setError(e.message||'Could not save the shared design. Your changes are still here.');setConflict(e.status===409);}
  finally{setAction('');}
 };
 if(loading)return <div className="notification-loading" role="status"><RefreshCw size={20} className="notification-spinner"/>Loading shared design…</div>;
 if(!draft)return <div className="notification-empty" role="alert"><AlertCircle size={26}/><h3>Shared design couldn’t be loaded</h3><p>{error}</p><button type="button" className="notification-button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>;
 return <form className="notification-design" onSubmit={save} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();event.stopPropagation();if(dirty&&!busy)save(event);}}}>
  <header className="notification-design-heading"><div><span className="notification-eyebrow">One design, every email</span><h3>Your shared email design</h3><p>One design for notifications and emails sent from bookings@djkhalilnahhat.ca.</p></div><span className={`notification-design-state${dirty?' is-dirty':''}`}>{dirty?'Unsaved changes':'Saved design'}</span></header>
  {error&&<div className="notification-feedback is-error" role="alert"><AlertCircle size={16}/><div><p>{error}</p>{conflict&&<><button type="button" onClick={()=>setRetry(value=>value+1)} disabled={busy}>Load latest saved design</button><small>This replaces your unsaved design changes.</small></>}</div></div>}
  {notice&&<p className="notification-feedback" role="status"><CheckCircle2 size={16}/>{notice}</p>}
  <div className="notification-design-body">
   <fieldset disabled={busy} className="notification-design-settings"><legend className="notification-sr-only">Shared branding and photo</legend>
    <div className="notification-design-photo"><img src={draft.photoUrl} alt={draft.photoAlt}/><div><strong>Brand photo</strong><p>Used in the header of every email.</p><button type="button" onClick={()=>setGallery(true)}><ImagePlus size={14}/>Change photo</button></div></div>
    <label>Brand name<input value={draft.brandName} maxLength={80} required onChange={event=>change('brandName',event.target.value)}/></label>
    <label>Tagline <small>Optional</small><input value={draft.tagline} maxLength={120} onChange={event=>change('tagline',event.target.value)}/></label>
    <label>Photo description<input value={draft.photoAlt} maxLength={160} required onChange={event=>change('photoAlt',event.target.value)}/><small>Shown when a recipient’s email app hides images.</small></label>
    <div className="notification-design-explainer"><CheckCircle2 size={16}/><div><strong>Consistent by default</strong><p>Choose the photo once. Each email keeps its own subject, message, and timing.</p></div></div>
   </fieldset>
   <section className="notification-design-preview" aria-label="Shared email design preview"><div className="notification-design-preview-toolbar"><span>Live preview <small>Sample booking email</small></span><div role="group" aria-label="Preview size"><button type="button" aria-label="Desktop preview" aria-pressed={size==='desktop'} onClick={()=>setSize('desktop')}><Monitor size={15}/></button><button type="button" aria-label="Mobile preview" aria-pressed={size==='mobile'} onClick={()=>setSize('mobile')}><Smartphone size={15}/></button></div></div><div className={`notification-email-canvas${size==='mobile'?' is-mobile':''}`} aria-busy={!preview&&!previewError&&valid}>{preview?<iframe title="Shared email design preview" sandbox="" srcDoc={emailPreviewHtml(preview.html)}/>:<div className="notification-empty">{previewError?<><AlertCircle size={24}/><p role="alert">{previewError}</p><button type="button" onClick={()=>setDraft(current=>({...current}))}>Retry preview</button></>:<><RefreshCw size={20} className={valid?'notification-spinner':''}/><p>{valid?'Preparing preview…':'Complete the branding fields to see your preview.'}</p></>}</div>}</div><p className="notification-design-preview-note">Sample details only. Saving a design does not send an email.</p></section>
  </div>
  <footer><p>Applies to notification and bookings emails.</p><div><button type="button" disabled={busy||!dirty} onClick={()=>{setDraft({...saved});setError('');setNotice('');setConflict(false);}}>Discard changes</button><button type="submit" className="notification-save" disabled={busy||!dirty}>{action==='save'?<RefreshCw size={15} className="notification-spinner"/>:<Save size={15}/>} {action==='save'?'Saving…':'Save shared design'}</button></div></footer>
  <GalleryPicker open={gallery} token={token} selectedUrl={draft.photoUrl} title="Choose the shared email photo" allowUpload={false} onClose={()=>setGallery(false)} onSelect={photo=>change('photoUrl',photo.mediaUrl)}/>
 </form>;
}
