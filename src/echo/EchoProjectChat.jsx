import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ImagePlus, MessageCircle, Mic, Pencil, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { deleteEchoProjectChatMessage, editEchoProjectChatMessage, fetchEchoProjectChat, prepareEchoProjectChatVoiceNote, sendEchoProjectChat } from '../lib/api';
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
  const endRef = useRef(null),recorderRef = useRef(null),chunksRef = useRef([]),captureRef=useRef(null);
  const alive=useRef(false),revision=useRef(0),requestNumber=useRef(0);
  const receiptMessages=useProjectChatMessageReceipts({token,userId});
  const {soundEnabled,toggleSound,notifyIncoming}=useProjectChatSound({userId,token});
  const acknowledgeMessages=useCallback((rows,seen)=>{
    if(!seen)notifyIncoming(rows);
    return receiptMessages(rows,seen);
  },[receiptMessages,notifyIncoming]);
  const {unreadCount,onlineAdmins,presenceError,markRead}=useProjectChatNotifications({userId,token,open:open||fullPage,onDelivery:acknowledgeMessages});
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
    if(document.hidden)return;
    const number=++requestNumber.current,version=revision.current;
    try {
      const result = await fetchEchoProjectChat(token);
      if(!alive.current||number!==requestNumber.current||version!==revision.current)return;
      const rows=result.items||[];acknowledgeMessages(rows,false);setItems(rows);setLoadError('');
      await markRead(rows.at(-1)?.id);
    } catch (cause) { if(alive.current&&number===requestNumber.current)setLoadError(cause.message || 'Chat is unavailable.'); }
  }, [token,markRead,acknowledgeMessages]);
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
    event?.preventDefault(); if (busy || recording || preparingVoice || (!text.trim() && !attachment)) return;
    setBusy(true); setError('');
    try {
      const result = await sendEchoProjectChat({ content: text.trim(), ...(attachment ? { attachment } : {}) }, token);
      if(!alive.current)return;
      if(!result.item?.id||result.item.senderId!==userId)throw Error('Message could not be confirmed.');
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
    try { const data=await fileData(file);if(alive.current){setAttachment({ type: 'image', name: file.name, mimeType: file.type, data });setError('');} } catch { if(alive.current)setError('Could not read this image.'); }
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

  return <>
    <ProjectChatCalls userId={userId} token={token} onlineAdmins={onlineAdmins} buttonTarget={callButtonTarget} soundEnabled={soundEnabled} recording={recording||preparingVoice} onActiveChange={setChatCalling}/>
    {!fullPage && <button type="button" className={`echo-chat-launch${unreadCount>0&&!open?' has-unread':''}`} onClick={() => setOpen(true)} aria-label={`Open Production Chat${unreadCount?`, ${unreadCount} unread messages`:''}`}><MessageCircle size={21}/>{unreadCount>0&&<span className="epc-unread" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>}</button>}
    {(open || fullPage) && <section className={`echo-project-chat ${fullPage ? 'is-page' : ''}`} aria-label="Echo production readiness chat">
      <header><span className="epc-avatar" aria-hidden="true"/><div className="epc-heading"><strong>Echo project chat</strong><small>RH · Khalil <span>Private workspace</span></small></div><span className="epc-call-slot" ref={setCallButtonTarget}/><button type="button" className="epc-sound" onClick={toggleSound} aria-label={soundEnabled?'Mute notification sound':'Enable notification sound'} aria-pressed={soundEnabled} title={soundEnabled?'Mute notification sound':'Enable notification sound'}>{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>{!fullPage && <button type="button" className="epc-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button>}</header>
      <div className="epc-online" aria-label="Online admins"><strong>Online admins <span>{onlineAdmins.length}</span></strong>{presenceError?<small role="status">{presenceError}</small>:onlineAdmins.length?<ul>{onlineAdmins.map(admin=><li key={admin.id}><i aria-hidden="true"/>{admin.name}{admin.id===userId?' (you)':''}</li>)}</ul>:<small>No admins currently online.</small>}</div>
      <div className="epc-messages" aria-live="polite">{items.length === 0 && <p className="epc-empty">A little space for the big picture. Send the first message.</p>}{items.map(item => <article className={`epc-message ${item.senderId===userId?'is-own':'is-incoming'}`} key={item.id}>
        <small>{item.senderName}</small>
        {editing?.id===item.id?<form className="epc-edit" onSubmit={saveEdit}><textarea aria-label="Edit text message" autoFocus value={editing.content} maxLength={2000} disabled={saving} onChange={event=>setEditing({...editing,content:event.target.value})}/><div><button type="submit" disabled={saving||!editing.content.trim()}>{saving?'Saving…':'Save'}</button><button type="button" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button></div></form>:item.content&&<p>{item.content}</p>}
        {item.attachment?.type === 'image' && <img src={item.attachment.data} alt={item.attachment.name || 'Shared image'} />}{item.attachment?.type === 'audio' && <ProjectChatVoicePlayer label={`Voice note from ${item.senderName}`} src={item.attachment.data}/>}
        <div className="epc-message-meta"><div className="epc-delivery-times" aria-label="Message delivery status">{[['Sent',item.sentAt||item.createdAt,'Saved by the server'],['Delivered',item.deliveredAt,'Received by at least one other admin'],['Seen',item.seenAt,'Opened by at least one other admin']].map(([label,at,description])=><span key={label} title={description}>{label} {at?<time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString()}>{new Date(at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</time>:<small>Pending</small>}</span>)}{item.editedAt&&<small>Edited</small>}</div>{item.senderId===userId&&<div className="epc-message-actions">{!item.attachment&&<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Edit text message" title="Edit text message" onClick={()=>{setEditing({id:item.id,content:item.content,original:item.content});setError('');}}><Pencil size={13}/></button>}<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Delete message" title="Delete message" onClick={()=>remove(item)}><Trash2 size={13}/></button></div>}</div>
      </article>)}<div ref={endRef}/></div>
      {(error||loadError) && <p className="epc-error" role="alert">{error||loadError}</p>}
      {attachment && <div className="epc-attachment">{attachment.type === 'image' ? <img src={attachment.data} alt="Image to send"/> : <div className="epc-voice-preview"><span>Listen before sending</span><ProjectChatVoicePlayer label="Recorded voice note preview" preview src={attachment.data}/></div>}<button type="button" disabled={busy} onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={15}/></button></div>}
      {(recording||preparingVoice)&&<p className="epc-recording-status" role="status">{preparingVoice?'Polishing your voice note…':'Recording… Stop to preview. Up to 5 minutes.'}</p>}
      {pendingVoice&&!preparingVoice&&<div className="epc-voice-retry"><span>Your recording is kept here.</span><button type="button" onClick={()=>prepareVoiceDraft(pendingVoice)}>Retry</button><button type="button" onClick={()=>{setPendingVoice(null);setError('');}}>Discard</button></div>}
      <form className="epc-compose" onSubmit={send}><textarea value={text} disabled={busy} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="Write a message…" aria-label="Chat message"/><div><ProjectChatSnippet disabled={busy||recording||preparingVoice} onError={setError} onAttach={setAttachment}/><label className="epc-tool" title="Attach image"><ImagePlus size={18}/><input disabled={busy||recording||preparingVoice} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage}/></label><button type="button" disabled={busy||preparingVoice||chatCalling} className={`epc-tool ${recording ? 'is-recording' : ''}`} onClick={toggleRecording} aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square size={17}/> : <Mic size={18}/>}</button><button className="epc-send" type="submit" disabled={busy || recording || preparingVoice || (!text.trim() && !attachment)} aria-label="Send message"><ArrowUp size={19}/></button></div></form>
    </section>}
  </>;
}
