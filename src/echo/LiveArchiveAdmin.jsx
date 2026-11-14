import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, Film, Play, RefreshCw, Scissors, Trash2, TriangleAlert, Upload } from 'lucide-react';
import RecordingControls from './RecordingControls';
import { apiRequest } from '../lib/api';
import LiveRecordingTrimmer from './LiveRecordingTrimmer';
import RecordingCommentsReplay from './RecordingCommentsReplay';
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
  const pendingSeek = useRef(null);
  // An expired private link is renewed once, quietly, and playback resumes where it was.
  const renewedAt = useRef(0), resumePlay = useRef(false);
  const [globalTime, setGlobalTime] = useState(0), [playing, setPlaying] = useState(false), [metaLength, setMetaLength] = useState(0);
  const [volume, setVolume] = useState(1), [muted, setMuted] = useState(false), [rate, setRate] = useState(1), box = useRef(null);
  const autoNext = useRef(false); // A recording is one video to the viewer: when a stored piece ends the next one starts by itself.
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  // The trimmer edits the FULL source; the player plays the saved trim.
  const [fullSource, setFullSource] = useState('');
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
  // A recording saved in several parts is one video: the whole live is built from all its parts (the server joins them), so it plays, edits, downloads and publishes as one.
  const joined = (selected?.partCount || 0) > 1, partKey = joined ? 'all' : part, trimInfo = joined ? selected?.whole : selected?.parts?.[part];
  useEffect(() => {
    setFullSource('');if (!trimOpen || !selectedId) return undefined;
    let cancelled = false;
    apiRequest(`/admin/live-recordings/${selectedId}/preview?part=${partKey}&full=1`, { token }).then(result => { if (!cancelled) setFullSource(result.url); }).catch(error => { if (!cancelled) { setPreviewError(error.message); setTrimOpen(false); } });
    return () => { cancelled = true; };
  }, [trimOpen, selectedId, partKey, token]);
  // One timeline across every stored piece: the whole recording's length, not just the piece being played.
  const durations = joined && selected?.whole ? [Number(selected.whole.selectedDurationSec ?? selected.whole.durationSec) || 0] : (selected?.parts || []).map(piece => Number(piece.selectedDurationSec ?? piece.durationSec) || 0);
  const offsets = durations.map((_, index) => durations.slice(0, index).reduce((sum, value) => sum + value, 0));
  const total = durations.reduce((sum, value) => sum + value, 0), whole = !joined && (selected?.partCount || 0) > 1 && total > 0, length = total > 0 ? total : metaLength;
  const seekTo = value => {
    const time = Math.max(0, Math.min(length, Number(value) || 0));
    if (!whole) { setGlobalTime(time); if (video.current) video.current.currentTime = time; return; }
    let index = offsets.findLastIndex(start => start <= time); if (index < 0) index = 0;
    setGlobalTime(time);
    if (index === part) { if (video.current) video.current.currentTime = time - offsets[index]; }
    else { autoNext.current = playing; pendingSeek.current = time - offsets[index]; setPart(index); }
  };
  const previewReady=playable(selected),previewId=selected?.id;
  const load = useCallback(async signal => {
    const request=++revision.current;
    try {
      const result = await apiRequest('/admin/live-recordings', { token,signal });
      if(binding.current!==token||request!==revision.current||signal?.aborted)return;
      // This tab lists only recordings already stored in Cloudinary. Folder copies and OVH-only uploads live in the Studio History tab.
      const stored=(result.items||[]).filter(item=>item.partCount>0);
      setItems(stored);
      setSelectedId(current => stored.some(item => item.id === current) ? current : stored.find(playable)?.id || stored[0]?.id || '');
    } catch (error) {if(error.cancelled)return; if(binding.current===token&&request===revision.current&&!signal?.aborted)setNotice(error.message); }
  }, [token]);
  const recordingNow=useRef(false);recordingNow.current=items.some(item=>item.status==='recording');
  useEffect(() => {let cancelled=false,timer;const controller=new AbortController();setItems([]);setSelectedId('');setPreview('');setNotice('');setPart(0);const poll=async()=>{await load(controller.signal);if(!cancelled)timer=setTimeout(poll,recordingNow.current?4000:15000);};poll();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};}, [load]);
  // Clicking the recording that is already open must not blank its preview: nothing would load it again.
  const select = item => { if (item.id === selectedId) return; autoNext.current = false; pendingSeek.current = null; setGlobalTime(0); setPlaying(false); video.current?.pause(); setPreview(''); setPreviewError(''); setTrimOpen(false); setPart(0); setSelectedId(item.id); };
  useEffect(() => {
    let cancelled = false;
    setPreview(''); setPreviewError(''); setPreviewLoading(false);
    if (!previewReady||!previewId) return undefined;
    setPreviewLoading(true);
    apiRequest(`/admin/live-recordings/${previewId}/preview?part=${partKey}`, { token })
      .then(result => { if (!cancelled) setPreview(result.url); })
      .catch(error => { if (!cancelled) setPreviewError(error.message); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [previewId, previewReady, selected?.published, partKey, token, previewVersion]);
  const action = async (item, name) => {
    if(actionLock.current)return;const owner=token;
    if (name === 'publish' && !window.confirm(item.status==='partial'?'This recording is incomplete. Publish the saved, trimmed video publicly and add their audio to the music archive?':(item.partCount>1?'Publish the whole video, built from all its parts with its saved trim, and add its audio to the music archive?':'Publish this recording using its saved trim and add its audio to the music archive?'))) return;
    actionLock.current=true;setBusy(item.id); setNotice('');
    try {
      const path = `/admin/live-recordings/${item.id}${name === 'delete' ? '' : `/${name}`}${name === 'download' ? `?part=${item.id === selectedId ? partKey : (item.partCount > 1 ? 'all' : 0)}` : ''}`;
      const result = await apiRequest(path, { token, deleteMessage:`Delete “${item.title}” and its recording files permanently? Published copies will also be removed.`, method: name === 'download' ? 'GET' : name === 'delete' ? 'DELETE' : 'POST', ...(['download','delete'].includes(name) ? {} : { body: name==='publish'?{...(item.status==='partial'?{allowPartial:true}:{}),...(item.partCount>1?{part:'all'}:{})}:{} }) });
      if(binding.current!==owner)return;
      if(name==='delete'&&(result.deleted!==true||result.recoverable!==false))throw new Error('The server did not confirm permanent deletion. Update the backend before deleting recordings.');
      if (name === 'download') { const link = document.createElement('a'); link.href = result.url; link.rel = 'noopener'; link.click(); }
      else {
        if (name === 'delete') { if (selectedId === item.id) { video.current?.pause(); setPreview(''); setPart(0); } }
        await load();
        setNotice(name === 'delete' ? 'Recording permanently deleted.' : name === 'publish' ? 'Published. Add its audio to Player playlist when wanted.' : 'Recovery queued. Everything already saved is kept; recovery checks the remaining source.');
      }
    } catch (error) {if(error.cancelled)return; if(binding.current===owner)setNotice(error.message); }
    finally { actionLock.current=false;if(binding.current===owner)setBusy(''); }
  };
  return <section className="live-archive-admin">
    {notice && <div className="live-archive-notice" role="status"><span>{notice}</span></div>}
    <div className="live-archive-workspace">
      <div className="live-archive-list"><div className="live-archive-scroll"><table aria-label="Live recordings"><thead><tr><th scope="col">Recording</th><th scope="col">Recorded</th><th scope="col">Status</th><th scope="col">Length</th><th scope="col">Size</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{items.map(item => <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''}>
          <th scope="row"><button className="live-archive-select" type="button" onClick={() => select(item)} aria-pressed={selectedId === item.id}><Film size={18} aria-hidden="true" /><span><strong>{item.title}</strong></span></button></th>
          <td className="live-archive-date"><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time><small>{new Date(item.createdAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</small></td>
          <td><span className={`live-recording-status status-${item.retrying?'recording':item.status}`}>{item.retrying?'Recording':statusLabel(item.status)}</span></td>
          <td>{duration(item.durationSec)}</td><td>{size(item.bytes)}</td>
          <td><div className="live-archive-row-actions"><button className="live-archive-row-action" type="button" aria-label={`Preview ${item.title}`} title="View recording" onClick={() => select(item)}><Eye size={16} /></button><button className="live-archive-row-action live-archive-delete" type="button" aria-label={`Delete ${item.title}`} title={!removable(item) ? 'Wait for the recording to finish saving' : 'Delete recording'} disabled={busy === item.id || !removable(item)} onClick={() => action(item,'delete')}><Trash2 size={15} /></button></div></td>
        </tr>)}</tbody></table></div><footer className="live-archive-list-footer">Your saved live streams will appear here.</footer></div>
      <aside className="live-archive-preview" aria-label="Recording preview">
        <div className="live-archive-pair"><div className="rp-card" ref={box}><div className="live-archive-player is-framed" style={{ '--frame-ratio': frameRatio }}>{preview ? <video key={`${selectedId}:${partKey}:${previewVersion}`} ref={video} playsInline autoPlay={autoNext.current} onClick={() => { const el = video.current; if (el) { if (el.paused) void el.play(); else el.pause(); } }} preload="auto" src={`${preview}#t=0.1`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setGlobalTime((whole ? offsets[part] || 0 : 0) + event.currentTarget.currentTime)} onEnded={() => { if (selected && !joined && part + 1 < selected.partCount) { autoNext.current = true; setPart(value => value + 1); } }} onLoadedMetadata={event => { const { videoWidth: w, videoHeight: h } = event.currentTarget; if (w && h) setFrameRatio((w / h).toFixed(4)); setMetaLength(event.currentTarget.duration || 0); event.currentTarget.volume = volume; event.currentTarget.muted = muted; event.currentTarget.playbackRate = rate; if (pendingSeek.current !== null) { event.currentTarget.currentTime = pendingSeek.current; pendingSeek.current = null; } if (resumePlay.current) { resumePlay.current = false; void event.currentTarget.play()?.catch?.(() => {}); } }} onError={event => { const el = event.currentTarget, now = Date.now(); if (previewId && now - renewedAt.current > 20000) { renewedAt.current = now; if (el.currentTime > 0) pendingSeek.current = el.currentTime; resumePlay.current = !el.paused || autoNext.current; apiRequest(`/admin/live-recordings/${previewId}/preview?part=${partKey}`, { token }).then(result => { setPreviewError(''); setPreview(result.url); }).catch(() => setPreviewError('The preview could not load or its private link expired. Reload to try again.')); return; } setPreviewError('The preview could not load or its private link expired. Reload to try again.'); }} /> : <div className="live-archive-placeholder"><Film size={30} strokeWidth={1.3} /><p>{previewLoading ? 'Loading preview…' : selected ? playable(selected) ? 'Preview unavailable' : 'No playable file yet' : 'Select a recording'}</p></div>}{preview && !playing && <button type="button" className="rp-center" aria-label="Play" onClick={() => { const el = video.current; if (el) void el.play(); }}><Play size={26} /></button>}</div>
          {preview && <RecordingControls boxRef={box} playing={playing} time={globalTime} length={length} onToggle={() => { const el = video.current; if (el) { if (el.paused) void el.play(); else el.pause(); } }} onSeek={seekTo} onSkip={delta => seekTo(globalTime + delta)} volume={volume} muted={muted} onVolume={value => { setVolume(value); setMuted(value === 0); if (video.current) { video.current.volume = value; video.current.muted = value === 0; } }} onMute={() => { const next = !muted; setMuted(next); if (video.current) video.current.muted = next; }} rate={rate} onRate={value => { setRate(value); if (video.current) video.current.playbackRate = value; if (portrait.current) portrait.current.playbackRate = value; }} />}{selected&&preview&&<RecordingCommentsReplay key={`${selectedId}:${partKey}`} recordingId={selectedId} part={partKey} token={token} currentTime={globalTime} version={previewVersion}/>}</div><div className="live-archive-player live-archive-portrait" aria-label="Portrait 9:16 preview">{preview?<video key={`p:${selectedId}:${part}:${previewVersion}`} ref={portrait} muted playsInline preload="auto" src={`${preview}#t=0.1`} tabIndex={-1}/>:<div className="live-archive-placeholder"><Film size={22} strokeWidth={1.3} /></div>}<span>9:16</span></div></div>
        {selected && <><header className="la-info">
            <div className="la-title-row"><h3 className="live-archive-recording-title">{selected.title}</h3><b className={`la-chip is-${selected.status}`}>{statusLabel(selected.status)}</b></div>
            <dl className="la-stats"><div><dt>Recorded</dt><dd>{new Date(selected.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}<small>{new Date(selected.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></dd></div><div><dt>Length</dt><dd>{duration(selected.durationSec)}</dd></div><div><dt>Size</dt><dd>{size(selected.bytes)}</dd></div></dl>
          </header>
          {(trimInfo?.selectedDurationSec<trimInfo?.durationSec-.01)&&<p className="live-archive-trim-summary"><Scissors size={13}/>{joined?'Whole video trimmed to ':'Trimmed to '}{duration(trimInfo.selectedDurationSec)} · {duration(trimInfo.trimStartSec)}–{duration(trimInfo.trimEndSec)}</p>}
          {selected.retrying&&<p className="live-archive-notice" role="status">Finishing the recording. Your live ended normally; it saves automatically and will turn Ready by itself.</p>}
          {!selected.retrying && selected.error && ['failed','upload_failed','not_recorded','partial'].includes(selected.status) && (selected.status==='partial'&&selected.error==='The source was interrupted. Only received media could be saved.'?<div className="live-archive-partial" role="status"><TriangleAlert size={16} aria-hidden="true"/><div><strong>Saved, but cut short</strong><p>The connection dropped before the live ended. Everything received is saved and playable; the last moments may be missing.</p></div></div>:<p className="live-archive-error" role="alert">{selected.error}</p>)}
          {selected.warning && selected.warning!==selected.error && <p className="live-archive-error" role="status">{selected.warning}</p>}
          {selected.captureState && selected.captureState!=='unknown' && <p className="la-capture"><span>Capture</span><b>{selected.captureState}</b></p>}
          {selected.cleanupPending && <p className="live-archive-meta" role="status">Original-file cleanup is pending. Check the saved files before removing this recording.</p>}
          {previewError && <p className="live-archive-error" role="alert">{previewError}</p>}
          <div className="la-actions">{playable(selected) && <>{!selected.published && <button type="button" className="la-primary" onClick={() => action(selected,'publish')} disabled={busy === selected.id}><Upload size={15} />Publish</button>}<button type="button" onClick={()=>setTrimOpen(true)} disabled={busy===selected.id||!preview||selected.published} title={selected.published?'Published recordings can no longer be edited':'Trim the video and set its beauty and lighting before publishing'}><Scissors size={15}/>Edit video</button><button type="button" onClick={() => action(selected,'download')} disabled={busy === selected.id}><Download size={15} />Download</button><button type="button" className="la-icon" onClick={() => setPreviewVersion(value => value+1)} title="Reload the preview" aria-label="Reload preview"><RefreshCw size={15} /></button></>}
          {recoverable(selected) && <button type="button" className="la-primary" disabled={busy === selected.id} onClick={() => action(selected,'retry')}><RefreshCw size={15} />Retry recovery</button>}</div>
        </>}
      </aside>
    </div>
    {trimOpen&&selected&&fullSource&&<LiveRecordingTrimmer key={`${selected.id}:${partKey}:${previewVersion}`} item={selected} part={partKey} src={fullSource} token={token} onClose={()=>setTrimOpen(false)} onSaved={item=>{setItems(current=>current.map(row=>row.id===item.id?item:row));setTrimOpen(false);setPreviewVersion(value=>value+1);setNotice('Trim saved. The preview, downloads and publishing now use this range.');}}/>}
  </section>;
}
