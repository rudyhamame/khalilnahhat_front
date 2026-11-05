import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, MessageCircle, Mic, Pencil, Send, Square, Trash2, X } from 'lucide-react';
import { deleteEchoProjectChatMessage, editEchoProjectChatMessage, fetchEchoProjectChat, sendEchoProjectChat } from '../lib/api';
import useProjectChatNotifications from './useProjectChatNotifications';
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
  const [deletingId,setDeletingId]=useState('');
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const endRef = useRef(null),recorderRef = useRef(null),chunksRef = useRef([]),captureRef=useRef(null);
  const alive=useRef(false),revision=useRef(0),requestNumber=useRef(0);
  const {unreadCount,onlineAdmins,presenceError,markRead}=useProjectChatNotifications({userId,token,open:open||fullPage});
  useEffect(()=>{
    alive.current=true;
    return()=>{
      alive.current=false;requestNumber.current++;
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
      const rows=result.items||[];setItems(rows);setLoadError('');
      await markRead(rows.at(-1)?.id);
    } catch (cause) { if(alive.current&&number===requestNumber.current)setLoadError(cause.message || 'Chat is unavailable.'); }
  }, [token,markRead]);
  useEffect(() => {
    if (!open&&!fullPage) return undefined;
    refresh();const interval=window.setInterval(refresh,5000);
    const visible=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visible);
    return()=>{requestNumber.current++;window.clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  }, [open,fullPage,refresh]);
  useEffect(() => { if(open||fullPage)endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length, open,fullPage]);

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
  const toggleRecording = async () => {
    if(busy||preparingVoice)return;
    if (recording) { recorderRef.current?.stop(); return; }
    if(captureRef.current||capturePending.current)return;
    capturePending.current=true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if(!alive.current){stream.getTracks().forEach(track=>track.stop());return;}
      captureRef.current=stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg','audio/mp4'].find(type => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());captureRef.current=null;if(alive.current){setRecording(false);setError('Voice note could not be recorded.');}};
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());captureRef.current=null;
        if(!alive.current)return;setRecording(false);setPreparingVoice(true);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size||blob.size > 5_000_000) { setPreparingVoice(false);setError(blob.size?'Voice note must be under 5 MB.':'No audio was recorded. Please try again.'); return; }
        try { const mimeType = blob.type.split(';')[0]; const data = await fileData(blob);if(alive.current){setAttachment({ type: 'audio', name: 'Voice note', mimeType, data: `data:${mimeType};base64,${String(data).split(',').slice(1).join(',')}` });setError('');} } catch { if(alive.current)setError('Could not prepare this voice note.'); }finally{if(alive.current)setPreparingVoice(false);}
      };
      recorder.start(); setRecording(true);setAttachment(null);setError('');
    } catch {captureRef.current?.getTracks().forEach(track=>track.stop());captureRef.current=null;if(alive.current)setError('Allow microphone access to record a voice note.');}finally{capturePending.current=false;}
  };

  return <>
    {!fullPage && <button type="button" className={`echo-chat-launch${unreadCount>0&&!open?' has-unread':''}`} onClick={() => setOpen(true)} aria-label={`Open Production Chat${unreadCount?`, ${unreadCount} unread messages`:''}`}><MessageCircle size={21}/>{unreadCount>0&&<span className="epc-unread" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>}</button>}
    {(open || fullPage) && <section className={`echo-project-chat ${fullPage ? 'is-page' : ''}`} aria-label="Echo production readiness chat">
      <header><span className="epc-avatar"><MessageCircle size={17}/></span><div><strong>Echo project chat</strong><small>RH · Khalil</small></div>{!fullPage && <button type="button" className="epc-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button>}</header>
      <div className="epc-online" aria-label="Online admins"><strong>Online admins <span>{onlineAdmins.length}</span></strong>{presenceError?<small role="status">{presenceError}</small>:onlineAdmins.length?<ul>{onlineAdmins.map(admin=><li key={admin.id}><i aria-hidden="true"/>{admin.name}{admin.id===userId?' (you)':''}</li>)}</ul>:<small>No admins currently online.</small>}</div>
      <div className="epc-purpose"><strong>Production readiness</strong><p>Khalil, use this chat with RH to discuss the overall state of the app, bugs, and what needs to be ready before production.</p></div>
      <div className="epc-messages" aria-live="polite">{items.length === 0 && <p className="epc-empty">Start the conversation about Echo’s production readiness.</p>}{items.map(item => <article className="epc-message" key={item.id}>
        <small>{item.senderName}</small>
        {editing?.id===item.id?<form className="epc-edit" onSubmit={saveEdit}><textarea aria-label="Edit text message" autoFocus value={editing.content} maxLength={2000} disabled={saving} onChange={event=>setEditing({...editing,content:event.target.value})}/><div><button type="submit" disabled={saving||!editing.content.trim()}>{saving?'Saving…':'Save'}</button><button type="button" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button></div></form>:item.content&&<p>{item.content}</p>}
        {item.attachment?.type === 'image' && <img src={item.attachment.data} alt={item.attachment.name || 'Shared image'} />}{item.attachment?.type === 'audio' && <audio aria-label={`Voice note from ${item.senderName}`} controls preload="metadata" src={item.attachment.data}/>}
        <div className="epc-message-meta"><time>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}{item.editedAt?' · Edited':''}</time>{item.senderId===userId&&<div className="epc-message-actions">{!item.attachment&&<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Edit text message" title="Edit text message" onClick={()=>{setEditing({id:item.id,content:item.content,original:item.content});setError('');}}><Pencil size={13}/></button>}<button type="button" disabled={saving||Boolean(deletingId)} aria-label="Delete message" title="Delete message" onClick={()=>remove(item)}><Trash2 size={13}/></button></div>}</div>
      </article>)}<div ref={endRef}/></div>
      {(error||loadError) && <p className="epc-error" role="alert">{error||loadError}</p>}
      {attachment && <div className="epc-attachment">{attachment.type === 'image' ? <img src={attachment.data} alt="Image to send"/> : <div className="epc-voice-preview"><span>Listen before sending</span><audio aria-label="Recorded voice note preview" controls preload="metadata" src={attachment.data}/></div>}<button type="button" disabled={busy} onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={15}/></button></div>}
      {(recording||preparingVoice)&&<p className="epc-recording-status" role="status">{preparingVoice?'Preparing voice note preview…':'Recording… Stop to preview your voice note.'}</p>}
      <form className="epc-compose" onSubmit={send}><textarea value={text} disabled={busy} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="Message about the app…" aria-label="Chat message"/><div><label className="epc-tool" title="Attach image"><ImagePlus size={18}/><input disabled={busy||recording||preparingVoice} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage}/></label><button type="button" disabled={busy||preparingVoice} className={`epc-tool ${recording ? 'is-recording' : ''}`} onClick={toggleRecording} aria-label={recording ? 'Stop recording' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square size={17}/> : <Mic size={18}/>}</button><button className="epc-send" type="submit" disabled={busy || recording || preparingVoice || (!text.trim() && !attachment)} aria-label="Send message"><Send size={16}/></button></div></form>
    </section>}
  </>;
}
