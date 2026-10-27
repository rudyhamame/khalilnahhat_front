import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Disc3, Music2, Pencil, Plus, Trash2, X, Upload } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import './musicArchive.css';

const labels = { categories: 'Category', albums: 'Album', songs: 'Recording' };
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const empty = { categories: [], albums: [], songs: [] };
export default function MusicArchiveAdmin({ token }) {
  const [data, setData] = useState(empty);
  const [kind, setKind] = useState('categories');
  const [query, setQuery] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
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
  const open = (row, targetKind = kind) => {
    setFormError('');
    setEditor({ kind: targetKind, id: row?.id || '', title: row?.title || '', description: row?.description || '', published: row?.published ?? false,
      categoryId: row?.categoryId || activeCategoryId || data.categories[0]?.id || '', year: row?.year || '',
      albumId: row ? (row.albumId || '') : (albumFilter === 'unassigned' ? '' : albumFilter || (activeCategoryId ? data.albums.find(album => album.categoryId === activeCategoryId)?.id || '' : '')), artist: row?.artist || 'DJ Khalil', date: row?.date || today(),
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
  const remove = async (row, targetKind = kind) => {
    if (!window.confirm(`Delete “${row.title}”? This removes its archive entry. Stored media files are retained.`)) return;
    setBusy(true); setNotice('');
    try { await apiRequest(`/admin/music-archive/${targetKind}/${row.id}`, { token, method: 'DELETE' }); await load(); setNotice('Archive entry deleted. Stored media files remain recoverable.'); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const categoryCounts = useMemo(() => {
    const counts = new Map(data.categories.map(category => [category.id, { albums: 0, songs: 0 }]));
    const albumCategories = new Map();
    for (const album of data.albums) {
      albumCategories.set(album.id, album.categoryId);
      const count = counts.get(album.categoryId);
      if (count) count.albums++;
    }
    for (const song of data.songs) {
      const count = counts.get(albumCategories.get(song.albumId));
      if (count) count.songs++;
    }
    return counts;
  }, [data]);
  const rows = data[kind].filter(row => (!query || `${row.title} ${row.artist || ''}`.toLowerCase().includes(query.toLowerCase())) && (kind !== 'songs' || !albumFilter || (albumFilter === 'unassigned' ? !row.albumId : row.albumId === albumFilter)));
  const activeCategory = data.categories.find(category => category.id === activeCategoryId);
  const visibleAlbums = data.albums.filter(album => !activeCategoryId || album.categoryId === activeCategoryId);
  const categoryAlbumIds = new Set(visibleAlbums.map(album => album.id));
  const categoryRecordings = data.songs.filter(song => !activeCategoryId || categoryAlbumIds.has(song.albumId));
  const recordingRows = data.songs.filter(row => (!query || `${row.title} ${row.artist || ''}`.toLowerCase().includes(query.toLowerCase())) && (albumFilter === 'unassigned' ? !row.albumId : categoryAlbumIds.has(row.albumId) && (!albumFilter || row.albumId === albumFilter)));
  const selectedAlbumIndex = visibleAlbums.findIndex(album => album.id === albumFilter);
  const selectedAlbum = visibleAlbums[selectedAlbumIndex];
  const enterCategory = category => { setSelectedCategoryId(category.id); setActiveCategoryId(category.id); setKind('songs'); setAlbumFilter(''); setQuery(''); };
  const backToCategories = () => { setKind('categories'); setActiveCategoryId(''); setAlbumFilter(''); setQuery(''); };
  const selectedCategoryIndex = kind === 'categories' ? rows.findIndex(row => row.id === selectedCategoryId) : -1;
  const selectedCategory = rows[selectedCategoryIndex];
  const move = async (index, direction, targetKind = kind, source = rows) => {
    const ordered = [...source]; [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    setBusy(true); setNotice('');
    try { await apiRequest(`/admin/music-archive/${targetKind}/order`, { token, method: 'PUT', body: { ids: ordered.map(row => row.id) } }); await load(); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  return <div className="ma-admin">
    {kind !== 'categories' && <div className="ma-category-breadcrumb"><button type="button" onClick={backToCategories}>← Back to categories</button><h2>{activeCategory?.title || 'Music Archive'}</h2></div>}

    {kind === 'categories' && <div className="ma-toolbar"><label>Search categories<input type="search" value={query} placeholder="Find a category…" onChange={event => setQuery(event.target.value)} /></label></div>}
    {notice && <p className="ma-notice" role="status">{notice} <button type="button" disabled={busy} onClick={() => load().then(() => setNotice('')).catch(e => setNotice(e.message))}>Refresh</button></p>}
    {loading ? <p role="status">Loading your archive…</p> : kind === 'categories' ? <><header className="ma-library-heading"><div><h2>Categories</h2><small>{data.categories.length} categories</small></div><button type="button" className="ma-library-add ma-add-icon" aria-label="Add category" title="Add category" disabled={busy} onClick={() => open(null, 'categories')}><Plus size={18}/></button></header><div className="ma-category-toolbar" role="group" aria-label="Category controls"><span>{selectedCategory ? selectedCategory.title : 'Click a category to open its albums and recordings.'}</span><div className="ma-category-global-actions"><button type="button" disabled={busy || selectedCategoryIndex <= 0 || Boolean(query)} onClick={() => move(selectedCategoryIndex, -1)}><ArrowUp size={16} />Move up</button><button type="button" disabled={busy || selectedCategoryIndex < 0 || selectedCategoryIndex === rows.length - 1 || Boolean(query)} onClick={() => move(selectedCategoryIndex, 1)}><ArrowDown size={16} />Move down</button><button type="button" disabled={busy || !selectedCategory} onClick={() => open(selectedCategory)}><Pencil size={16} />Edit</button><button type="button" disabled={busy || !selectedCategory} onClick={() => remove(selectedCategory)}><Trash2 size={16} />Delete</button></div></div><div className="ma-category-table-wrap"><table className="ma-category-table" aria-label="Music archive categories"><thead><tr><th scope="col">Name</th><th scope="col">Albums</th><th scope="col">Songs</th></tr></thead><tbody>{rows.map(row => {
      const counts = categoryCounts.get(row.id) || { albums: 0, songs: 0 };
      return <tr key={row.id} className={selectedCategoryId === row.id ? 'is-selected' : ''} onClick={() => enterCategory(row)}><th scope="row"><div className="ma-category-name"><span className="ma-row-copy"><button type="button" className="ma-category-open" onClick={event => { event.stopPropagation(); enterCategory(row); }} aria-label={`Open ${row.title} albums and recordings`}>{row.title}</button>{row.description && <small>{row.description}</small>}<span className={`ma-badge${row.published ? ' is-published' : ''}`}>{row.published ? 'Published' : 'Draft'}</span></span></div></th><td>{counts.albums}</td><td>{counts.songs}</td></tr>;
    })}{!rows.length && <tr><td colSpan={3}><div className="ma-empty"><Disc3 size={38} /><h2>{query ? 'No matching categories' : 'No categories yet'}</h2><p>{query ? 'Try a different search.' : 'Use Add category above to get started.'}</p></div></td></tr>}</tbody></table></div></> : <div className="ma-library-layout">
      <aside className="ma-album-aside" aria-labelledby="ma-admin-albums-title"><header><div><h2 id="ma-admin-albums-title">Albums</h2><small>{visibleAlbums.length} albums</small></div><button type="button" className="ma-library-add ma-add-icon" aria-label="Add album" title="Add album" disabled={busy || !data.categories.length} onClick={() => open(null, 'albums')}><Plus size={18}/></button></header>
        <nav className="ma-album-options" aria-label="Filter recordings by album"><button type="button" aria-pressed={!albumFilter} onClick={() => setAlbumFilter('')}><Music2 size={18} /><span>All recordings</span><small>{categoryRecordings.length}</small></button><button type="button" aria-pressed={albumFilter === 'unassigned'} onClick={() => setAlbumFilter('unassigned')}><Music2 size={18} /><span>Unassigned recordings</span><small>{data.songs.filter(song => !song.albumId).length}</small></button>
          {visibleAlbums.map(album => <button type="button" key={album.id} aria-pressed={albumFilter === album.id} onClick={() => setAlbumFilter(album.id)}>{album.coverImage ? <img src={album.coverImage} alt=""/> : <Disc3 size={24}/>}<span><strong>{album.title}</strong><small>{data.categories.find(category => category.id === album.categoryId)?.title || 'No category'} · {album.published ? 'Published' : 'Draft'}</small></span><small>{data.songs.filter(song => song.albumId === album.id).length}</small></button>)}
          {!visibleAlbums.length && <p className="ma-album-none">No albums yet. Add an album to organise your recordings.</p>}
        </nav>
        <div className="ma-album-controls" role="group" aria-label="Selected album controls"><span>{selectedAlbum?.title || 'Select an album to manage it'}</span><div className="ma-category-global-actions"><button type="button" disabled={busy || selectedAlbumIndex <= 0} aria-label="Move selected album up" onClick={() => move(selectedAlbumIndex, -1, 'albums', visibleAlbums)}><ArrowUp size={15}/></button><button type="button" disabled={busy || selectedAlbumIndex < 0 || selectedAlbumIndex === visibleAlbums.length - 1} aria-label="Move selected album down" onClick={() => move(selectedAlbumIndex, 1, 'albums', visibleAlbums)}><ArrowDown size={15}/></button><button type="button" disabled={busy || !selectedAlbum} onClick={() => open(selectedAlbum, 'albums')}><Pencil size={15}/>Edit</button><button type="button" disabled={busy || !selectedAlbum} onClick={() => remove(selectedAlbum, 'albums')}><Trash2 size={15}/>Delete</button></div></div>
      </aside>
      <section className="ma-recordings-main" aria-labelledby="ma-admin-recordings-title"><header><div><h2 id="ma-admin-recordings-title">Recordings</h2><p>{selectedAlbum?.title || (albumFilter === 'unassigned' ? 'Not in an album' : 'All albums')} · {recordingRows.length} recordings</p></div><button type="button" className="ma-library-add ma-add-icon" aria-label="Add recording" title="Add recording" disabled={busy} onClick={() => open(null, 'songs')}><Plus size={18}/></button></header>
        <div className="ma-recordings-table-wrap"><table className="ma-recordings-table" aria-label="Recordings"><thead><tr><th scope="col">Name</th><th scope="col">Artist</th><th scope="col">Duration</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{recordingRows.map((row, index) => <tr key={row.id}><th scope="row"><div className="ma-recording-name"><div className="ma-thumb">{row.coverImage ? <img src={row.coverImage} alt=""/> : <Music2/>}</div><div className="ma-row-copy"><strong>{row.title}</strong><small>{data.albums.find(album => album.id === row.albumId)?.title || 'Not in an album'}</small></div></div></th><td>{row.artist || '—'}</td><td className="ma-recording-duration">{row.duration || '—'}</td><td><span className={`ma-badge${row.published ? ' is-published' : ''}`}>{row.published ? 'Published' : 'Draft'}</span></td><td><div className="ma-row-actions" role="group" aria-label={`Actions for ${row.title}`}><button type="button" disabled={busy || index === 0 || Boolean(query)} aria-label={`Move ${row.title} up`} onClick={() => move(index, -1, 'songs', recordingRows)}><ArrowUp size={16}/></button><button type="button" disabled={busy || index === recordingRows.length - 1 || Boolean(query)} aria-label={`Move ${row.title} down`} onClick={() => move(index, 1, 'songs', recordingRows)}><ArrowDown size={16}/></button><button type="button" disabled={busy} aria-label={`Edit ${row.title}`} onClick={() => open(row, 'songs')}><Pencil size={16}/></button><button type="button" disabled={busy} aria-label={`Delete ${row.title}`} onClick={() => remove(row, 'songs')}><Trash2 size={16}/></button></div></td></tr>)}{!recordingRows.length && <tr><td colSpan={5}><div className="ma-empty"><Music2 size={36}/><h2>No recordings here yet</h2><p>{selectedAlbum ? 'Add a recording to this album.' : 'Upload a recording to get started.'}</p></div></td></tr>}</tbody></table></div>

      </section>
    </div>}

    <dialog ref={dialog} className="ma-dialog" onCancel={event => { if (busy) event.preventDefault(); else setEditor(null); }} onClose={() => { if (!busy) setEditor(null); }} aria-labelledby="ma-editor-title">{editor && <form onSubmit={save}><header><div><span className="ma-eyebrow">MUSIC ARCHIVE</span><h2 id="ma-editor-title">{editor.id ? 'Edit' : 'New'} {labels[editor.kind].toLowerCase()}</h2></div><button type="button" disabled={busy} aria-label="Close editor" onClick={close}><X /></button></header>
      <fieldset disabled={busy}><label>Title<input required maxLength={240} value={editor.title} onChange={e => update('title', e.target.value)} /></label>
      <label>Description / caption (optional)<textarea maxLength={4000} rows={2} value={editor.description} onChange={e => update('description', e.target.value)} /></label>
      {editor.kind === 'albums' && <div className="ma-form-pair"><label>Category<select required value={editor.categoryId} onChange={e => update('categoryId', e.target.value)}><option value="">Choose a category</option>{data.categories.map(c => <option value={c.id} key={c.id}>{c.title}</option>)}</select></label><label>Year<input type="number" min="1900" max="2200" placeholder="Optional" value={editor.year} onChange={e => update('year', e.target.value)} /></label></div>}
      {editor.kind === 'songs' && <><label>Album<select value={editor.albumId === 'unassigned' ? '' : editor.albumId} onChange={e => update('albumId', e.target.value)}><option value="">Not in an album</option>{data.albums.map(a => <option value={a.id} key={a.id}>{a.title}</option>)}</select></label><div className="ma-form-pair"><label>Artist / singer<input maxLength={240} value={editor.artist} onChange={e => update('artist', e.target.value)} /></label><label>Release / upload date<input type="date" value={editor.date} onChange={e => update('date', e.target.value)} /></label></div><label className="ma-upload"><Upload size={17} />{editor.audioUrl ? 'Replace audio file' : 'Upload audio file'}<input type="file" accept="audio/*" onChange={e => upload(e.target.files?.[0], 'audioUrl')} /><small>{editor.audioUrl ? `Audio ready ${editor.duration ? `· ${editor.duration}` : ''}` : 'MP3, WAV, M4A, Ogg, AAC, FLAC or WebM · up to 100 MB'}</small></label></>}
      {editor.kind !== 'categories' && <label className="ma-upload">{editor.previewCover && <img src={editor.previewCover} alt="Cover preview" />}<span>Upload {editor.kind === 'albums' ? 'album' : 'recording'} artwork</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0], 'coverImage')} /><small>JPG, PNG or WebP · up to 10 MB</small>{editor.coverImage && <button type="button" onClick={() => setEditor(current => ({ ...current, coverImage: '', previewCover: '' }))}>Remove cover</button>}</label>}
      <label className="ma-checkbox"><input type="checkbox" checked={editor.published} onChange={e => update('published', e.target.checked)} /> Published on the website</label><small>Drafts stay out of public listings. Albums and their categories must also be published for recordings to appear.</small></fieldset>
      {formError && <p role="alert" className="ma-notice">{formError}</p>}<footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="ma-primary" disabled={busy} type="submit">{busy ? 'Working…' : 'Save changes'}</button></footer>
    </form>}</dialog>
  </div>;
}
