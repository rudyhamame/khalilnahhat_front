import {useEffect, useRef, useState} from 'react';
import {apiBaseUrl, apiRequest} from '../lib/api';

// Profile photo for the client dashboard's "Personal info" tab: pick a photo, drag to pan, slide/wheel/pinch to zoom, save a 256px square.
const VIEW = 280, OUT = 256, MAX_ZOOM = 4;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Cropper({file, onCancel, onSave, busy}) {
  const [img, setImg] = useState(null), [zoom, setZoom] = useState(1), [pos, setPos] = useState({x: 0, y: 0}), [error, setError] = useState('');
  const pointers = useRef(new Map()), pinch = useRef(0);
  useEffect(() => {
    const url = URL.createObjectURL(file), image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError('That file is not a readable image.');
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1, scale = base * zoom;
  const w = img ? img.naturalWidth * scale : 0, h = img ? img.naturalHeight * scale : 0;
  // Keep the photo covering the circle: it can never be dragged off to show empty space.
  const fit = (p, s = scale) => img ? {x: clamp(p.x, -(img.naturalWidth * s - VIEW) / 2, (img.naturalWidth * s - VIEW) / 2), y: clamp(p.y, -(img.naturalHeight * s - VIEW) / 2, (img.naturalHeight * s - VIEW) / 2)} : p;
  const zoomTo = next => { const z = clamp(next, 1, MAX_ZOOM); setZoom(z); setPos(p => fit(p, base * z)); };
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY}); pinch.current = 0; };
  const move = e => {
    const last = pointers.current.get(e.pointerId); if (!last) return;
    pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const pts = [...pointers.current.values()];
    if (pts.length === 2) { const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); if (pinch.current) zoomTo(zoom * d / pinch.current); pinch.current = d; return; }
    setPos(p => fit({x: p.x + e.clientX - last.x, y: p.y + e.clientY - last.y}));
  };
  const up = e => { pointers.current.delete(e.pointerId); pinch.current = 0; };
  const save = () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = OUT;
    const left = VIEW / 2 + pos.x - w / 2, top = VIEW / 2 + pos.y - h / 2;
    canvas.getContext('2d').drawImage(img, -left / scale, -top / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    onSave(canvas.toDataURL('image/jpeg', 0.86));
  };
  return <div className="cw-avatar-modal" role="dialog" aria-modal="true" aria-label="Adjust your photo">
    <div className="cw-avatar-card">
      <h2>Adjust your photo</h2>
      <p>Drag to move. Use the slider, mouse wheel or two fingers to zoom.</p>
      <div className="cw-avatar-stage" style={{width: VIEW, height: VIEW}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={e => zoomTo(zoom - e.deltaY * 0.002)}>
        {img && <img alt="" draggable={false} src={img.src} style={{width: w, height: h, left: VIEW / 2 + pos.x - w / 2, top: VIEW / 2 + pos.y - h / 2}}/>}
      </div>
      <label className="cw-avatar-zoom">Zoom<input type="range" min="1" max={MAX_ZOOM} step="0.01" value={zoom} onChange={e => zoomTo(Number(e.target.value))}/></label>
      {error && <p role="alert" className="cw-profile-error">{error}</p>}
      <div className="cw-avatar-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="primary-button" onClick={save} disabled={!img || busy}>{busy ? 'Saving…' : 'Save photo'}</button></div>
    </div>
  </div>;
}

export default function AvatarEditor({user, token, onChanged}) {
  const [src, setSrc] = useState(''), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const version = user?.avatarVersion || 0;
  useEffect(() => { // the photo is private, so it is fetched with the session token rather than used as a plain <img> URL
    if (!version) { setSrc(''); return undefined; }
    let url = '', alive = true;
    fetch(`${apiBaseUrl}/account/avatar`, {headers: {Authorization: `Bearer ${token}`}}).then(r => r.ok ? r.blob() : null).then(b => { if (alive && b) { url = URL.createObjectURL(b); setSrc(url); } }).catch(() => {});
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [version, token]);
  const upload = async image => {
    setBusy(true); setError('');
    try { const {avatarVersion} = await apiRequest('/account/avatar', {method: 'PUT', token, body: {image}}); onChanged?.({...user, avatarVersion}); setFile(null); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try { await apiRequest('/account/avatar', {method: 'DELETE', token}); onChanged?.({...user, avatarVersion: 0}); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const initial = (user?.firstName || user?.email || '?').trim().charAt(0).toUpperCase();
  return <section className="cw-panel cw-avatar" aria-label="Profile photo">
    <div className="cw-avatar-photo">{src ? <img src={src} alt="Your profile photo"/> : <span aria-hidden="true">{initial}</span>}</div>
    <div className="cw-avatar-meta">
      <strong>Profile photo</strong><small>Shown to our team next to your bookings.</small>
      <div className="cw-avatar-buttons">
        <label className="secondary-button cw-avatar-pick">{src ? 'Change photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setError(''); setFile(f); } }}/></label>
        {src && <button type="button" className="secondary-button" onClick={remove} disabled={busy}>Remove</button>}
      </div>
      {error && <p role="alert" className="cw-profile-error">{error}</p>}
    </div>
    {file && <Cropper file={file} busy={busy} onCancel={() => setFile(null)} onSave={upload}/>}
  </section>;
}
