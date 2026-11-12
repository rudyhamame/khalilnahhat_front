import {useEffect,useRef,useState} from 'react';
import {Mail,Save,Eye,CheckCircle2,ImagePlus,Search,RefreshCw,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import GalleryPicker from './GalleryPicker';
import EmailTextEditor from './EmailTextEditor';
import {emailDetailLabel,missingEmailDetails} from './emailTemplateEditor';
import './notificationEmailsAdmin.css';

const editable=item=>({revision:item.revision,enabled:item.enabled,subject:item.subject,body:item.body,imageUrl:item.imageUrl||'',leadHours:item.leadHours});
export default function NotificationEmailsAdmin({token}){
 const [items,setItems]=useState([]),[drafts,setDrafts]=useState({}),[selected,setSelected]=useState(''),[provider,setProvider]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null);
 const [galleryOpen,setGalleryOpen]=useState(false),[query,setQuery]=useState(''),[retry,setRetry]=useState(0);
 const message=useRef(null),subject=useRef(null),lastField=useRef('body');
 useEffect(()=>{
  let cancelled=false;setLoading(true);setError('');
  apiRequest('/admin/notifications/emails',{token}).then(data=>{
   if(cancelled)return;setItems(data.items);setDrafts(Object.fromEntries(data.items.map(item=>[item.id,editable(item)])));setSelected(data.items[0]?.id||'');setProvider(data.provider);
  }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[token,retry]);
 const item=items.find(item=>item.id===selected),draft=drafts[selected];
 const dirty=Boolean(item&&draft&&JSON.stringify(editable(item))!==JSON.stringify(draft));
 const missing=draft?missingEmailDetails(draft.body,item.required||[]):[];
 const change=(key,value)=>{setDrafts(current=>({...current,[selected]:{...current[selected],[key]:value}}));setNotice('');setPreview(null);};
 const choose=id=>{setSelected(id);setError('');setNotice('');setPreview(null);lastField.current='body';};
 const insert=variable=>(lastField.current==='subject'?subject:message).current?.insert(variable);
 const validation=()=>{
  if(!draft.subject.trim()||draft.subject.length>200)return 'Write an email subject of up to 200 characters.';
  if(!draft.body.trim()||draft.body.length>12000)return 'Write a message of up to 12,000 characters.';
  if(missing.length)return 'Add these essential details to the message: '+missing.map(emailDetailLabel).join(', ')+'.';
  return '';
 };
 const save=async event=>{
  event.preventDefault();if(!dirty||busy)return;const problem=validation();if(problem){setError(problem);return;}setBusy(true);setError('');setNotice('');
  try{const data=await apiRequest(`/admin/notifications/emails/${selected}`,{token,method:'PUT',body:draft});setItems(current=>current.map(row=>row.id===data.item.id?data.item:row));setDrafts(current=>({...current,[data.item.id]:editable(data.item)}));setNotice('Email saved. Future messages will use these settings.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const showPreview=async()=>{
  const problem=validation();if(problem){setError(problem);return;}setBusy(true);setError('');
  try{setPreview(await apiRequest(`/admin/notifications/emails/${selected}/preview`,{token,method:'POST',body:draft}));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const filtered=items.filter(row=>`${row.label} ${row.group} ${row.recipient}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="notification-admin">
  <header className="notification-toolbar"><div><h2><Mail size={20}/>Notification emails</h2><p>Choose an email, write your message, then preview and save.</p></div>{provider&&<div className="notification-provider"><i className={provider.configured?'is-configured':''}/><span>{provider.configured?'Email provider connected':'Email provider needs setup'}</span><small>{provider.senderEmail||'Sender not configured'}</small></div>}</header>
  {error&&<p className="notification-feedback is-error" role="alert">{error}{!items.length&&<button type="button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={14}/>Retry</button>}</p>}
  {notice&&<p className="notification-feedback" role="status"><CheckCircle2 size={15}/>{notice}</p>}
  {loading?<p role="status" className="admin-loading">Loading email settings…</p>:<div className="notification-workspace">
   <aside className="notification-email-list" aria-label="Notification emails">
    <label className="notification-search"><Search size={15}/><input type="search" aria-label="Find an email" placeholder="Find an email" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <nav aria-label="Choose an email">{[...new Set(filtered.map(row=>row.group))].map(group=><section key={group}><h3>{group}</h3>{filtered.filter(row=>row.group===group).map(row=><button key={row.id} type="button" disabled={busy} aria-current={selected===row.id?'true':undefined} onClick={()=>choose(row.id)}><span>{row.label}<small>{row.recipient}</small></span><i className={drafts[row.id]?.enabled?'is-enabled':''} title={drafts[row.id]?.enabled?'Enabled':'Disabled'}/>{JSON.stringify(editable(row))!==JSON.stringify(drafts[row.id])&&<b className="notification-unsaved-dot" title="Unsaved changes" aria-label="Unsaved changes"/>}</button>)}</section>)}{!filtered.length&&<p className="notification-list-empty">No matching emails.</p>}</nav>
   </aside>
   <div className="notification-panel">
   {item&&draft?<form className="notification-editor" onSubmit={save}>
    <header className="notification-event-row"><div><span className="notification-section-label">{item.group}</span><h3>{item.label}</h3><p>{item.when}</p></div><span className={`notification-draft-status${dirty?' is-dirty':''}`}>{dirty?'Unsaved changes':'Saved'}</span></header>
    <fieldset disabled={busy}>
     <div className="notification-schedule"><label className="notification-toggle"><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/><span><strong>Enable this email</strong><small>To: {item.recipient}</small></span></label>{draft.leadHours!==null?<label className="notification-lead"><span>Send reminder</span><input aria-label="Reminder lead time in hours" type="number" min="0.25" max="720" step="0.25" required value={draft.leadHours} onChange={e=>change('leadHours',e.target.value===''?'':Number(e.target.value))}/><span>hours before</span><small>Schedule checked every 10 minutes</small></label>:<span className="notification-timing">Sent automatically when triggered</span>}</div>
     <div className="notification-field"><label htmlFor="notification-subject">Subject</label><EmailTextEditor key={`${selected}-subject`} ref={subject} id="notification-subject" label="Email subject" singleLine value={draft.subject} disabled={busy||Boolean(preview)} onFocus={()=>{lastField.current='subject';}} onChange={value=>change('subject',value)}/></div>
     <div className="notification-message"><div className="notification-message-head"><div><label id="notification-message-label">{preview?'Email preview':'Message'}</label><p>{preview?'Example details only. No email has been sent.':'Write normally. No Markdown or code needed.'}</p></div><button className="notification-preview-toggle" type="button" onClick={()=>preview?setPreview(null):showPreview()} disabled={busy}><Eye size={15}/>{preview?'Back to editing':'Preview email'}</button></div>
     {preview?<section className="notification-preview" aria-label="Email preview"><small>SUBJECT</small><strong>{preview.subject}</strong><div className="notification-preview-body"><p>{preview.text}</p>{preview.imageUrl&&<img src={preview.imageUrl} alt="Email photo"/>}</div></section>:<>
      <details className="notification-details"><summary>Insert an automatic detail</summary><div>{item.variables.map(variable=><button key={variable} type="button" disabled={busy} onMouseDown={event=>event.preventDefault()} onClick={event=>{insert(variable);event.currentTarget.closest('details').open=false;}} title={`Insert ${emailDetailLabel(variable)} at the cursor`}>{emailDetailLabel(variable)}{item.required.includes(variable)&&<small>Essential</small>}</button>)}</div><p>Details fill in automatically for each recipient. Click a detail to insert it into the subject or message.</p></details>
      <div className="notification-compose"><EmailTextEditor key={selected} ref={message} id="notification-message" label="Email message" value={draft.body} disabled={busy} onFocus={()=>{lastField.current='body';}} onChange={value=>change('body',value)}/><aside className="notification-photo">{draft.imageUrl?<img src={draft.imageUrl} alt="Selected email photo"/>:<ImagePlus size={28} strokeWidth={1.2}/>}<strong>Optional photo</strong><button type="button" onClick={()=>setGalleryOpen(true)}>{draft.imageUrl?'Change photo':'Choose photo'}</button>{draft.imageUrl&&<button type="button" onClick={()=>change('imageUrl','')}><X size={12}/>Remove</button>}<small>Displayed beside the message</small></aside></div>
      {missing.length>0&&<p className="notification-missing" role="status">Essential details missing: {missing.map(emailDetailLabel).join(', ')}. Insert them into the message before saving.</p>}
     </>}
     </div>
    </fieldset>
    <footer><span className="notification-note">{preview?'Preview uses sample data.':draft.enabled?'Changes apply to future emails after saving.':'This email is disabled. Save to apply this setting.'}</span><div><button type="button" disabled={busy||!dirty} onClick={()=>{setDrafts(current=>({...current,[selected]:editable(item)}));setPreview(null);setError('');setNotice('');}}>Discard changes</button><button type="submit" className="notification-save" disabled={busy||!dirty}><Save size={15}/>{busy?'Working…':'Save email'}</button></div></footer>
   </form>:<p>No email events are available.</p>}
   </div>
  </div>}
  <GalleryPicker open={galleryOpen} onClose={()=>setGalleryOpen(false)} token={token} selectedUrl={draft?.imageUrl||''} allowUpload={false} title="Choose email photo" onSelect={photo=>change('imageUrl',photo.mediaUrl)}/>
 </section>;
}
