import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, MessageCircle, Mic, Send, Square, X } from 'lucide-react';
import { fetchEchoProjectChat, sendEchoProjectChat } from '../lib/api';
import './echoProjectChat.css';

const fileData = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });

export default function EchoProjectChat({ token, fullPage = false }) {
  const [open, setOpen] = useState(fullPage);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const endRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const refresh = useCallback(async () => {
    try { const result = await fetchEchoProjectChat(token); setItems(result.items || []); setError(''); }
    catch (cause) { setError(cause.message || 'Chat is unavailable.'); }
  }, [token]);
  useEffect(() => { if (!open) return undefined; refresh(); const interval = window.setInterval(refresh, 5000); return () => window.clearInterval(interval); }, [open, refresh]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length, open]);

  const send = async event => {
    event?.preventDefault(); if (busy || (!text.trim() && !attachment)) return;
    setBusy(true); setError('');
    try { const result = await sendEchoProjectChat({ content: text.trim(), ...(attachment ? { attachment } : {}) }, token); setItems(current => [...current, result.item]); setText(''); setAttachment(null); }
    catch (cause) { setError(cause.message || 'Message could not be sent.'); }
    finally { setBusy(false); }
  };
  const chooseImage = async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 4_000_000) { setError('Choose a PNG, JPEG, WebP or GIF under 4 MB.'); return; } try { setAttachment({ type: 'image', name: file.name, mimeType: file.type, data: await fileData(file) }); setError(''); } catch { setError('Could not read this image.'); } };
  const toggleRecording = async () => {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => { stream.getTracks().forEach(track => track.stop()); setRecording(false); const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }); if (blob.size > 5_000_000) { setError('Voice note must be under 5 MB.'); return; } try { const mimeType = blob.type.split(';')[0]; const data = await fileData(blob); setAttachment({ type: 'audio', name: 'Voice note', mimeType, data: data.replace(/^data:[^;]+;/, `data:${mimeType};`) }); setError(''); } catch { setError('Could not prepare this voice note.'); } };
      recorder.start(); setRecording(true); setError('');
    } catch { setError('Allow microphone access to record a voice note.'); }
  };

  return <>
    {!fullPage && <button className="echo-chat-launch" onClick={() => setOpen(true)} aria-label="Open RH and Khalil project chat"><MessageCircle size={21}/><span>Project chat</span></button>}
    {(open || fullPage) && <section className={`echo-project-chat ${fullPage ? 'is-page' : ''}`} aria-label="Echo production readiness chat">
      <header><span className="epc-avatar"><MessageCircle size={17}/></span><div><strong>Echo project chat</strong><small>RH · Khalil</small></div>{!fullPage && <button className="epc-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button>}</header>
      <div className="epc-purpose"><strong>Production readiness</strong><p>Khalil, use this chat with RH to discuss the overall state of the app, bugs, and what needs to be ready before production.</p></div>
      <div className="epc-messages" aria-live="polite">{items.length === 0 && <p className="epc-empty">Start the conversation about Echo’s production readiness.</p>}{items.map(item => <article className="epc-message" key={item.id}><small>{item.senderName}</small>{item.content && <p>{item.content}</p>}{item.attachment?.type === 'image' && <img src={item.attachment.data} alt={item.attachment.name || 'Shared image'} />}{item.attachment?.type === 'audio' && <audio controls preload="metadata" src={item.attachment.data}/>}<time>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</time></article>)}<div ref={endRef}/></div>
      {error && <p className="epc-error" role="alert">{error}</p>}
      {attachment && <div className="epc-attachment">{attachment.type === 'image' ? <img src={attachment.data} alt="Image to send"/> : <span>Voice note ready</span>}<button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={15}/></button></div>}
      <form className="epc-compose" onSubmit={send}><textarea value={text} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="Message about the app…" aria-label="Chat message"/><div><label className="epc-tool" title="Attach image"><ImagePlus size={18}/><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage}/></label><button type="button" className={`epc-tool ${recording ? 'is-recording' : ''}`} onClick={toggleRecording} title={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square size={17}/> : <Mic size={18}/>}</button><button className="epc-send" type="submit" disabled={busy || (!text.trim() && !attachment)} aria-label="Send message"><Send size={16}/></button></div></form>
    </section>}
  </>;
}
