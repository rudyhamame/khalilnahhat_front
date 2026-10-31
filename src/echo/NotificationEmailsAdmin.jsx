import {useEffect,useRef,useState} from 'react';
import {Mail,Save,Eye,CheckCircle2,ImagePlus} from 'lucide-react';
import {apiRequest} from '../lib/api';
import GalleryPicker from './GalleryPicker';
import './notificationEmailsAdmin.css';

const editable=item=>({revision:item.revision,enabled:item.enabled,subject:item.subject,body:item.body,imageUrl:item.imageUrl||'',leadHours:item.leadHours});
export default function NotificationEmailsAdmin({token}){
 const [items,setItems]=useState([]),[drafts,setDrafts]=useState({}),[selected,setSelected]=useState(''),[provider,setProvider]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null);
 const [galleryOpen,setGalleryOpen]=useState(false);
 const message=useRef(null);
 useEffect(()=>{
  let cancelled=false;setLoading(true);setError('');
  apiRequest('/admin/notifications/emails',{token}).then(data=>{
   if(cancelled)return;setItems(data.items);setDrafts(Object.fromEntries(data.items.map(item=>[item.id,editable(item)])));setSelected(data.items[0]?.id||'');setProvider(data.provider);
  }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[token]);
 const item=items.find(item=>item.id===selected),draft=drafts[selected];
 const dirty=Boolean(item&&draft&&JSON.stringify(editable(item))!==JSON.stringify(draft));
 const change=(key,value)=>{setDrafts(current=>({...current,[selected]:{...current[selected],[key]:value}}));setNotice('');setPreview(null);};
 const choose=id=>{setSelected(id);setError('');setNotice('');setPreview(null);};
 const insert=variable=>{
  const field=message.current,start=field?.selectionStart??draft.body.length,end=field?.selectionEnd??start,text=`{{${variable}}}`;
  change('body',draft.body.slice(0,start)+text+draft.body.slice(end));
  requestAnimationFrame(()=>{field?.focus();field?.setSelectionRange(start+text.length,start+text.length);});
 };
 const save=async event=>{
  event.preventDefault();if(!dirty||busy)return;setBusy(true);setError('');setNotice('');
  try{const data=await apiRequest(`/admin/notifications/emails/${selected}`,{token,method:'PUT',body:draft});setItems(current=>current.map(row=>row.id===data.item.id?data.item:row));setDrafts(current=>({...current,[data.item.id]:editable(data.item)}));setNotice('Email settings saved. They apply to future sends.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const showPreview=async()=>{
  setBusy(true);setError('');
  try{setPreview(await apiRequest(`/admin/notifications/emails/${selected}/preview`,{token,method:'POST',body:draft}));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <section className="notification-admin">
  <header className="notification-toolbar"><nav role="tablist" aria-label="Notification channels"><button type="button" role="tab" id="notification-emails-tab" aria-selected="true" aria-controls="notification-emails-panel"><Mail size={15}/> Emails</button></nav>{provider&&<div className="notification-provider"><i className={provider.configured?'is-configured':''}/><span>Brevo</span><small>{provider.senderEmail||'Sender not configured'}</small></div>}</header>
  <div className="notification-panel" role="tabpanel" id="notification-emails-panel" aria-labelledby="notification-emails-tab">
   {error&&<p className="notification-feedback is-error" role="alert">{error}</p>}
   {notice&&<p className="notification-feedback" role="status"><CheckCircle2 size={15}/>{notice}</p>}
   {loading?<p role="status">Loading email settings…</p>:item&&draft?<form className="notification-editor" onSubmit={save}>
    <header className="notification-event-row"><label>Email event<select aria-label="Email event" value={selected} disabled={busy} onChange={e=>choose(e.target.value)}>{[...new Set(items.map(row=>row.group))].map(group=><optgroup key={group} label={group}>{items.filter(row=>row.group===group).map(row=><option key={row.id} value={row.id}>{row.label}{JSON.stringify(editable(row))!==JSON.stringify(drafts[row.id])?' · Unsaved':''}</option>)}</optgroup>)}</select></label><div><span>Recipient</span><strong>{item.recipient}</strong></div></header>
    <fieldset disabled={busy}>
     <div className="notification-schedule"><label className="notification-toggle"><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/><span><strong>Send this email</strong><small>{item.when}</small></span></label>{draft.leadHours!==null?<label className="notification-lead"><input aria-label="Reminder lead time in hours" type="number" min="0.25" max="720" step="0.25" required value={draft.leadHours} onChange={e=>change('leadHours',e.target.value===''?'':Number(e.target.value))}/>hours before<small>Checked every 10 minutes</small></label>:<span className="notification-timing">On event</span>}</div>
     <label className="notification-field">Subject<input required maxLength={200} value={draft.subject} onChange={e=>change('subject',e.target.value)}/></label>
     <div className="notification-message"><div className="notification-message-head"><label htmlFor="notification-message">{preview?'Email preview':'Message'}</label><select aria-label="Insert email detail" value="" disabled={busy||Boolean(preview)} onChange={e=>{if(e.target.value)insert(e.target.value);}}><option value="">Insert detail…</option>{item.variables.map(variable=><option key={variable} value={variable}>{`{{${variable}}}`}{item.required.includes(variable)?' *':''}</option>)}</select></div>{preview?<section className="notification-preview" aria-label="Email preview"><strong>{preview.subject}</strong><div className="notification-preview-body"><p>{preview.text}</p>{preview.imageUrl&&<img src={preview.imageUrl} alt="Email photo"/>}</div></section>:<div className="notification-compose"><textarea id="notification-message" ref={message} required maxLength={12000} value={draft.body} onChange={e=>change('body',e.target.value)}/><aside className="notification-photo">{draft.imageUrl?<img src={draft.imageUrl} alt="Selected email photo"/>:<ImagePlus size={28} strokeWidth={1.2}/>}<button type="button" onClick={()=>setGalleryOpen(true)}>{draft.imageUrl?'Change photo':'Choose from gallery'}</button>{draft.imageUrl&&<button type="button" onClick={()=>change('imageUrl','')}>Remove photo</button>}<small>Right side of the email</small></aside></div>}</div>
    </fieldset>
    <footer><span className="notification-note">{preview?'Sample details · no email is sent':item.customized?'Applies to future emails after saving.':'Original email stays in use until you save.'}</span><div><button type="button" onClick={()=>preview?setPreview(null):showPreview()} disabled={busy}><Eye size={15}/>{preview?'Edit message':'Preview'}</button><button type="button" disabled={busy||!dirty} onClick={()=>{setDrafts(current=>({...current,[selected]:editable(item)}));setPreview(null);setError('');setNotice('');}}>Discard</button><button type="submit" className="notification-save" disabled={busy||!dirty}><Save size={15}/>{busy?'Working…':'Save email'}</button></div></footer>
   </form>:!error?<p>No email events are available.</p>:null}
  </div>
  <GalleryPicker open={galleryOpen} onClose={()=>setGalleryOpen(false)} token={token} selectedUrl={draft?.imageUrl||''} allowUpload={false} title="Choose email photo" onSelect={photo=>change('imageUrl',photo.mediaUrl)}/>
 </section>;
}
