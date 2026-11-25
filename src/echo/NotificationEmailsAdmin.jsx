import {emailPreviewHtml} from './emailPreviewHtml';
import {useEffect,useRef,useState} from 'react';
import {Mail,Save,Eye,Check,CheckCircle2,Search,RefreshCw,X,ChevronRight,Clock3,Users,ArrowLeft,PenLine,AlertCircle,PanelsTopLeft,Sparkles} from 'lucide-react';
import {apiRequest} from '../lib/api';
import SharedEmailDesign from './SharedEmailDesign';
import EmailTextEditor from './EmailTextEditor';
import {emailDetailLabel,missingEmailDetails,templateSegments} from './emailTemplateEditor';
import {editableEmail,emailHasChanges,filterNotificationEmails,validateEmailDraft,reminderTiming} from './notificationEmailSettings.mjs';
import {suggestNotificationBody} from './notificationBodySuggestion.mjs';
import './notificationEmailsAdmin.css';

export default function NotificationEmailsAdmin({token}){
 const [items,setItems]=useState([]),[drafts,setDrafts]=useState({}),[selected,setSelected]=useState('');
 const [loading,setLoading]=useState(true),[action,setAction]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null),[view,setView]=useState('edit');
 const [bodySuggestion,setBodySuggestion]=useState(null);
 const [section,setSection]=useState('messages'),[designVisited,setDesignVisited]=useState(false),[designDirty,setDesignDirty]=useState(false);
 const [query,setQuery]=useState(''),[group,setGroup]=useState('all'),[status,setStatus]=useState('all'),[retry,setRetry]=useState(0),[attempted,setAttempted]=useState(false),[conflict,setConflict]=useState(false),[mobileEditor,setMobileEditor]=useState(false),[activeField,setActiveField]=useState('body');
 const message=useRef(null),subject=useRef(null),panel=useRef(null),heading=useRef(null),editTab=useRef(null),previewTab=useRef(null),designTab=useRef(null);
 const busy=Boolean(action),item=items.find(row=>row.id===selected),draft=drafts[selected];
 const dirty=emailHasChanges(item,draft),dirtyCount=items.filter(row=>emailHasChanges(row,drafts[row.id])).length;
 const missing=draft?missingEmailDetails(draft.body,item.required||[]):[];
 const problems=item&&draft?validateEmailDraft(item,draft):{};
 const invalid=attempted?problems:{};
 const filtered=filterNotificationEmails(items,drafts,{query,group,status});
 const groups=[...new Set(items.map(row=>row.group))];

 useEffect(()=>{
  let cancelled=false;setLoading(true);setError('');
  apiRequest('/admin/notifications/emails',{token}).then(data=>{
   if(cancelled)return;setItems(data.items);setDrafts(Object.fromEntries(data.items.map(row=>[row.id,editableEmail(row)])));setSelected(data.items[0]?.id||'');
  }).catch(e=>{if(!cancelled)setError(e.message||'Could not load notification emails.');}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[token,retry]);
 useEffect(()=>{
  if(!dirtyCount&&!designDirty)return;
  const protect=event=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);
 },[dirtyCount,designDirty]);
 const change=(key,value)=>{
  setDrafts(current=>({...current,[selected]:{...current[selected],[key]:value}}));setNotice('');setError('');setPreview(null);if(key==='body')setBodySuggestion(null);
 };
 const choose=id=>{
  if(busy)return;setBodySuggestion(null);setSelected(id);setError('');setNotice('');setPreview(null);setView('edit');setAttempted(false);setConflict(false);setActiveField('body');setMobileEditor(true);
  panel.current?.scrollTo?.({top:0});
 };
 useEffect(()=>{if(mobileEditor)heading.current?.focus();},[selected,mobileEditor]);
 const insert=variable=>(activeField==='subject'?subject:message).current?.insert(variable);
 const validate=()=>{
  setAttempted(true);
  if(!Object.keys(problems).length)return true;
  setError('Check the highlighted fields before continuing.');setView('edit');
  // The editor may be returning from Preview, so focus once its fields mount.
  requestAnimationFrame(()=>{
   const field=Object.keys(problems)[0];
   document.getElementById(field==='leadHours'?'notification-lead':field==='imageUrl'?'notification-image':'notification-'+(field==='body'?'message':field))?.focus();
  });
  return false;
 };
 const save=async event=>{
  event.preventDefault();if(!dirty||busy||!validate())return;
  const id=selected;setAction('save');setError('');setNotice('');
  try{
   const data=await apiRequest(`/admin/notifications/emails/${id}`,{token,method:'PUT',body:draft});
   setItems(current=>current.map(row=>row.id===id?data.item:row));setDrafts(current=>({...current,[id]:editableEmail(data.item)}));setAttempted(false);setConflict(false);
   setNotice('Changes saved. They apply to future emails.');
  }catch(e){setError(e.message||'Could not save this email. Your draft is still here.');setConflict(e.status===409);}
  finally{setAction('');}
 };
 const suggestBody=async()=>{
  if(busy||!draft)return;setAction('suggest');setError('');setBodySuggestion(null);
  try{const result=await suggestNotificationBody(item,draft,{request:apiRequest,token});setBodySuggestion({id:selected,body:result.body});}
  catch(e){setError(e.message||'AI could not suggest a body. Your message is unchanged.');}
  finally{setAction('');}
 };
 const showPreview=async()=>{
  if(busy)return;
  if(preview){setView('preview');return;}
  if(!validate())return;
  setView('preview');setAction('preview');setError('');
  try{setPreview(await apiRequest(`/admin/notifications/emails/${selected}/preview`,{token,method:'POST',body:draft}));}
  catch(e){setError(e.message||'Could not generate a preview. Try again.');}
  finally{setAction('');}
 };
 const discard=()=>{setBodySuggestion(null);setView('edit');setDrafts(current=>({...current,[selected]:editableEmail(item)}));setPreview(null);setError('');setNotice('');setAttempted(false);setConflict(false);};
 const reloadSelected=async()=>{
  setAction('reload');setError('');
  try{
   const data=await apiRequest('/admin/notifications/emails',{token}),latest=data.items.find(row=>row.id===selected);
   if(!latest)throw new Error('This email is no longer available.');
   setItems(current=>current.map(row=>row.id===selected?latest:row));setDrafts(current=>({...current,[selected]:editableEmail(latest)}));setPreview(null);setView('edit');setConflict(false);setAttempted(false);setNotice('Latest saved version loaded. Your other drafts are unchanged.');
  }catch(e){setError(e.message||'Could not load the saved version.');}
  finally{setAction('');}
 };
 const changeTab=(event)=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||busy)return;
  event.preventDefault();
  const next=event.key==='Home'?'edit':event.key==='End'?'preview':view==='edit'?'preview':'edit';
  if(next==='edit'){setView('edit');editTab.current?.focus();}else{showPreview();previewTab.current?.focus();}
 };
 const openDesign=()=>{setDesignVisited(true);setSection('design');};
 const clearFilters=()=>{setQuery('');setGroup('all');setStatus('all');};
 const fieldError=key=>invalid[key]&&<p className="notification-field-error" id={`notification-${key}-error`}>{invalid[key]}</p>;

 return <section className={`notification-admin${mobileEditor?' is-editing':''}`} aria-label="Notification emails" onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='s'){event.preventDefault();if(section==='messages'&&dirty&&!busy)save(event);}}}>
  <div className="notification-page-tabs" role="group" aria-label="Notification settings"><button type="button" aria-pressed={section==='messages'} onClick={()=>setSection('messages')}><Mail size={15}/>Email messages{dirtyCount>0&&<i aria-hidden="true" title="Unsaved email changes"/>}</button><button ref={designTab} type="button" aria-pressed={section==='design'} onClick={openDesign}><PanelsTopLeft size={15}/>Shared design{designDirty&&<i aria-hidden="true" title="Unsaved design changes"/>}</button></div>
  {designVisited&&<div id="notification-shared-design" className="notification-design-wrap" hidden={section!=='design'}><SharedEmailDesign token={token} onDirtyChange={setDesignDirty} onSaved={()=>setPreview(null)}/></div>}
  <div className="notification-messages-wrap" hidden={section!=='messages'}>
  {loading?<div className="notification-loading" role="status"><RefreshCw size={20} className="notification-spinner"/>Loading notification emails…</div>:!items.length?<div className="notification-empty" role={error?'alert':undefined}><Mail size={30} strokeWidth={1.3}/><h3>{error?'Emails couldn’t be loaded':'No notification emails yet'}</h3><p>{error||'Email events will appear here when they are available.'}</p><button type="button" className="notification-button" onClick={()=>setRetry(value=>value+1)}><RefreshCw size={15}/>Try again</button></div>:<div className="notification-workspace">
   <aside className="notification-email-list" aria-label="Choose an email">
    <div className="notification-list-tools">
     <div className="notification-list-title"><h3>Emails <span>{items.length}</span></h3>{dirtyCount>0&&<span className="notification-unsaved-count">{dirtyCount} unsaved</span>}</div>
     <label className="notification-search"><Search size={16}/><input type="search" aria-label="Find an email" placeholder="Find an email…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</label>
     <div className="notification-filters"><label><span className="notification-sr-only">Email category</span><select value={group} onChange={event=>setGroup(event.target.value)} aria-label="Email category"><option value="all">All categories</option>{groups.map(name=><option key={name}>{name}</option>)}</select></label><label><span className="notification-sr-only">Email status</span><select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Email status"><option value="all">All statuses</option><option value="on">On</option><option value="off">Off</option><option value="unsaved">Unsaved</option></select></label></div>
    </div>
    <nav aria-label="Email templates">
     {groups.filter(name=>filtered.some(row=>row.group===name)).map(name=><section key={name}><h4>{name}<span>{filtered.filter(row=>row.group===name).length}</span></h4>{filtered.filter(row=>row.group===name).map(row=>{
      const changed=emailHasChanges(row,drafts[row.id]),on=(drafts[row.id]||row).enabled;
      return <button key={row.id} type="button" aria-label={`${row.label}. To: ${row.recipient==='Existing admin notification address'?'Admin team':row.recipient}. ${on?'On':'Off'}${changed?'. Unsaved changes':''}`} disabled={busy} aria-current={selected===row.id?'true':undefined} onClick={()=>choose(row.id)}><span className="notification-list-copy"><strong>{row.label}</strong><small>{row.recipient==='Existing admin notification address'?'Admin team':row.recipient}</small></span><span className={`notification-list-status${on?' is-on':''}`}>{on?'On':'Off'}</span>{changed&&<span className="notification-unsaved-dot" aria-hidden="true" title="Unsaved changes"/>}<ChevronRight size={14} className="notification-list-arrow" aria-hidden="true"/></button>;
     })}</section>)}
     {!filtered.length&&<div className="notification-list-empty"><Search size={22}/><strong>No matching emails</strong><p>Try another search or clear your filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>}
    </nav>
    <div className="notification-list-foot"><span className="notification-status-dot"/>{items.filter(row=>row.enabled).length} of {items.length} emails on<span className="notification-sr-only"> in saved settings</span></div>
   </aside>
   <div ref={panel} className="notification-panel">
    {item&&draft&&<form className="notification-editor" onSubmit={save} noValidate>
     <button className="notification-back" type="button" onClick={()=>setMobileEditor(false)}><ArrowLeft size={16}/>All emails</button>
     <header className="notification-event-row">
      <div><span className="notification-eyebrow">{item.group}</span><h3 ref={heading} tabIndex={-1}>{item.label}</h3><p>{item.when}</p></div>
      <button className="notification-toggle" type="button" role="switch" aria-label="Enable this email" aria-checked={draft.enabled} disabled={busy} onClick={()=>change('enabled',!draft.enabled)}><span className="notification-switch" aria-hidden="true"><span className="notification-switch-thumb"/></span><span aria-hidden="true">{draft.enabled?'On':'Off'}</span></button>
     </header>
     <div className="notification-context"><span><Users size={14}/><b>To</b> {item.recipient==='Existing admin notification address'?'Admin notification address':item.recipient}</span><span><Clock3 size={14}/>{draft.leadHours===null?'Sent when triggered':reminderTiming(draft.leadHours)}</span></div>
     {!draft.enabled&&<p className="notification-off-note">{item.enabled?'Save to turn this email off.':'This email is off. Turn it on and save to enable it.'}</p>}
     <div className="notification-editor-tabs" role="tablist" aria-label="Email view" onKeyDown={changeTab}><button ref={editTab} id="notification-edit-tab" role="tab" aria-selected={view==='edit'} tabIndex={view==='edit'?0:-1} aria-controls="notification-edit-panel" type="button" disabled={busy} onClick={()=>setView('edit')}><PenLine size={15}/>Edit email</button><button ref={previewTab} id="notification-preview-tab" role="tab" aria-selected={view==='preview'} tabIndex={view==='preview'?0:-1} aria-controls="notification-preview-panel" type="button" disabled={busy} onClick={showPreview}><Eye size={15}/>Preview</button><span>{dirty?<><i/>Unsaved changes</>:<><Check size={13}/>All changes saved</>}</span></div>
     {error&&<div className="notification-feedback is-error" role="alert"><AlertCircle size={17}/><div><p>{error}</p>{conflict&&<><button type="button" disabled={busy} onClick={reloadSelected}>Load latest saved version</button><small>This replaces this email’s draft. Other drafts are kept.</small></>}</div></div>}
     {notice&&<p className="notification-feedback" role="status"><CheckCircle2 size={16}/>{notice}</p>}
     {view==='edit'?<div id="notification-edit-panel" role="tabpanel" aria-labelledby="notification-edit-tab" className="notification-edit-content">
      {draft.leadHours!==null&&<section className="notification-reminder" aria-labelledby="notification-reminder-title"><div><Clock3 size={18}/><div><h4 id="notification-reminder-title">Reminder timing</h4><p>How far in advance should this email go out?</p></div></div><div className="notification-reminder-controls"><label htmlFor="notification-lead"><span>Send</span><input id="notification-lead" aria-label="Reminder lead time in hours" aria-invalid={Boolean(invalid.leadHours)} aria-describedby={invalid.leadHours?'notification-leadHours-error':'notification-reminder-help'} type="number" min="0.25" max="720" step="any" value={draft.leadHours} disabled={busy} onChange={event=>change('leadHours',event.target.value===''?'':Number(event.target.value))}/><span>hours before</span></label><div className="notification-reminder-presets">{[1,24,48].map(hours=><button key={hours} type="button" disabled={busy} aria-pressed={draft.leadHours===hours} onClick={()=>change('leadHours',hours)}>{hours===1?'1 hour':hours===24?'1 day':'2 days'}</button>)}</div></div><p id="notification-reminder-help" className="notification-help">Reminders are checked every 10 minutes.</p>{fieldError('leadHours')}</section>}
      <div className="notification-field"><div className="notification-field-label"><label htmlFor="notification-subject">Subject</label><small>{draft.subject.length}/200</small></div><EmailTextEditor key={`${selected}-subject`} ref={subject} id="notification-subject" label="Email subject" singleLine value={draft.subject} disabled={busy} invalid={Boolean(invalid.subject)} describedBy={invalid.subject?'notification-subject-error':undefined} onFocus={()=>setActiveField('subject')} onChange={value=>change('subject',value)}/>{fieldError('subject')}</div>
      <div className="notification-field notification-message">
       <div className="notification-field-label"><label htmlFor="notification-message">Message</label><div className="notification-message-actions"><button type="button" className="notification-ai-suggest" disabled={busy} onClick={suggestBody}>{action==='suggest'?<RefreshCw size={14} className="notification-spinner"/>:<Sparkles size={14}/>} {action==='suggest'?'Suggesting…':'Suggest body'}</button><details className="notification-details" key={selected}><summary>Personalize <span>＋</span></summary><div className="notification-detail-menu"><p>Insert into {activeField==='subject'?'subject':'message'}. Details fill in for each recipient.</p><div>{(item.variables||[]).map(variable=><button key={variable} type="button" disabled={busy} onMouseDown={event=>event.preventDefault()} onClick={event=>{insert(variable);event.currentTarget.closest('details').open=false;}}>{emailDetailLabel(variable)}{item.required?.includes(variable)&&<small>Required in message</small>}</button>)}</div></div></details></div></div>
       {bodySuggestion?.id===selected&&<section className="notification-ai-review" aria-label="AI body suggestion"><header><span><Sparkles size={14}/>Suggested body</span><button type="button" aria-label="Dismiss suggestion" onClick={()=>setBodySuggestion(null)}><X size={15}/></button></header><p>{templateSegments(bodySuggestion.body).map((part,index)=>part.variable?<span key={index} className="notification-detail-chip">{emailDetailLabel(part.variable)}</span>:part.text)}</p><footer><small>Review before using. Your message is unchanged.</small><button type="button" disabled={busy} onClick={()=>{change('body',bodySuggestion.body);requestAnimationFrame(()=>document.getElementById('notification-message')?.focus());}}>Use suggested body</button></footer></section>}
       <EmailTextEditor key={selected} ref={message} id="notification-message" label="Email message" value={draft.body} disabled={busy} invalid={Boolean(invalid.body)} describedBy={invalid.body?'notification-body-error':'notification-message-help'} onFocus={()=>setActiveField('body')} onChange={value=>change('body',value)}/>
       <div className="notification-message-help"><p id="notification-message-help">Write in plain text. Use Personalize to add names, dates, and links.</p><small>{draft.body.length.toLocaleString()}/12,000</small></div>
       {fieldError('body')}
       {missing.length>0&&<div className="notification-required"><span><AlertCircle size={14}/>Keep these details in the message</span><div>{missing.map(variable=><button type="button" key={variable} disabled={busy} onMouseDown={event=>event.preventDefault()} onClick={()=>message.current?.insert(variable)}>+ {emailDetailLabel(variable)}</button>)}</div></div>}
      </div>
      <button type="button" className="notification-shared-link" aria-label="Edit shared photo and branding" aria-describedby="notification-shared-help" aria-controls="notification-shared-design" onClick={()=>{openDesign();designTab.current?.focus();}}><PanelsTopLeft size={18}/><span><strong>Edit shared photo and branding</strong><small id="notification-shared-help">Applies to every automated email</small></span><ChevronRight size={16}/></button>
     </div>:<div id="notification-preview-panel" className="notification-preview-panel" role="tabpanel" aria-labelledby="notification-preview-tab">
      <div className="notification-preview-caption"><Eye size={15}/><span>Sample preview · No email is sent</span></div>
      {action==='preview'?<div className="notification-loading" role="status"><RefreshCw size={20} className="notification-spinner"/>Preparing preview…</div>:preview?<div className="notification-email-canvas"><iframe title="Email preview" sandbox="" srcDoc={emailPreviewHtml(preview.html)}/></div>:<div className="notification-empty"><Eye size={26}/><p>The preview couldn’t be generated.</p><button type="button" className="notification-button" disabled={busy} onClick={showPreview}>Try preview again</button></div>}
     </div>}
     <footer><p>{dirty?'Changes apply after saving.':'Saved settings are used for future emails.'}</p><div><button type="button" className="notification-discard" disabled={busy||!dirty} onClick={discard}>Discard changes</button><button type="submit" className="notification-save" disabled={busy||!dirty}>{action==='save'?<RefreshCw size={15} className="notification-spinner"/>:<Save size={15}/>} {action==='save'?'Saving…':'Save changes'}</button></div></footer>
    </form>}
   </div>
  </div>}
  </div>
 </section>;
}
