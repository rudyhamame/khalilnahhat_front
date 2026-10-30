import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Images, Image as ImageIcon, Play, Trash2, Upload, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { addToGallery, fetchGallery, GALLERY_MAX_BYTES } from '../lib/galleryApi';
import './galleryAdmin.css';

// The Gallery is the one place assets (images and videos) are added. Items are stored as the site's "photo" and "video" media.
const MAX_BYTES = GALLERY_MAX_BYTES;
const PLAYABLE = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i;
const isPlayable = (url) => PLAYABLE.test(url) || /res\.cloudinary\.com\/[^/]+\/video\/upload/.test(url);
const clock = (seconds) => (seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}` : '');

export default function GalleryAdmin({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const picker = useRef(null);
  const dialog = useRef(null);

  const load = useCallback(async () => {
    try {
      setItems(await fetchGallery());
      setError('');
    } catch (e) { setError(e.message || 'Could not load the gallery.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (preview && !node.open) node.showModal();
    else if (!preview && node.open) node.close();
  }, [preview]);

  const addFiles = async (fileList) => {
    const files = [...fileList];
    const accepted = files.filter((file) => /^(image|video)\//.test(file.type));
    const problems = files.filter((file) => !accepted.includes(file)).map((file) => `${file.name}: only images and videos can be added.`);
    const ready = accepted.filter((file) => file.size <= MAX_BYTES || (problems.push(`${file.name}: larger than 200 MB.`), false));
    if (!ready.length) { setError(problems.join(' ') || 'Choose images or videos to add.'); return; }
    setError('');
    setBusy({ done: 0, total: ready.length });
    for (const [index, file] of ready.entries()) {
      try {
        await addToGallery(file, token);
      } catch (e) { problems.push(`${file.name}: ${e.message}`); }
      setBusy({ done: index + 1, total: ready.length });
    }
    setBusy(null);
    await load();
    if (problems.length) setError(problems.join(' ')); // set after load(), which clears errors
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}” from the gallery?`)) return;
    try { await apiRequest(`/content/media/${item.id}`, { method: 'DELETE', token }); setPreview(null); await load(); } catch (e) { setError(e.message || 'Could not delete.'); }
  };

  const photos = items.filter((item) => item.kind === 'photo').length;
  const videos = items.filter((item) => item.kind === 'video').length;
  const shown = items.filter((item) => filter === 'all' || (filter === 'images' ? item.kind === 'photo' : item.kind === 'video'));

  return <section className="gallery-admin" aria-label="Gallery">
    <header className="gallery-head">
      <div><p className="detail-label">ASSETS</p><h2>Gallery</h2><p>Images and videos for the website. This is the only place assets are added.</p></div>
      <div className="gallery-actions">
        <div className="gallery-filter" role="group" aria-label="Filter assets">
          {[['all', `All ${items.length}`], ['images', `Images ${photos}`], ['videos', `Videos ${videos}`]].map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <button type="button" className="gallery-add" disabled={Boolean(busy)} onClick={() => picker.current?.click()}><Upload size={15} />{busy ? `Uploading ${busy.done}/${busy.total}…` : 'Add assets'}</button>
        <input ref={picker} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
      </div>
    </header>
    {error ? <p className="gallery-error" role="alert">{error}</p> : null}

    <div className={`gallery-drop${dragging ? ' is-over' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length && !busy) addFiles(event.dataTransfer.files); }}>
      {loading ? <p className="gallery-empty">Loading the gallery…</p> : shown.length ? <ul className="gallery-grid">
        {shown.map((item) => <li key={item.id} className="gallery-tile">
          <button type="button" className="gallery-open" onClick={() => setPreview(item)} aria-label={`View ${item.title}`}>
            {item.kind === 'photo'
              ? <img src={item.mediaUrl} alt={item.title} loading="lazy" />
              : isPlayable(item.mediaUrl)
                ? <video src={`${item.mediaUrl}#t=0.1`} preload="metadata" muted playsInline />
                : <span className="gallery-link-tile"><Film size={26} strokeWidth={1.4} /></span>}
            {item.kind === 'video' ? <span className="gallery-badge"><Play size={11} fill="currentColor" />{clock(item.durationSec) || 'Video'}</span> : null}
          </button>
          <div className="gallery-meta"><span title={item.title}>{item.title}</span><button type="button" className="gallery-delete" onClick={() => remove(item)} aria-label={`Delete ${item.title}`} title="Delete"><Trash2 size={14} /></button></div>
        </li>)}
      </ul> : <div className="gallery-empty">
        <Images size={34} strokeWidth={1.2} />
        <strong>{items.length ? 'Nothing here' : 'No assets yet'}</strong>
        <p>{items.length ? 'No items match this filter.' : 'Drop images or videos here, or use Add assets.'}</p>
      </div>}
      <div className="gallery-drop-hint" aria-hidden="true"><Upload size={22} />Drop to add</div>
    </div>

    <dialog ref={dialog} className="gallery-viewer" onClose={() => setPreview(null)} onClick={(event) => { if (event.target === dialog.current) setPreview(null); }} aria-label={preview ? preview.title : 'Asset viewer'}>
      {preview ? <>
        <header><div><strong>{preview.title}</strong><small>{preview.kind === 'photo' ? 'Image' : 'Video'}</small></div>
          <div><button type="button" className="gallery-delete is-text" onClick={() => remove(preview)}><Trash2 size={15} />Delete</button><button type="button" className="gallery-close" onClick={() => setPreview(null)} aria-label="Close viewer"><X size={18} /></button></div></header>
        <div className="gallery-stage">
          {preview.kind === 'photo' ? <img src={preview.mediaUrl} alt={preview.title} />
            : isPlayable(preview.mediaUrl) ? <video src={preview.mediaUrl} controls autoPlay playsInline />
              : <a className="gallery-external" href={preview.mediaUrl} target="_blank" rel="noopener noreferrer"><ImageIcon size={20} />Open video link</a>}
        </div>
      </> : null}
    </dialog>
  </section>;
}
