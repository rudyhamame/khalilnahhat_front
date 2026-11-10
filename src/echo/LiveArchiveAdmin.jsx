import AdminSelect from '../components/AdminSelect';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, Film, RefreshCw, Scissors, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { apiRequest } from '../lib/api';
import LiveRecordingTrimmer from './LiveRecordingTrimmer';
import './liveArchiveAdmin.css';
const statusLabel = status => ({waiting:'Waiting',recording:'Recording',processing:'Saving',upload_failed:'Transfer failed',failed:'Recording failed',not_recorded:'No recording',ready:'Ready',partial:'Saved · interrupted'})[status] || status;
const playable = item => Boolean(item && (item.canPreview ?? ['ready','partial'].includes(item.status)));
const removable = item => Boolean(item && (item.canRemove ?? !['waiting','recording','processing'].includes(item.status)));
const recoverable = item => Boolean(item && (item.canRetry ?? ['failed','upload_failed'].includes(item.status)));
const size = bytes => bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '—';
const duration = value => value ? `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}` : '—';

export default function LiveArchiveAdmin({ token }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(t); }, [notice]);
  const [busy, setBusy] = useState('');
  const [part, setPart] = useState(0);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [trimOpen, setTrimOpen] = useState(false);
  const video = useRef(null), portrait = useRef(null), binding=useRef(token),revision=useRef(0),actionLock=useRef(false);binding.current=token;
  // The preview frame follows the same size templates as the live preview (the choice is shared and remembered).
  const [frameRatio, setFrameRatio] = useState('1.7778'); // follows the recorded video's own size
  // 9:16 crop beside the landscape player, kept in step with it. ponytail: second decoder, no seek smoothing.
  useEffect(() => {
    const a = video.current, b = portrait.current; if (!a || !b) return undefined;
    const sync = () => { if (Math.abs(b.currentTime - a.currentTime) > .25) b.currentTime = a.currentTime; };
    const play = () => { sync(); b.play().catch(() => {}); }, pause = () => { b.pause(); sync(); };
    a.addEventListener('play', play); a.addEventListener('pause', pause); a.addEventListener('seeked', sync); a.addEventListener('timeupdate', sync);
    return () => { a.removeEventListener('play', play); a.removeEventListener('pause', pause); a.removeEventListener('seeked', sync); a.removeEventListener('timeupdate', sync); };
  }, [preview, selectedId, part, previewVersion]);
  const selected = items.find(item => item.id === selectedId);
  const previewReady=playable(selected),previewId=selected?.id;
  const load = useCallback(async signal => {
    const request=++revision.current;
    try {
      const result = await apiRequest('/admin/live-recordings', { token,signal });
      if(binding.current!==token||request!==revision.current||signal?.aborted)return;
      setItems(result.items || []);
      setSelectedId(current => result.items?.some(item => item.id === current) ? current : result.items?.find(playable)?.id || result.items?.[0]?.id || '');
    } catch (error) {if(error.cancelled)return; if(binding.current===token&&request===revision.current&&!signal?.aborted)setNotice(error.message); }
  }, [token]);
  const recordingNow=useRef(false);recordingNow.current=items.some(item=>item.status==='recording');
  useEffect(() => {let cancelled=false,timer;const controller=new AbortController();setItems([]);setSelectedId('');setPreview('');setNotice('');setPart(0);const poll=async()=>{await load(controller.signal);if(!cancelled)timer=setTimeout(poll,recordingNow.current?4000:15000);};poll();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};}, [load]);
  const select = item => { video.current?.pause(); setPreview(''); setPreviewError(''); setTrimOpen(false); setPart(0); setSelectedId(item.id); };
  useEffect(() => {
    let cancelled = false;
    setPreview(''); setPreviewError(''); setPreviewLoading(false);
    if (!previewReady||!previewId) return undefined;
    setPreviewLoading(true);
    apiRequest(`/admin/live-recordings/${previewId}/preview?part=${part}`, { token })
      .then(result => { if (!cancelled) setPreview(result.url); })
      .catch(error => { if (!cancelled) setPreviewError(error.message); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [previewId, previewReady, selected?.published, part, token, previewVersion]);
  const action = async (item, name) => {
    if(actionLock.current)return;const owner=token;
    if (name === 'publish' && !window.confirm(item.status==='partial'?'This recording is incomplete. Publish the saved, trimmed ranges as public videos and add their audio to the music archive?':'Publish this recording using the saved trim for each part and add its audio to the music archive?')) return;
    actionLock.current=true;setBusy(item.id); setNotice('');
    try {
      const path = `/admin/live-recordings/${item.id}${name === 'delete' ? '' : `/${name}`}${name === 'download' ? `?part=${item.id === selectedId ? part : 0}` : ''}`;
      const result = await apiRequest(path, { token, deleteMessage:`Delete “${item.title}” and its recording files permanently? Published copies will also be removed.`, method: name === 'download' ? 'GET' : name === 'delete' ? 'DELETE' : 'POST', ...(['download','delete'].includes(name) ? {} : { body: name==='publish'&&item.status==='partial'?{allowPartial:true}:{} }) });
      if(binding.current!==owner)return;
      if(name==='delete'&&(result.deleted!==true||result.recoverable!==false))throw new Error('The server did not confirm permanent deletion. Update the backend before deleting recordings.');
      if (name === 'download') { const link = document.createElement('a'); link.href = result.url; link.rel = 'noopener'; link.click(); }
      else {
        if (name === 'delete') { if (selectedId === item.id) { video.current?.pause(); setPreview(''); setPart(0); } }
        await load();
        setNotice(name === 'delete' ? 'Recording permanently deleted.' : name === 'publish' ? 'Published. Add its audio to Player playlist when wanted.' : 'Recovery queued. Already saved parts are kept; recovery checks the remaining source.');
      }
    } catch (error) {if(error.cancelled)return; if(binding.current===owner)setNotice(error.message); }
    finally { actionLock.current=false;if(binding.current===owner)setBusy(''); }
  };
  return <section className="live-archive-admin">
    {notice && <div className="live-archive-notice" role="status"><span>{notice}</span></div>}
    <div className="live-archive-workspace">
      <div className="live-archive-list"><div className="live-archive-scroll"><table aria-label="Live recordings"><thead><tr><th scope="col">Recording</th><th scope="col">Recorded</th><th scope="col">Status</th><th scope="col">Length</th><th scope="col">Size</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''}>
          <th scope="row"><button className="live-archive-select" type="button" onClick={() => select(item)} aria-pressed={selectedId === item.id}><Film size={18} aria-hidden="true" /><span><strong>{item.title}</strong>{item.partCount > 1 && <small>{item.partCount} parts</small>}</span></button></th>
          <td className="live-archive-date"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time><small>{new Date(item.createdAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</small></td>
          <td><span className={`live-recording-status status-${item.retrying?'recording':item.status}`}>{item.retrying?'Recording':statusLabel(item.status)}</span></td>
          <td>{duration(item.durationSec)}</td><td>{size(item.bytes)}</td>
          <td><div className="live-archive-row-actions"><button className="live-archive-row-action" type="button" aria-label={`Preview ${item.title}`} title="View recording" onClick={() => select(item)}><Eye size={16} /></button><button className="live-archive-row-action live-archive-delete" type="button" aria-label={`Delete ${item.title}`} title={!removable(item) ? 'Wait for the recording to finish saving' : 'Delete recording'} disabled={busy === item.id || !removable(item)} onClick={() => action(item,'delete')}><Trash2 size={15} /></button></div></td>
        </tr>)}</tbody></table></div><footer className="live-archive-list-footer">Your saved live streams will appear here.</footer></div>
      <aside className="live-archive-preview" aria-label="Recording preview">
        <div className="live-archive-preview-title"><h3>Preview</h3>{selected && <span>{selected.published ? 'Published' : 'Private'}</span>}</div>
        <div className="live-archive-pair"><div className="live-archive-player is-framed" style={{ '--frame-ratio': frameRatio }}>{preview ? <video key={`${selectedId}:${part}:${previewVersion}`} ref={video} controls playsInline preload="metadata" src={preview} onLoadedMetadata={event => { const { videoWidth: w, videoHeight: h } = event.currentTarget; if (w && h) setFrameRatio((w / h).toFixed(4)); }} onError={() => setPreviewError('The preview could not load or its private link expired. Reload to try again.')} /> : <div className="live-archive-placeholder"><Film size={30} strokeWidth={1.3} /><p>{previewLoading ? 'Loading preview…' : selected ? playable(selected) ? 'Preview unavailable' : 'No playable file yet' : 'Select a recording'}</p></div>}</div>{preview&&<div className="live-archive-player live-archive-portrait" aria-label="Portrait 9:16 preview"><video key={`p:${selectedId}:${part}:${previewVersion}`} ref={portrait} muted playsInline preload="metadata" src={preview} tabIndex={-1}/><span>9:16</span></div>}</div>
        {selected && <><h3 className="live-archive-recording-title">{selected.title}</h3><p className="live-archive-meta">{new Date(selected.createdAt).toLocaleString()} · {duration(selected.durationSec)} · {size(selected.bytes)}</p>
          {selected.partCount > 1 && <label className="live-archive-parts">Recording part<AdminSelect value={part} onChange={event => { video.current?.pause(); setPart(Number(event.target.value)); }}>{Array.from({length:selected.partCount},(_,index) => <option key={index} value={index}>Part {index+1} of {selected.partCount}</option>)}</AdminSelect><small>Large recordings are saved in parts without re-encoding.</small></label>}
          {selected.parts?.[part]?.selectedDurationSec<selected.parts?.[part]?.durationSec-.01&&<p className="live-archive-trim-summary"><Scissors size={13}/>Trimmed to {duration(selected.parts[part].selectedDurationSec)} · {duration(selected.parts[part].trimStartSec)}–{duration(selected.parts[part].trimEndSec)}</p>}
          {selected.retrying&&<p className="live-archive-notice" role="status">Finishing the recording. Your live ended normally; it saves automatically and will turn Ready by itself.</p>}
          {!selected.retrying && selected.error && ['failed','upload_failed','not_recorded','partial'].includes(selected.status) && (selected.status==='partial'&&selected.error==='The source was interrupted. Only received media could be saved.'?<div className="live-archive-partial" role="status"><TriangleAlert size={16} aria-hidden="true"/><div><strong>Saved, but cut short</strong><p>The connection dropped before the live ended. Everything received is saved and playable; the last moments may be missing.</p></div></div>:<p className="live-archive-error" role="alert">{selected.error}</p>)}
          {selected.warning && selected.warning!==selected.error && <p className="live-archive-error" role="status">{selected.warning}</p>}
          {selected.captureState && selected.captureState!=='unknown' && <p className="live-archive-meta">Capture: {selected.captureState} · {selected.savedPartCount||0} saved {selected.savedPartCount===1?'part':'parts'}</p>}
          {selected.cleanupPending && <p className="live-archive-meta" role="status">Original-file cleanup is pending. Check the saved files before removing this recording.</p>}
          {previewError && <p className="live-archive-error" role="alert">{previewError}</p>}
          <div className="live-archive-actions">{playable(selected) && <><button type="button" onClick={()=>setTrimOpen(true)} disabled={busy===selected.id||!preview||selected.published} title={selected.published?'Published recordings cannot be retrimmed':'Choose the range used for publishing and downloading'}><Scissors size={15}/>Trim video</button><button type="button" onClick={() => action(selected,'download')} disabled={busy === selected.id}><Download size={15} />{selected.partCount > 1 ? 'Download part' : 'Download'}</button><button type="button" onClick={() => setPreviewVersion(value => value+1)}><RefreshCw size={15} />Reload preview</button>{!selected.published && <button type="button" onClick={() => action(selected,'publish')} disabled={busy === selected.id}><Upload size={15} />Publish{selected.partCount > 1 ? ' all parts' : ''}</button>}</>}
          {recoverable(selected) && <button type="button" disabled={busy === selected.id} onClick={() => action(selected,'retry')}><RefreshCw size={15} />Retry recovery</button>}</div>
        </>}
      </aside>
    </div>
    {trimOpen&&selected&&preview&&<LiveRecordingTrimmer key={`${selected.id}:${part}:${previewVersion}`} item={selected} part={part} src={preview} token={token} onClose={()=>setTrimOpen(false)} onSaved={item=>{setItems(current=>current.map(row=>row.id===item.id?item:row));setTrimOpen(false);setPreviewVersion(value=>value+1);setNotice('Trim saved. Publishing and downloading will use this range.');}}/>}
  </section>;
}
