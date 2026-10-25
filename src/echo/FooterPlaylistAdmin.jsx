import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CheckCheck, Disc3, ListMusic, LoaderCircle, Music2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { apiBaseUrl, apiRequest, deleteArchiveItem, updateArchiveItem } from '../lib/api';
import AdminSelect from '../components/AdminSelect';
import './footerPlaylistAdmin.css';

function Artwork({ track }) {
  const [failed, setFailed] = useState('');
  const image = track?.coverImage || track?.image;
  return <span className="pl-art" aria-hidden="true">{image && failed !== image ? <img src={image} alt="" loading="lazy" onError={() => setFailed(image)} /> : <Disc3 size={20} strokeWidth={1.3} />}</span>;
}
const sameOrder = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);
const trackSeconds = track => { const parts = String(track?.duration || '').split(':').map(Number); return parts.length >= 2 && parts.every(Number.isFinite) ? parts.reduce((total, value) => total * 60 + value, 0) : 0; };
const durationLabel = seconds => seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)} min`;

export default function FooterPlaylistAdmin({ token }) {
  const [archive, setArchive] = useState([]);
  const [ids, setIds] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState({ ids: [], enabled: true });
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState({ text: '', error: false });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [fileName, setFileName] = useState('');
  const [source, setSource] = useState('file');
  const [dialogNotice, setDialogNotice] = useState('');
  const dialog = useRef(null);
  const operation = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setReady(false);
    Promise.all([apiRequest('/admin/archive', { token }), apiRequest('/admin/player-playlist', { token })])
      .then(([library, playlist]) => {
        if (!Array.isArray(library.items) || !Array.isArray(playlist.item?.archiveIds)) throw new Error('Could not read the playlist. Try again.');
        if (!active) return;
        const order = [...new Set(playlist.item.archiveIds)]; const visible = playlist.item.enabled !== false;
        setArchive(library.items); setIds(order); setEnabled(visible); setSaved({ ids: order, enabled: visible });
        setReady(true); setNotice({ text: '', error: false });
      }).catch(error => { if (active) setNotice({ text: error.message, error: true }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]);
  useEffect(() => {
    if (editor) dialog.current?.querySelector(editor.mode === 'delete' ? 'footer button[type="button"]' : 'input:not([type="file"])')?.focus();
  }, [editor]);
  const byId = useMemo(() => new Map(archive.map(track => [track.id, track])), [archive]);
  const selected = byId.get(selectedId);
  const selectedIds = useMemo(() => new Set(ids), [ids]);
  const filtered = useMemo(() => archive.filter(track => `${track.title} ${track.artist || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [archive, query]);
  const dirty = enabled !== saved.enabled || !sameOrder(ids, saved.ids);
  const locked = loading || !ready || Boolean(busy);
  const invalid = ids.some(id => byId.get(id)?.playerEligible !== true);
  const seconds = ids.reduce((total, id) => total + trackSeconds(byId.get(id)), 0);
  const announce = (text, error = false) => setNotice({ text, error });
  const changeIds = updater => { setIds(updater); setNotice({ text: '', error: false }); };
  const toggle = track => changeIds(current => current.includes(track.id) ? current.filter(id => id !== track.id) : current.length < 100 && track.playerEligible ? [...current, track.id] : current);
  const move = (index, direction) => changeIds(current => {
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= current.length) return current;
    const next = [...current]; [next[index], next[destination]] = [next[destination], next[index]]; return next;
  });
  const save = async () => {
    if (operation.current || !dirty || invalid) return;
    operation.current = true; setBusy('save'); announce('');
    try {
      const result = await apiRequest('/admin/player-playlist', { method: 'PUT', token, body: { enabled, archiveIds: ids } });
      if (!Array.isArray(result.item?.archiveIds)) throw new Error('Save could not be confirmed. Try again.');
      setSaved({ ids: result.item.archiveIds, enabled: result.item.enabled });
      setIds(result.item.archiveIds); setEnabled(result.item.enabled);
      announce('Playlist saved. The website player updates within 30 seconds.');
    } catch (error) { announce(error.message, true); }
    finally { operation.current = false; setBusy(''); }
  };
  const openDialog = mode => {
    if (locked || (mode !== 'upload' && !selected)) return;
    setDialogNotice(''); setFileName(''); setSource('file');
    setEditor({ mode, track: selected ? { ...selected } : null });
    dialog.current.showModal();
  };
  const closeDialog = () => { if (!operation.current) dialog.current.close(); };
  const submitDialog = async event => {
    event.preventDefault(); if (operation.current) return;
    operation.current = true; setBusy(editor.mode); setDialogNotice('');
    const form = event.currentTarget;
    try {
      if (editor.mode === 'delete') {
        const result = await deleteArchiveItem(editor.track.id, token);
        if (result.ok !== true) throw new Error('Deletion could not be confirmed.');
        setArchive(current => current.filter(track => track.id !== editor.track.id));
        changeIds(current => current.filter(id => id !== editor.track.id)); setSelectedId('');
        announce('Track deleted from the library. Save any playlist changes to update its stored order.');
      } else if (editor.mode === 'edit') {
        const title = form.elements.title.value.trim();
        if (!title) throw new Error('Enter a track title.');
        const details = { title, artist: form.elements.artist.value.trim(), genre: form.elements.genre.value.trim(), duration: form.elements.duration.value.trim() };
        const result = await updateArchiveItem(editor.track.id, details, token);
        if (!result.item?.id) throw new Error('Track changes could not be confirmed.');
        setArchive(current => current.map(track => track.id === editor.track.id ? { ...track, ...result.item } : track));
        announce('Track details updated.');
      } else {
        const title = form.elements.title.value.trim();
        if (!title) throw new Error('Enter a track title.');
        const details = { title, artist: form.elements.artist.value.trim(), category: form.elements.category.value.trim() || 'mix', genre: form.elements.genre.value.trim(), mediaType: 'audio' };
        if (source === 'youtube') {
          const youtubeUrl = form.elements.youtubeUrl.value.trim();
          if (!youtubeUrl) throw new Error('Enter a public YouTube music link.');
          details.youtubeUrl = youtubeUrl;
        } else {
          const file = form.elements.audio.files[0];
          if (!file) throw new Error('Choose an audio file.');
          const data = new FormData(); data.append('file', file);
          const response = await fetch(`${apiBaseUrl}/content/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
          const upload = await response.json();
          if (!response.ok || !upload.url) throw new Error(upload.message || 'Audio upload failed.');
          const duration = Number.isFinite(Number(upload.durationSec)) ? Math.floor(Number(upload.durationSec)) : 0;
          details.audioUrl = upload.url;
          details.duration = duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : '';
        }
        const created = await apiRequest('/archive-items', { method: 'POST', token, body: details });
        if (!created.item?.id) throw new Error('Archive save could not be confirmed.');
        setArchive(current => [{ ...created.item, playerEligible: false }, ...current]);
        setSelectedId(created.item.id); setQuery('');
        try {
          const library = await apiRequest('/admin/archive', { token });
          if (!Array.isArray(library.items)) throw new Error('Invalid library response');
          setArchive(library.items);
          announce('Recording added to the library. Use + to add it to your playlist.');
        } catch { announce('Recording saved. Reload the page to check its playback availability.', true); }
      }
      dialog.current.close();
    } catch (error) { setDialogNotice(error.message || 'The action could not be completed.'); }
    finally { operation.current = false; setBusy(''); }
  };
  return <div className="pl-studio" aria-busy={locked}>
    <header className="pl-heading"><div><span className="pl-eyebrow">WEBSITE AUDIO</span><h1>Player playlist<span className="pl-heading-dot" /></h1><p>Curate the sound of your website.</p></div><div className="pl-heading-actions"><span className={`pl-save-state${dirty ? ' is-dirty' : ''}`}><i />{loading ? 'Loading' : !ready ? 'Unavailable' : dirty ? 'Unsaved changes' : 'All changes saved'}</span><button type="button" className="pl-save" onClick={save} disabled={locked || !dirty || invalid}>{busy === 'save' ? <LoaderCircle size={15} className="pl-spin" /> : <CheckCheck size={15} />}{busy === 'save' ? 'Saving…' : 'Save playlist'}</button></div></header>
    <div className="pl-summary"><div className="pl-summary-item"><ListMusic size={17} /><strong>{ids.length.toString().padStart(2, '0')}</strong><span>in playlist</span></div><div className="pl-summary-item pl-duration"><strong>{seconds ? durationLabel(seconds) : '—'}</strong><span>total duration</span></div><div className="pl-visibility"><span><strong>Website player</strong><small>{enabled ? 'Visible on your website' : 'Hidden from your website'}</small></span><button type="button" role="switch" aria-label="Show player on website" aria-checked={enabled} disabled={locked} className={`pl-switch${enabled ? ' is-on' : ''}`} onClick={() => { setEnabled(value => !value); announce(''); }}><span /></button></div></div>
    <div className="pl-workspace">
      <section className="pl-panel pl-library" aria-labelledby="pl-library-title"><header className="pl-panel-heading"><div><h2 id="pl-library-title">Library <span>{archive.length}</span></h2><p>Your available recordings</p></div><button type="button" className="pl-upload" disabled={locked} onClick={() => openDialog('upload')}><Plus size={14} />Add music</button></header>
        <label className="pl-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search library" placeholder="Search tracks or artists…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear library search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        <div className="pl-library-toolbar"><span>{selected ? '1 track selected' : 'Select a track to manage'}</span><div><button type="button" disabled={locked || !selected} onClick={() => openDialog('edit')}><Pencil size={13} />Edit</button><button type="button" className="pl-delete" disabled={locked || !selected} onClick={() => openDialog('delete')}><Trash2 size={13} />Delete</button></div></div>
        <ul className="pl-track-list" aria-label="Archive recordings" tabIndex={0}>{loading ? <li className="pl-empty"><LoaderCircle className="pl-spin" size={23} /><strong>Loading your library</strong></li> : filtered.length ? filtered.map(track => <li key={track.id} className={`pl-library-row${selectedId === track.id ? ' is-selected' : ''}`}><button type="button" className="pl-track-select" aria-pressed={selectedId === track.id} disabled={Boolean(busy)} onClick={() => setSelectedId(track.id)}><Artwork track={track} /><span className="pl-track-copy"><strong>{track.title}</strong><small>{track.artist || 'DJ Khalil'}{!track.playerEligible && <em> · Audio unavailable</em>}</small></span></button><span className="pl-track-duration">{track.duration || '—'}</span><button type="button" className={`pl-add${selectedIds.has(track.id) ? ' is-added' : ''}`} aria-label={`${selectedIds.has(track.id) ? 'Remove' : 'Add'} ${track.title} ${selectedIds.has(track.id) ? 'from' : 'to'} playlist`} disabled={locked || (!selectedIds.has(track.id) && (!track.playerEligible || ids.length >= 100))} onClick={() => toggle(track)} title={selectedIds.has(track.id) ? 'Remove from playlist' : 'Add to playlist'}>{selectedIds.has(track.id) ? <Check size={15} /> : <Plus size={15} />}</button></li>) : <li className="pl-empty"><Music2 size={25} /><strong>{query ? 'No matching tracks' : 'Your library starts here'}</strong><p>{query ? 'Try another title or artist.' : 'Add an audio file or a public YouTube link.'}</p></li>}</ul>
        <footer className="pl-panel-footer"><span>{query ? `${filtered.length} of ${archive.length} recordings` : `${archive.length} recordings`}</span><span>Audio files &amp; YouTube imports</span></footer>
      </section>
      <section className="pl-panel pl-queue" aria-labelledby="pl-queue-title"><header className="pl-panel-heading"><div><h2 id="pl-queue-title">Play order <span>{ids.length}</span></h2><p>The sequence your visitors hear</p></div><span className="pl-sequence-icon"><ListMusic size={21} strokeWidth={1.4} /></span></header><div className="pl-queue-caption"><span>TRACK / ARTIST</span><span>ORDER</span></div>
        <ol className="pl-track-list pl-order" aria-label="Playlist play order" tabIndex={0}>{!ids.length ? <li className="pl-empty"><span className="pl-empty-disc"><Disc3 size={34} strokeWidth={1} /></span><strong>Set the mood</strong><p>Add recordings from your library.<br />Arrange them in the order you want.</p></li> : ids.map((id, index) => { const track = byId.get(id); return <li key={id} className="pl-order-row"><span className="pl-track-number">{String(index + 1).padStart(2, '0')}</span><Artwork track={track} /><span className="pl-track-copy"><strong>{track?.title || 'Track no longer available'}</strong><small>{track?.artist || 'DJ Khalil'}{track?.playerEligible !== true && <em> · Remove before saving</em>}</small></span><span className="pl-track-duration">{track?.duration || '—'}</span><div className="pl-order-actions"><button type="button" aria-label={`Move ${track?.title || 'track'} up`} disabled={locked || index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${track?.title || 'track'} down`} disabled={locked || index === ids.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Remove ${track?.title || 'track'} from playlist`} disabled={locked} onClick={() => changeIds(current => current.filter(value => value !== id))}><X size={14} /></button></div></li>; })}</ol>
        <footer className="pl-panel-footer"><span>Use the arrows to reorder</span><span>{ids.length} / 100 tracks</span></footer>
      </section>
    </div>
    <div className={`pl-status${notice.error ? ' is-error' : ''}`} role={notice.error ? 'alert' : 'status'} aria-live="polite"><span>{notice.text || (invalid ? 'Remove unavailable tracks before saving.' : 'Changes go live when you save your playlist.')}</span>{notice.error && !dirty && <button type="button" disabled={loading || Boolean(busy)} onClick={() => setReload(value => value + 1)}>Try again</button>}</div>
    <dialog ref={dialog} className="pl-dialog" onCancel={event => { if (operation.current) event.preventDefault(); }} aria-labelledby="pl-dialog-title" onClose={() => setEditor(null)}>{editor && <form key={`${editor.mode}-${editor.track?.id || ''}`} onSubmit={submitDialog}><header><div><span className="pl-eyebrow">{editor.mode === 'upload' ? 'GROW YOUR LIBRARY' : 'LIBRARY RECORDING'}</span><h2 id="pl-dialog-title">{editor.mode === 'delete' ? 'Delete recording?' : editor.mode === 'edit' ? 'Edit recording' : 'Add music'}</h2></div><button type="button" aria-label="Close recording dialog" disabled={Boolean(busy)} onClick={closeDialog}><X size={18} /></button></header>{editor.mode === 'delete' ? <div className="pl-delete-confirm"><Artwork track={editor.track} /><strong>{editor.track.title}</strong><p>This deletes the recording from your archive, including its appearance in the website player. This cannot be undone here.</p></div> : <fieldset disabled={Boolean(busy)}><label>Track title<input name="title" defaultValue={editor.mode === 'edit' ? editor.track.title : ''} required maxLength={240} autoComplete="off" /></label><label>Artist<input name="artist" defaultValue={editor.mode === 'edit' ? editor.track.artist : 'DJ Khalil'} maxLength={240} /></label>{editor.mode === 'edit' ? <div className="pl-form-pair"><label>Genre<input name="genre" defaultValue={editor.track.genre || ''} /></label><label>Duration<input name="duration" defaultValue={editor.track.duration || ''} placeholder="3:45" pattern="(?:[0-9]+:)?[0-5]?[0-9]:[0-5][0-9]" /></label></div> : <><div className="pl-form-pair"><label>Category<input name="category" defaultValue="mix" /></label><label>Genre<input name="genre" /></label></div><label>Music source<AdminSelect value={source} onChange={event => { setSource(event.target.value); setFileName(''); setDialogNotice(''); }}><option value="file">Audio file</option><option value="youtube">YouTube music link</option></AdminSelect></label>{source === 'youtube' ? <label>Public YouTube link<input name="youtubeUrl" type="url" placeholder="https://www.youtube.com/watch?v=…" required /><small className="pl-source-help">No Google sign-in needed. Keep the admin computer online. Up to 30 minutes / 100 MB.</small></label> : <label className="pl-file"><Upload size={23} /><strong>{fileName || 'Choose an audio file'}</strong><small>Original recordings · audio files only</small><input name="audio" type="file" accept="audio/*" required onChange={event => setFileName(event.target.files?.[0]?.name || '')} /></label>}</>}</fieldset>}{dialogNotice && <p className="pl-dialog-error" role="alert">{dialogNotice}</p>}<footer><button type="button" disabled={Boolean(busy)} onClick={closeDialog}>Cancel</button><button type="submit" className={editor.mode === 'delete' ? 'pl-confirm-delete' : 'pl-save'} disabled={Boolean(busy)}>{busy ? <LoaderCircle size={14} className="pl-spin" /> : editor.mode === 'delete' ? <Trash2 size={14} /> : <Check size={14} />}{busy ? (editor.mode === 'upload' && source === 'youtube' ? 'Converting…' : 'Working…') : editor.mode === 'delete' ? 'Delete recording' : editor.mode === 'edit' ? 'Save details' : 'Add recording'}</button></footer></form>}</dialog>
  </div>;
}
