import {useEffect,useRef,useState} from 'react';
import {Bell,Mail,Save,Eye,CheckCircle2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './notificationEmailsAdmin.css';

const editable=item=>({revision:item.revision,enabled:item.enabled,subject:item.subject,body:item.body,leadHours:item.leadHours});
export default function NotificationEmailsAdmin({token}){
 const [items,setItems]=useState([]),[drafts,setDrafts]=useState({}),[selected,setSelected]=useState(''),[provider,setProvider]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null);
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
  <header className="notification-heading"><div><p><Bell size={15}/> NOTIFICATIONS</p><h1>Keep people in the loop.</h1><span>Choose which emails to send, when they go out, and what they say.</span></div>{provider&&<div className="notification-provider"><Mail size={16}/><div><strong>Brevo · {provider.configured?'Configured':'Setup needed'}</strong><small>{provider.senderName}{provider.senderEmail?` · ${provider.senderEmail}`:''}</small></div></div>}</header>
  <nav className="notification-tabs" aria-label="Notification channels"><span aria-current="page"><Mail size={15}/> Emails</span></nav>
  {error&&<p className="notification-feedback is-error" role="alert">{error}</p>}
  {notice&&<p className="notification-feedback" role="status"><CheckCircle2 size={15}/>{notice}</p>}
  {loading?<p role="status">Loading email settings…</p>:item&&draft?<div className="notification-layout">
   <aside className="notification-list" aria-label="Email events">{[...new Set(items.map(item=>item.group))].map(group=><div key={group}><h2>{group}</h2>{items.filter(item=>item.group===group).map(row=><button key={row.id} type="button" aria-pressed={selected===row.id} disabled={busy} onClick={()=>choose(row.id)}><i className={drafts[row.id]?.enabled?'is-enabled':''}/><span>{row.label}</span>{JSON.stringify(editable(row))!==JSON.stringify(drafts[row.id])&&<small title="Unsaved changes">●</small>}</button>)}</div>)}</aside>
   <form className="notification-editor" onSubmit={save}>
    <header><div><h2>{item.label}</h2><p>To: {item.recipient}</p></div><span>{item.customized?'Custom message':'Original email'}</span></header>
    <fieldset disabled={busy}>
     <div className="notification-schedule"><label className="notification-toggle"><span><strong>Send this email</strong><small>{item.when}</small></span><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/></label>{draft.leadHours!==null?<label className="notification-lead">Send<input type="number" min="0.25" max="720" step="0.25" required value={draft.leadHours} onChange={e=>change('leadHours',e.target.value===''?'':Number(e.target.value))}/>hours before {item.id==='meeting-reminder'?'the meeting':'the quote expires'}<small>Reminder checks run every 10 minutes. Each reminder is sent once.</small></label>:<p className="notification-timing">Immediately after this event</p>}</div>
     <label className="notification-field">Subject<input required maxLength={200} value={draft.subject} onChange={e=>change('subject',e.target.value)}/></label>
     <label className="notification-field">Message<textarea ref={message} required maxLength={12000} rows={11} value={draft.body} onChange={e=>change('body',e.target.value)}/></label>
     <div className="notification-variables"><p>Insert a detail <span>Required details are marked *</span></p><div>{item.variables.map(variable=><button type="button" key={variable} onClick={()=>insert(variable)} title={item.required.includes(variable)?'Required in the message':`Insert ${variable}`}><code>{`{{${variable}}}`}</code>{item.required.includes(variable)&&' *'}</button>)}</div></div>
     {!item.customized&&<p className="notification-note">Your existing email stays unchanged until you save. Saving uses the subject and message shown here.</p>}
    </fieldset>
    <footer><button type="button" onClick={showPreview} disabled={busy}><Eye size={15}/>Preview email</button><button type="button" disabled={busy||!dirty} onClick={()=>{setDrafts(current=>({...current,[selected]:editable(item)}));setPreview(null);setError('');setNotice('');}}>Discard changes</button><button type="submit" className="notification-save" disabled={busy||!dirty}><Save size={15}/>{busy?'Working…':'Save email'}</button></footer>
    {preview&&<section className="notification-preview" aria-label="Email preview"><header><strong>Email preview</strong><span>Sample details · no email is sent</span></header><h3>{preview.subject}</h3><p>{preview.text}</p></section>}
   </form>
  </div>:!error?<p>No email events are available.</p>:null}
 </section>;
}
