import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Images, Upload, X } from 'lucide-react';
import { addToGallery, fetchGallery, GALLERY_MAX_BYTES } from '../lib/galleryApi';
import './galleryAdmin.css';

// Pick an image from the Gallery. "Add" uploads new images into the Gallery first; you then choose one from the grid.
export default function GalleryPicker({ open, onClose, onSelect, token, selectedUrl = '', title = 'Choose an image', allowUpload = true }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await fetchGallery(['photo'])); setError(''); } catch (e) { setError(e.message || 'Could not load the gallery.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) { node.showModal(); setLoading(true); load(); }
    else if (!open && node.open) node.close();
  }, [open, load]);

  const addFiles = async (fileList) => {
    const files = [...fileList];
    const problems = [];
    const ready = files.filter((file) => (!file.type.startsWith('image/') ? (problems.push(`${file.name}: choose an image.`), false) : file.size > GALLERY_MAX_BYTES ? (problems.push(`${file.name}: larger than 200 MB.`), false) : true));
    if (!ready.length) { setError(problems.join(' ') || 'Choose images to add.'); return; }
    setError('');
    setBusy({ done: 0, total: ready.length });
    for (const [index, file] of ready.entries()) {
      try { await addToGallery(file, token); } catch (e) { problems.push(`${file.name}: ${e.message}`); }
      setBusy({ done: index + 1, total: ready.length });
    }
    setBusy(null);
    await load();
    if (problems.length) setError(problems.join(' '));
  };

  return <dialog ref={dialog} className="gallery-picker" aria-label={title} onClose={onClose} onClick={(event) => { if (event.target === dialog.current && !busy) onClose(); }}
    onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (allowUpload && !busy && event.dataTransfer.files.length) addFiles(event.dataTransfer.files); }}>
    <header>
      <div><small>GALLERY</small><h3>{title}</h3></div>
      <div className="gallery-picker-actions">
        {allowUpload && <><button type="button" className="gallery-add" disabled={Boolean(busy)} onClick={() => input.current?.click()}><Upload size={15} />{busy ? `Adding ${busy.done}/${busy.total}…` : 'Add'}</button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} /></>}
        <button type="button" className="gallery-close" disabled={Boolean(busy)} onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
    </header>
    {error ? <p className="gallery-error" role="alert">{error}</p> : null}
    <div className={`gallery-picker-body${dragging ? ' is-over' : ''}`}>
      {loading ? <p className="gallery-empty">Loading the gallery…</p> : items.length ? <ul className="gallery-grid">
        {items.map((item) => <li key={item.id} className={`gallery-tile${item.mediaUrl === selectedUrl ? ' is-selected' : ''}`}>
          <button type="button" className="gallery-open gallery-pick" onClick={() => { onSelect(item); onClose(); }} aria-label={`Use ${item.title}`}><img src={item.mediaUrl} alt={item.title} loading="lazy" /></button>
          <div className="gallery-meta"><span title={item.title}>{item.title}</span></div>
        </li>)}
      </ul> : <div className="gallery-empty"><Images size={34} strokeWidth={1.2} /><strong>No images yet</strong><p>{allowUpload ? 'Use Add to put an image in the gallery, then choose it.' : 'Add images in Gallery, then return here to choose one.'}</p></div>}
      {allowUpload && <div className="gallery-drop-hint" aria-hidden="true"><Upload size={22} />Drop to add</div>}
    </div>
  </dialog>;
}

// A cover/photo field: preview, "Choose from gallery" and "Remove". onChange(url) receives the gallery image URL (or '').
export function GalleryImageField({ token, value = '', onChange, label = 'Image', disabled = false, compact = false }) {
  const [open, setOpen] = useState(false);
  return <div className={`gallery-field${compact ? ' is-compact' : ''}`}>
    <span className="gallery-field-label">{label}</span>
    <div className="gallery-field-row">
      <span className="gallery-field-preview">{value ? <img src={value} alt="" /> : <ImagePlus size={20} strokeWidth={1.4} />}</span>
      <button type="button" className="gallery-field-choose" disabled={disabled} onClick={() => setOpen(true)}>{value ? 'Change' : 'Choose from gallery'}</button>
      {value ? <button type="button" className="gallery-field-remove" disabled={disabled} onClick={() => onChange('')}>Remove</button> : null}
    </div>
    <GalleryPicker open={open} onClose={() => setOpen(false)} token={token} selectedUrl={value} title={`Choose ${label.toLowerCase()}`} onSelect={(item) => onChange(item.mediaUrl, item)} />
  </div>;
}
