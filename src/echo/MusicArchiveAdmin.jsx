import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Disc3, Music2, Pencil, Plus, Trash2, X, Upload } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import './musicArchive.css';

const labels = { categories: 'Category', albums: 'Album', songs: 'Song' };
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const empty = { categories: [], albums: [], songs: [] };
export default function MusicArchiveAdmin({ token }) {
  const [data, setData] = useState(empty);
  const [kind, setKind] = useState('albums');
  const [query, setQuery] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [formError, setFormError] = useState('');
  const dialog = useRef(null);
  const load = useCallback(async () => {
    const result = await apiRequest('/admin/music-archive', { token });
    if (!Array.isArray(result.songs) || !Array.isArray(result.albums) || !Array.isArray(result.categories)) throw new Error('Could not read the archive.');
    setData(result);
  }, [token]);
  useEffect(() => { let active = true; load().catch(e => { if (active) setNotice(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);
  const editorOpen = Boolean(editor);
  useEffect(() => { if (editorOpen) dialog.current?.showModal(); }, [editorOpen]);
  const open = row => {
    setFormError('');
    setEditor({ kind, id: row?.id || '', title: row?.title || '', description: row?.description || '', published: row?.published ?? false,
      categoryId: row?.categoryId || data.categories[0]?.id || '', year: row?.year || '',
      albumId: row?.albumId || (albumFilter === 'unassigned' ? '' : albumFilter), artist: row?.artist || 'DJ Khalil', date: row?.date || today(),
      audioUrl: row?.storedAudioUrl || row?.audioUrl || '', coverImage: row?.storedCoverImage || row?.coverImage || '', previewCover: row?.coverImage || '', duration: row?.duration || '' });
  };
  const close = () => { if (!busy) { dialog.current?.close(); setEditor(null); } };
  const update = (key, value) => setEditor(current => ({ ...current, [key]: value }));
  const upload = async (file, field) => {
    if (!file) return;
    if (file.size > (field === 'coverImage' ? 10 : 100) * 1024 * 1024) { setFormError(`Choose a file under ${field === 'coverImage' ? 10 : 100} MB.`); return; }
    setBusy(true); setFormError('');
    try {
      if (field === 'coverImage' && window.createImageBitmap) {
        const bitmap = await createImageBitmap(file);
        try {
          const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88));
          if (blob) file = new File([blob], 'archive-cover.webp', { type: blob.type });
        } finally { bitmap.close(); }
      }
      const body = new FormData(); body.append('file', file);
      const response = await fetch(`${apiBaseUrl}/admin/music-archive/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upload failed.');
      setEditor(current => ({ ...current, [field]: result.url, ...(field === 'audioUrl' ? { duration: result.duration || '' } : { previewCover: result.previewUrl }) }));
    } catch (error) { setFormError(error.message); }
    finally { setBusy(false); }
  };
  const save = async event => {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      const body = { title: editor.title, description: editor.description, published: editor.published };
      if (!editor.id) body.sortOrder = data[editor.kind].length;
      if (editor.kind === 'albums') Object.assign(body, { categoryId: editor.categoryId, year: editor.year ? Number(editor.year) : null, coverImage: editor.coverImage });
      if (editor.kind === 'songs') Object.assign(body, { albumId: editor.albumId, artist: editor.artist, date: editor.date, audioUrl: editor.audioUrl, coverImage: editor.coverImage, duration: editor.duration });
      await apiRequest(`/admin/music-archive/${editor.kind}${editor.id ? `/${editor.id}` : ''}`, { token, method: editor.id ? 'PATCH' : 'POST', body });
      await load(); dialog.current?.close(); setEditor(null); setNotice('Saved. Published items appear automatically in the Music Archive.');
    } catch (error) { setFormError(error.message); }
    finally { setBusy(false); }
  };
  const remove = async row => {
    if (!window.confirm(`Delete “${row.title}”? This removes its archive entry. Stored media files are retained.`)) return;
    setBusy(true); setNotice('');
    try { await apiRequest(`/admin/music-archive/${kind}/${row.id}`, { token, method: 'DELETE' }); await load(); setNotice('Archive entry deleted. Stored media files remain recoverable.'); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const rows = data[kind].filter(row => (!query || `${row.title} ${row.artist || ''}`.toLowerCase().includes(query.toLowerCase())) && (kind !== 'songs' || !albumFilter || (albumFilter === 'unassigned' ? !row.albumId : row.albumId === albumFilter)));
  const move = async (index, direction) => {
    const ordered = [...rows]; [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    setBusy(true); setNotice('');
    try { await apiRequest(`/admin/music-archive/${kind}/order`, { token, method: 'PUT', body: { ids: ordered.map(row => row.id) } }); await load(); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  return <div className="ma-admin">
    <header className="ma-heading"><div><span className="ma-eyebrow">DJ KHALIL / COLLECTIONS</span><h1>Music Archive</h1><p>Organize your sound. Create categories, build albums, and publish your recordings.</p></div><button type="button" className="ma-primary" disabled={loading || busy} onClick={() => open()}><Plus size={17} /> Add {labels[kind].toLowerCase()}</button></header>
    <div className="ma-admin-tabs" role="tablist" aria-label="Archive management">{Object.keys(labels).map(key => <button key={key} role="tab" aria-selected={key === kind} onClick={() => { setKind(key); setQuery(''); setAlbumFilter(''); }} type="button">{key} <span>{data[key].length}</span></button>)}</div>
    <div className="ma-toolbar"><label>Search<input type="search" value={query} placeholder="Find a title or artist…" onChange={event => setQuery(event.target.value)} /></label>{kind === 'songs' && <label>Album<select value={albumFilter} onChange={event => setAlbumFilter(event.target.value)}><option value="">All songs</option><option value="unassigned">Not in an album</option>{data.albums.map(a => <option value={a.id} key={a.id}>{a.title}</option>)}</select></label>}</div>
    {notice && <p className="ma-notice" role="status">{notice} <button type="button" disabled={busy} onClick={() => load().then(() => setNotice('')).catch(e => setNotice(e.message))}>Refresh</button></p>}
    {loading ? <p role="status">Loading your archive…</p> : <ul className="ma-admin-list">{rows.map((row, index) => <li key={row.id}>
      <div className="ma-thumb">{row.coverImage ? <img src={row.coverImage} alt="" /> : kind === 'songs' ? <Music2 /> : <Disc3 />}</div>
      <div className="ma-row-copy"><strong>{row.title}</strong><small>{kind === 'albums' ? `${data.categories.find(c => c.id === row.categoryId)?.title || 'No category'} · ${row.year || 'No year'} · ${row.songCount} tracks` : kind === 'songs' ? `${row.artist} · ${data.albums.find(a => a.id === row.albumId)?.title || 'Not in an album'}` : row.description}</small><span className={`ma-badge${row.published ? ' is-published' : ''}`}>{row.published ? 'Published' : 'Draft'}</span></div>
      <div className="ma-row-actions"><button type="button" disabled={busy || index === 0 || Boolean(query)} aria-label={`Move ${row.title} up`} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" disabled={busy || index === rows.length - 1 || Boolean(query)} aria-label={`Move ${row.title} down`} onClick={() => move(index, 1)}><ArrowDown size={16} /></button><button type="button" disabled={busy} aria-label={`Edit ${row.title}`} onClick={() => open(row)}><Pencil size={16} /></button><button type="button" disabled={busy} aria-label={`Delete ${row.title}`} onClick={() => remove(row)}><Trash2 size={16} /></button></div>
    </li>)}{!rows.length && <li className="ma-empty"><Disc3 size={38} /><h2>{query ? 'No matching items' : `Your ${kind} start here`}</h2><p>{kind === 'albums' ? 'Create a category, then add your first album.' : 'Add an item to begin organizing your collection.'}</p></li>}</ul>}
    <dialog ref={dialog} className="ma-dialog" onCancel={event => { if (busy) event.preventDefault(); else setEditor(null); }} onClose={() => { if (!busy) setEditor(null); }} aria-labelledby="ma-editor-title">{editor && <form onSubmit={save}><header><div><span className="ma-eyebrow">MUSIC ARCHIVE</span><h2 id="ma-editor-title">{editor.id ? 'Edit' : 'New'} {labels[editor.kind].toLowerCase()}</h2></div><button type="button" disabled={busy} aria-label="Close editor" onClick={close}><X /></button></header>
      <fieldset disabled={busy}><label>Title<input required maxLength={240} value={editor.title} onChange={e => update('title', e.target.value)} /></label>
      <label>Description / caption<textarea maxLength={4000} rows={3} value={editor.description} onChange={e => update('description', e.target.value)} /></label>
      {editor.kind === 'albums' && <div className="ma-form-pair"><label>Category<select required value={editor.categoryId} onChange={e => update('categoryId', e.target.value)}><option value="">Choose a category</option>{data.categories.map(c => <option value={c.id} key={c.id}>{c.title}</option>)}</select></label><label>Year<input type="number" min="1900" max="2200" placeholder="Optional" value={editor.year} onChange={e => update('year', e.target.value)} /></label></div>}
      {editor.kind === 'songs' && <><label>Album<select value={editor.albumId === 'unassigned' ? '' : editor.albumId} onChange={e => update('albumId', e.target.value)}><option value="">Not in an album</option>{data.albums.map(a => <option value={a.id} key={a.id}>{a.title}</option>)}</select></label><div className="ma-form-pair"><label>Artist / singer<input maxLength={240} value={editor.artist} onChange={e => update('artist', e.target.value)} /></label><label>Release / upload date<input type="date" value={editor.date} onChange={e => update('date', e.target.value)} /></label></div><label className="ma-upload"><Upload size={17} />{editor.audioUrl ? 'Replace audio file' : 'Upload audio file'}<input type="file" accept="audio/*" onChange={e => upload(e.target.files?.[0], 'audioUrl')} /><small>{editor.audioUrl ? `Audio ready ${editor.duration ? `· ${editor.duration}` : ''}` : 'MP3, WAV, M4A, Ogg, AAC, FLAC or WebM · up to 100 MB'}</small></label></>}
      {editor.kind !== 'categories' && <label className="ma-upload">{editor.previewCover && <img src={editor.previewCover} alt="Cover preview" />}<span>Upload {editor.kind === 'albums' ? 'album' : 'song'} artwork</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0], 'coverImage')} /><small>JPG, PNG or WebP · up to 10 MB</small>{editor.coverImage && <button type="button" onClick={() => setEditor(current => ({ ...current, coverImage: '', previewCover: '' }))}>Remove cover</button>}</label>}
      <label className="ma-checkbox"><input type="checkbox" checked={editor.published} onChange={e => update('published', e.target.checked)} /> Published on the website</label><small>Drafts stay out of public listings. Albums and their categories must also be published for songs to appear.</small></fieldset>
      {formError && <p role="alert" className="ma-notice">{formError}</p>}<footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="ma-primary" disabled={busy} type="submit">{busy ? 'Working…' : 'Save changes'}</button></footer>
    </form>}</dialog>
  </div>;
}
