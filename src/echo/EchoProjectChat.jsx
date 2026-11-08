import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Hash, Plus, ImagePlus, MessageCircle, Mic, Pencil, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { createEchoProjectChatTopic,fetchEchoProjectChatTopics,deleteEchoProjectChatMessage, editEchoProjectChatMessage, fetchEchoProjectChat, prepareEchoProjectChatVoiceNote, sendEchoProjectChat } from '../lib/api';
import useProjectChatNotifications from './useProjectChatNotifications';
import useProjectChatMessageReceipts from './useProjectChatMessageReceipts';
import useProjectChatSound from './useProjectChatSound';
import ProjectChatSnippet from './ProjectChatSnippet';
import ProjectChatVoicePlayer from './ProjectChatVoicePlayer';
import ProjectChatCalls from './ProjectChatCalls';
import { speechCapture, voiceNoteBitrate, maxVoiceNoteMs } from './projectChatAudioSettings';
import './echoProjectChat.css';

const fileData = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });

export default function EchoProjectChat({ user, token, fullPage = false }) {
  if (user?.isAdmin !== true || !token) return null;
  return <AdminProjectChat key={user.id || user._id} user={user} token={token} fullPage={fullPage} />;
}

function AdminProjectChat({ user, token, fullPage }) {
  const userId=String(user.id||user._id||'');
  const [open, setOpen] = useState(fullPage);
  const [topics,setTopics]=useState([{id:'general',title:'General'}]);
  const [topicId,setTopicId]=useState('general'),[topicTitle,setTopicTitle]=useState(''),[creatingTopic,setCreatingTopic]=useState(false),[topicLoading,setTopicLoading]=useState(true);
  const selectedTopic=useRef('general'),topicDrafts=useRef(new Map());
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [loadError,setLoadError]=useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparingVoice,setPreparingVoice]=useState(false);
  const capturePending=useRef(false);
  const recordingTimer=useRef(null),voiceProcessing=useRef(null);
  const [pendingVoice,setPendingVoice]=useState(null);
  const [deletingId,setDeletingId]=useState('');
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [callButtonTarget,setCallButtonTarget]=useState(null);
  const [chatCalling,setChatCalling]=useState(false);
  const currentDraft=useRef({}),topicLock=useRef(false);currentDraft.current={text,attachment,pendingVoice,editing};topicLock.current=busy||recording||preparingVoice||saving||Boolean(deletingId);
  const endRef = useRef(null),recorderRef = useRef(null),chunksRef = useRef([]),captureRef=useRef(null);
  const alive=useRef(false),revision=useRef(0),requestNumber=useRef(0),refreshingTopics=useRef(new Set());
  const receiptMessages=useProjectChatMessageReceipts({token,userId});
  const {soundEnabled,toggleSound,notifyIncoming}=useProjectChatSound({userId,token});
  const acknowledgeMessages=useCallback((rows,seen)=>{
    if(!seen)notifyIncoming(rows);
    return receiptMessages(rows,seen);
  },[receiptMessages,notifyIncoming]);
  const {unreadCount,topicUnreadCounts={},onlineAdmins,admins=onlineAdmins,presenceError,markRead}=useProjectChatNotifications({userId,token,open:open||fullPage,onDelivery:acknowledgeMessages});
  useEffect(()=>{
    alive.current=true;
    return()=>{
      alive.current=false;requestNumber.current++;
      window.clearTimeout(recordingTimer.current);voiceProcessing.current?.abort();
      const recorder=recorderRef.current;
      if(recorder){recorder.onstop=null;recorder.ondataavailable=null;if(recorder.state!=='inactive')recorder.stop();}
      captureRef.current?.getTracks().forEach(track=>track.stop());
    };
  },[token]);
  const refresh = useCallback(async () => {
    // On a slow production connection, the five-second poll used to start a
    // second request before the first one completed. Every response was then
    // discarded as stale, leaving the conversation looking empty despite an
    // unread badge. One request per topic keeps the newest response usable.
    if(document.hidden||refreshingTopics.current.has(topicId))return;
    refreshingTopics.current.add(topicId);
    requestNumber.current++;
    const version=revision.current;
    try {
      const result = await fetchEchoProjectChat(token,topicId);
      if(!alive.current||version!==revision.current||selectedTopic.current!==topicId)return;
      const rows=result.items;setItems(rows);setLoadError('');setTopicLoading(false);acknowledgeMessages(rows,false);
      await markRead(rows.at(-1)?.id,topicId);
    } catch (cause) { if(alive.current&&version===revision.current&&selectedTopic.current===topicId){setLoadError(cause.message || 'Chat is unavailable.');setTopicLoading(false);} }
    finally { refreshingTopics.current.delete(topicId); }
  }, [token,topicId,markRead,acknowledgeMessages]);
  useEffect(()=>{
    if(!open&&!fullPage)return;
    let cancelled=false;
    fetchEchoProjectChatTopics(token).then(result=>{if(!cancelled&&Array.isArray(result.items))setTopics(result.items);}).catch(()=>{});
    return()=>{cancelled=true;};
  },[open,fullPage,token]);
  useEffect(() => {
    if (!open&&!fullPage) return undefined;
    refresh();const interval=window.setInterval(refresh,5000);
    const visible=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visible);
    return()=>{requestNumber.current++;window.clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  }, [open,fullPage,refresh]);
  useEffect(() => { if(open||fullPage)endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length, open,fullPage]);
  useEffect(()=>{
    if((!open&&!fullPage)||document.hidden||!items.length)return;
    const frame=requestAnimationFrame(()=>acknowledgeMessages(items,true));
    return()=>cancelAnimationFrame(frame);
  },[items,open,fullPage,acknowledgeMessages]);

  const send = async event => {
    event?.preventDefault(); if (busy || recording || preparingVoice || topicLoading || (!text.trim() && !attachment)) return;
    setBusy(true); setError('');
    try {
      const result = await sendEchoProjectChat({topicId, content: text.trim(), ...(attachment ? { attachment } : {}) }, token);
      if(!alive.current||selectedTopic.current!==topicId)return;
      if(!result.item?.id||result.item.senderId!==userId||(result.item.topicId||'general')!==topicId)throw Error('Message could not be confirmed.');
      revision.current++;setItems(current=>[...current.filter(item=>item.id!==result.item.id),result.item]);setText('');setAttachment(null);refresh();
    } catch (cause) { if(alive.current)setError(cause.message || 'Message could not be sent.'); }
    finally { if(alive.current)setBusy(false); }
  };
  const remove=async item=>{
    if(deletingId||item.senderId!==userId||!window.confirm('Delete this message for everyone in the chat?'))return;
    setDeletingId(item.id);setError('');
    try{
      const result=await deleteEchoProjectChatMessage(item.id,token);
      if(!alive.current)return;
      if(result.deleted!==true||result.id!==item.id)throw Error('Message deletion could not be confirmed.');
      revision.current++;setItems(current=>current.filter(row=>row.id!==item.id));setEditing(current=>current?.id===item.id?null:current);refresh();
    }catch(cause){if(alive.current)setError(cause.message||'Message could not be deleted.');}
    finally{if(alive.current)setDeletingId('');}
  };
  const saveEdit=async event=>{
    event.preventDefault();if(!editing?.content.trim()||saving)return;
    const change=editing;setSaving(true);setError('');
    try{
      const result=await editEchoProjectChatMessage(change.id,{content:change.content.trim(),expectedContent:change.original},token);
      if(!alive.current)return;
      if(result.item?.id!==change.id||result.item.senderId!==userId)throw Error('Message edit could not be confirmed.');
      revision.current++;setItems(current=>current.map(item=>item.id===change.id?result.item:item));setEditing(null);refresh();
    }catch(cause){if(alive.current)setError(cause.message||'Message could not be edited.');}
    finally{if(alive.current)setSaving(false);}
  };
  const chooseImage = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file||busy||recording) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 4_000_000) { setError('Choose a PNG, JPEG, WebP or GIF under 4 MB.'); return; }
    try { const data=await fileData(file);if(alive.current&&selectedTopic.current===topicId){setAttachment({ type: 'image', name: file.name, mimeType: file.type, data });setError('');} } catch { if(alive.current&&selectedTopic.current===topicId)setError('Could not read this image.'); }
  };
  const prepareVoiceDraft = async draft => {
    if(!alive.current)return;
    const controller=new AbortController();voiceProcessing.current=controller;
    setPreparingVoice(true);setError('');
    try {
      const result=await prepareEchoProjectChatVoiceNote(draft,token,controller.signal);
      if(!alive.current||controller.signal.aborted)return;
      const note=result.attachment;
      if(note?.type!=='audio'||!note.mimeType||!note.data?.startsWith(`data:${note.mimeType};base64,`))throw Error('Voice note could not be confirmed.');
      setAttachment(note);setPendingVoice(null);
    } catch(cause) {if(alive.current&&!controller.signal.aborted)setError(cause.message||'Could not prepare the voice note. Your recording is kept here for retry.');}
    finally {if(voiceProcessing.current===controller){voiceProcessing.current=null;if(alive.current)setPreparingVoice(false);}}
  };
  const toggleRecording = async () => {
    if(chatCalling){setError('End the voice call before recording a voice note.');return;}
    if(busy||preparingVoice)return;
    if (recording) { recorderRef.current?.stop(); return; }
    if(captureRef.current||capturePending.current)return;
    capturePending.current=true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: speechCapture });
      if(!alive.current){stream.getTracks().forEach(track=>track.stop());return;}
      captureRef.current=stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: voiceNoteBitrate }); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror=()=>{window.clearTimeout(recordingTimer.current);stream.getTracks().forEach(track=>track.stop());captureRef.current=null;if(alive.current){setRecording(false);setError('Voice note could not be recorded.');}};
      recorder.onstop = async () => {
        window.clearTimeout(recordingTimer.current);
        stream.getTracks().forEach(track => track.stop());captureRef.current=null;
        if(!alive.current)return;setRecording(false);setPreparingVoice(true);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size||blob.size > 5_000_000) { setPreparingVoice(false);setError(blob.size?'Voice note must be under 5 MB.':'No audio was recorded. Please try again.'); return; }
        try {
          const mimeType = blob.type.split(';')[0],data=await fileData(blob);
          if(!alive.current)return;
          const draft={type:'audio',name:'Voice note',mimeType,data:`data:${mimeType};base64,${String(data).split(',').slice(1).join(',')}`};
          setPendingVoice(draft);await prepareVoiceDraft(draft);
        } catch {if(alive.current){setPreparingVoice(false);setError('Could not prepare this voice note.');}}
      };
      recorder.start();
      recordingTimer.current=window.setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},maxVoiceNoteMs);
      setRecording(true);setAttachment(null);setPendingVoice(null);setError('');
    } catch {captureRef.current?.getTracks().forEach(track=>track.stop());captureRef.current=null;if(alive.current)setError('Allow microphone access to record a voice note.');}finally{capturePending.current=false;}
  };

  const topicLocked=busy||recording||preparingVoice||saving||Boolean(deletingId);
  const selectTopic=id=>{
    if(id===selectedTopic.current||topicLock.current||capturePending.current||captureRef.current)return;
    topicDrafts.current.set(selectedTopic.current,currentDraft.current);
    selectedTopic.current=id;requestNumber.current++;revision.current++;
    const draft=topicDrafts.current.get(id)||{};
    setTopicId(id);setItems([]);setText(draft.text||'');setAttachment(draft.attachment||null);setPendingVoice(draft.pendingVoice||null);setEditing(draft.editing||null);setError('');setLoadError('');setTopicLoading(true);
  };
  const createTopic=async event=>{
    event.preventDefault();if(!topicTitle.trim()||creatingTopic||topicLocked||capturePending.current)return;
    setCreatingTopic(true);setError('');
    try{const result=await createEchoProjectChatTopic(topicTitle.trim(),token);if(!alive.current)return;if(!result.item?.id||!result.item.title)throw Error('Discussion topic could not be confirmed.');setTopics(current=>[...current.filter(topic=>topic.id!==result.item.id),result.item]);setTopicTitle('');selectTopic(result.item.id);}
    catch(cause){if(alive.current)setError(cause.message||'Discussion topic could not be created.');}
    finally{if(alive.current)setCreatingTopic(false);}
  };
  const activeTopic=topics.find(topic=>topic.id===topicId);

  return <>
    <ProjectChatCalls userId={userId} token={token} onlineAdmins={onlineAdmins} buttonTarget={callButtonTarget} soundEnabled={soundEnabled} recording={recording||preparingVoice} onActiveChange={setChatCalling}/>
    {!fullPage && <button type="button" className={`echo-chat-launch${unreadCount>0&&!open?' has-unread':''}`} onClick={() => setOpen(true)} aria-label={`Open Production Chat${unreadCount?`, ${unreadCount} unread messages`:''}`}><MessageCircle size={21}/>{unreadCount>0&&<span className="epc-unread" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>}</button>}
    {(open || fullPage) && <section className={`echo-project-chat ${fullPage ? 'is-page' : ''}`} aria-label="Echo production readiness chat">
      <header><span className="epc-avatar" aria-hidden="true"/><div className="epc-heading"><strong>Echo project chat</strong><small>RH · Khalil <span>Private workspace</span></small></div><span className="epc-call-slot" ref={setCallButtonTarget}/><button type="button" className="epc-sound" onClick={toggleSound} aria-label={soundEnabled?'Mute notification sound':'Enable notification sound'} aria-pressed={soundEnabled} title={soundEnabled?'Mute notification sound':'Enable notification sound'}>{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>{!fullPage && <button type="button" className="epc-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button>}</header>
      <div className="epc-online" aria-label="Administrators and last login times"><strong>Admins <span>{onlineAdmins.length} online</span></strong>{presenceError&&<small role="status">{presenceError}</small>}{admins.length?<ul>{admins.map(admin=><li key={admin.id} data-online={!presenceError&&(admin.online??onlineAdmins.some(person=>person.id===admin.id))}><i aria-hidden="true"/><div><span>{admin.name}{admin.id===userId?' (you)':''} · {presenceError?'Status unavailable':(admin.online??onlineAdmins.some(person=>person.id===admin.id))?'Online':'Offline'}</span><small>Last login: {admin.lastLoginAt?<time dateTime={new Date(admin.lastLoginAt).toISOString()} title={new Date(admin.lastLoginAt).toLocaleString([], {dateStyle:'full',timeStyle:'long'})}>{new Date(admin.lastLoginAt).toLocaleString([], {dateStyle:'short',timeStyle:'medium'})}</time>:'Not recorded yet'}</small></div></li>)}</ul>:<small>Admin login times will appear here.</small>}</div>
      <div className="epc-workspace"><aside className="epc-topics" aria-label="Discussion topics"><strong>Discussion topics</strong><nav aria-label="Choose discussion topic">{topics.map(topic=><button key={topic.id} type="button" aria-current={topic.id===topicId?'page':undefined} disabled={topicLocked||creatingTopic} onClick={()=>selectTopic(topic.id)}><Hash size={14} aria-hidden="true"/><span>{topic.title}</span>{topicUnreadCounts[topic.id]>0&&<small aria-label={`${topicUnreadCounts[topic.id]} unread`}>{topicUnreadCounts[topic.id]}</small>}</button>)}</nav><form onSubmit={createTopic}><label htmlFor={`epc-topic-${fullPage?'page':'popup'}`}>New topic</label><input id={`epc-topic-${fullPage?'page':'popup'}`} value={topicTitle} maxLength={80} disabled={topicLocked||creatingTopic} onChange={event=>setTopicTitle(event.target.value)} placeholder="Topic name"/><button type="submit" disabled={topicLocked||creatingTopic||!topicTitle.trim()}><Plus size={14} aria-hidden="true"/>{creatingTopic?'Creating…':'Add topic'}</button></form></aside><div className="epc-conversation"><h3 className="epc-topic-heading">{activeTopic?.title||'Discussion'}</h3>
      <div className="epc-messages" aria-live="polite" aria-label={`Messages in ${activeTopic?.title||'discussion'}`}>{topicLoading&&<p className="epc-empty" role="status">Loading messages…</p>}{!topicLoading&&!loadError&&items.length === 0 && <p className="epc-empty">Start the discussion. Send the first message in this topic.</p>}{items.map(item => <article className={`epc-message ${item.senderId===userId?'is-own':'is-incoming'}`} key={item.id}>
        <small>{item.senderName}</small>
        {editing?.id===item.id?<form className="epc-edit" onSubmit={saveEdit}><textarea aria-label="Edit text message" autoFocus value={editing.content} maxLength={2000} disabled={saving} onChange={event=>setEditing({...editing,content:event.target.value})}/><div><button type="submit" disabled={saving||!editing.content.trim()}>{saving?'Saving…':'Save'}</button><button type="button" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button></div></form>:item.content&&<p>{item.content}</p>}
        {item.attachment?.type === 'image' && <img src={item.attachment.data} alt={item.attachment.name || 'Shared image'} />}{item.attachment?.type === 'audio' && <ProjectChatVoicePlayer label={`Voice note from ${item.senderName}`} src={item.attachment.data}/>}
        <div className="epc-message-meta"><div className="epc-delivery-times" aria-label="Message delivery status">{[['Sent',item.sentAt||item.createdAt,'Saved by the server'],['Delivered',item.deliveredAt,'Received by at least one other admin'],['Seen',item.seenAt,'Opened by at least one other admin']].map(([label,at,description])=><span key={label} title={description}>{label} {at?<time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString()}>{new Date(at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</time>:<small>Pending</small>}</span>)}{item.editedAt&&<small>Edited</small>}</div>{item.senderId===userId&&<div className="epc-message-actions">{!item.attachment&&<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Edit text message" title="Edit text message" onClick={()=>{setEditing({id:item.id,content:item.content,original:item.content});setError('');}}><Pencil size={13}/></button>}<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Delete message" title="Delete message" onClick={()=>remove(item)}><Trash2 size={13}/></button></div>}</div>
      </article>)}<div ref={endRef}/></div>
      {(error||loadError) && <p className="epc-error" role="alert">{error||loadError}</p>}
      {attachment && <div className="epc-attachment">{attachment.type === 'image' ? <img src={attachment.data} alt="Image to send"/> : <div className="epc-voice-preview"><span>Listen before sending</span><ProjectChatVoicePlayer label="Recorded voice note preview" preview src={attachment.data}/></div>}<button type="button" disabled={busy} onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={15}/></button></div>}
      {(recording||preparingVoice)&&<p className="epc-recording-status" role="status">{preparingVoice?'Polishing your voice note…':'Recording… Stop to preview. Up to 5 minutes.'}</p>}
      {pendingVoice&&!preparingVoice&&<div className="epc-voice-retry"><span>Your recording is kept here.</span><button type="button" onClick={()=>prepareVoiceDraft(pendingVoice)}>Retry</button><button type="button" onClick={()=>{setPendingVoice(null);setError('');}}>Discard</button></div>}
      <form className="epc-compose" onSubmit={send}><textarea value={text} disabled={busy} maxLength={2000} onChange={event => setText(event.target.value)} placeholder={`Message ${activeTopic?.title||'this topic'}…`} aria-label="Chat message"/><div><ProjectChatSnippet disabled={busy||recording||preparingVoice} onError={setError} onAttach={note=>{if(selectedTopic.current===topicId)setAttachment(note);}}/><label className="epc-tool" title="Attach image"><ImagePlus size={18}/><input disabled={busy||recording||preparingVoice} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage}/></label><button type="button" disabled={busy||preparingVoice||chatCalling} className={`epc-tool ${recording ? 'is-recording' : ''}`} onClick={toggleRecording} aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square size={17}/> : <Mic size={18}/>}</button><button className="epc-send" type="submit" disabled={busy || recording || preparingVoice || topicLoading || (!text.trim() && !attachment)} aria-label="Send message"><ArrowUp size={19}/></button></div></form>
      </div></div>
    </section>}
  </>;
}
