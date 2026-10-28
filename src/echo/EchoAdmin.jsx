import SeasonalThemeAdmin from './SeasonalThemeAdmin';
import Testimonials from './TestimonialsAdmin';
import EquipmentQuantityField from '../components/EquipmentQuantityField';
import AiConfigurationAdmin from './AiConfigurationAdmin';
import AdminSelect from '../components/AdminSelect';
import AdminWorkspace from '../components/AdminWorkspace';
import { useCallback, useEffect, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import MusicArchiveAdmin from './MusicArchiveAdmin';
import RecordingsCollectionsAdmin from './RecordingsCollectionsAdmin';
import LiveArchiveAdmin from './LiveArchiveAdmin';
import './live.css';

const TABS = ['seasonal theme', 'ai configuration', 'music archive', 'recordings collections', 'live archive', 'equipment', 'testimonials', 'media', 'meetings'];

function useAdminList(path, token) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(() => apiRequest(path, { token }).then((r) => setItems(r.items)).catch((e) => setError(e.message)), [path, token]);
  useEffect(() => { load(); }, [load]);
  return { items, error, load };
}

async function upload(file, url, field, token) {
  const body = new FormData();
  body.append(field, file);
  const r = await fetch(`${apiBaseUrl}${url}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || 'Upload failed.');
  return j;
}

function Equipment({ token }) {
  const { items, error, load } = useAdminList('/equipment/admin', token);
  const [msg, setMsg] = useState('');
  const patch = async (id, body) => { try { await apiRequest(`/equipment/${id}`, { method: 'PATCH', body, token }); setMsg(''); load(); } catch (e) { setMsg(e.message); } };
  const add = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await apiRequest('/equipment', { method: 'POST', token, body: { slug: f.get('slug'), category: f.get('category'), name: f.get('name') } });
      e.target.reset(); load();
    } catch (err) { setMsg(err.message); }
  };
  return (
    <>
      {(error || msg) && <p role="alert" className="echo-error">{error || msg}</p>}
      <div className="echo-admin-table">
        {items.map((i) => (
          <div className="echo-admin-row" key={i.id}>
            <strong>{i.name}</strong>
            <label>Price (CAD)<input type="number" min="0" step="0.01" defaultValue={i.priceCents / 100} onBlur={(e) => patch(i.id, { priceCents: Math.round(Number(e.target.value) * 100) })} /></label>
            <label>Min qty<input type="number" min="1" defaultValue={i.minQuantity} onBlur={(e) => patch(i.id, { minQuantity: Number(e.target.value) })} /></label>
            <div><span>Available quantity</span><EquipmentQuantityField equipmentId={i.id} name={i.name} availableQuantity={i.availableQuantity} token={token} onSaved={load}/></div>
            <label className="echo-check"><input type="checkbox" defaultChecked={i.stockTracked} onChange={(e) => patch(i.id, { stockTracked: e.target.checked })} />Track stock</label>
            <label className="echo-check"><input type="checkbox" defaultChecked={i.isActive} onChange={(e) => patch(i.id, { isActive: e.target.checked })} />Available</label>
            <label>Description<input defaultValue={i.description} onBlur={(e) => patch(i.id, { description: e.target.value })} /></label>
            <label>Photo<input type="file" accept="image/*" onChange={async (e) => { try { await upload(e.target.files[0], `/equipment/${i.id}/photo`, 'photo', token); load(); } catch (err) { setMsg(err.message); } }} /></label>
            <button type="button" className="echo-link" onClick={() => window.confirm(`Delete ${i.name}?`) && apiRequest(`/equipment/${i.id}`, { method: 'DELETE', token }).then(load)}>Delete</button>
          </div>
        ))}
      </div>
      <form className="echo-form" onSubmit={add}>
        <fieldset><legend>Add equipment</legend>
          <label>Id (a-z, 0-9, -)<input name="slug" pattern="[a-z0-9-]+" required /></label>
          <label>Category<input name="category" required placeholder="lighting / sound / effects / video" /></label>
          <label>Name<input name="name" required /></label>
        </fieldset>
        <button className="echo-btn">ADD</button>
      </form>
    </>
  );
}


function Media({ token }) {
  const { items, error, load } = useAdminList('/content/media/admin', token);
  const [msg, setMsg] = useState('');
  const add = async (e) => {
    e.preventDefault();
    setMsg('Uploading…');
    try {
      const form = e.target;
      const f = Object.fromEntries(new FormData(form));
      let mediaUrl = f.url;
      let durationSec = 0;
      if (form.file.files[0]) ({ url: mediaUrl, durationSec } = await upload(form.file.files[0], '/content/upload', 'file', token));
      let coverUrl = '';
      if (form.cover.files[0]) ({ url: coverUrl } = await upload(form.cover.files[0], '/content/upload', 'file', token));
      if (!mediaUrl) throw new Error('Choose a file or paste a URL.');
      await apiRequest('/content/media', { method: 'POST', token, body: { kind: f.kind, category: f.category, title: f.title, titleAr: f.titleAr, mediaUrl, coverUrl, durationSec, downloadable: f.downloadable === 'on' } });
      form.reset(); setMsg(''); load();
    } catch (err) { setMsg(err.message); }
  };
  return (
    <>
      {(error || msg) && <p role="alert" className="echo-error">{error || msg}</p>}
      {items.map((m) => (
        <div className="echo-admin-row" key={m.id}>
          <strong>{m.title}</strong><span>{m.kind} · {m.category}</span>
          <label className="echo-check"><input type="checkbox" defaultChecked={m.isPublished} onChange={(e) => apiRequest(`/content/media/${m.id}`, { method: 'PATCH', token, body: { isPublished: e.target.checked } })} />Published</label>
          <label className="echo-check"><input type="checkbox" defaultChecked={m.downloadable} onChange={(e) => apiRequest(`/content/media/${m.id}`, { method: 'PATCH', token, body: { downloadable: e.target.checked } })} />Downloadable</label>
          <button type="button" className="echo-link" onClick={() => window.confirm('Delete?') && apiRequest(`/content/media/${m.id}`, { method: 'DELETE', token }).then(load)}>Delete</button>
        </div>
      ))}
      <form className="echo-form" onSubmit={add}>
        <fieldset><legend>Add mix, video or photo</legend>
          <label>Type<AdminSelect name="kind"><option value="mix">Mix (audio)</option><option value="video">Video</option><option value="photo">Photo</option></AdminSelect></label>
          <label>Category<input name="category" placeholder="Arabic Mixes, Wedding Highlights…" /></label>
          <label>Title<input name="title" required /></label><label>Title (Arabic)<input name="titleAr" dir="rtl" /></label>
          <label>File upload<input name="file" type="file" accept="audio/*,video/*,image/*" /></label>
          <label>…or URL (YouTube / Vimeo / file)<input name="url" type="url" /></label>
          <label>Cover image<input name="cover" type="file" accept="image/*" /></label>
          <label className="echo-check"><input name="downloadable" type="checkbox" />Allow download</label>
        </fieldset>
        <button className="echo-btn">ADD</button>
      </form>
    </>
  );
}

function Meetings({ token }) {
  const { items, error, load } = useAdminList('/meetings/admin', token);
  const [msg, setMsg] = useState('');
  const add = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const starts = f.starts.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => new Date(s).toISOString());
      await apiRequest('/meetings/slots', { method: 'POST', token, body: { starts, durationMin: Number(f.durationMin), mode: f.mode, link: f.link, location: f.location } });
      e.target.reset(); setMsg(''); load();
    } catch (err) { setMsg(err.message === 'Invalid time value' ? 'Use one date/time per line, e.g. 2026-11-02T14:00' : err.message); }
  };
  const fmt = (d) => new Date(d).toLocaleString('en-CA');
  return (
    <>
      {(error || msg) && <p role="alert" className="echo-error">{error || msg}</p>}
      {items.map((m) => (
        <div className="echo-admin-row" key={m.id}>
          <strong>{fmt(m.start)}</strong>
          <span>{m.status === 'booked' ? `${m.bookedByName} (${m.bookedByEmail}) — ${m.topic || 'no topic'}` : 'open'}</span>
          {m.status === 'booked'
            ? <button type="button" className="echo-link" onClick={() => window.confirm('Cancel this meeting?') && apiRequest(`/meetings/${m.id}/cancel`, { method: 'POST', token }).then(load)}>Cancel</button>
            : <button type="button" className="echo-link" onClick={() => apiRequest(`/meetings/slots/${m.id}`, { method: 'DELETE', token }).then(load)}>Remove</button>}
        </div>
      ))}
      <form className="echo-form" onSubmit={add}>
        <fieldset><legend>Open time slots (Toronto time)</legend>
          <label>Date/times, one per line (YYYY-MM-DDTHH:MM)<textarea name="starts" rows="4" required placeholder="2026-11-02T14:00" /></label>
          <label>Length (min)<input name="durationMin" type="number" defaultValue="30" min="5" /></label>
          <label>Mode<AdminSelect name="mode"><option value="online">Online</option><option value="in-person">In person</option></AdminSelect></label>
          <label>Meeting link<input name="link" /></label><label>Location<input name="location" /></label>
        </fieldset>
        <button className="echo-btn">ADD SLOTS</button>
      </form>
    </>
  );
}

export default function EchoAdmin({ user, token, isSessionReady, onLogout, search = '' }) {
  const requestedTab = new URLSearchParams(search).get('tab')?.replaceAll('-', ' ');
  const tab = TABS.includes(requestedTab) ? requestedTab : 'music archive';
  // Equipment now lives with its services under Business, Services & equipment.
  useEffect(() => { if (requestedTab === 'equipment') window.location.replace('/admin/prices'); }, [requestedTab]);
  if (requestedTab === 'equipment') return null;
  if (!isSessionReady) return null;
  if (!user?.isAdmin) return <section className="echo-section"><p>Admin sign-in required. <a href="/login">Sign in</a></p></section>;
  const View = { 'seasonal theme': SeasonalThemeAdmin, 'ai configuration': AiConfigurationAdmin, 'music archive': MusicArchiveAdmin, 'recordings collections': RecordingsCollectionsAdmin, 'live archive': LiveArchiveAdmin, equipment: Equipment, testimonials: Testimonials, media: Media, meetings: Meetings }[tab];
  return (
    <AdminWorkspace activeKey={tab.replaceAll(' ', '-')} username={user.email || user.username} onLogout={onLogout}>
      {['seasonal theme', 'testimonials', 'music archive', 'recordings collections', 'ai configuration'].includes(tab) ? <View key={tab} token={token} /> : <section className="admin-panel aw-cms-panel">{!['music archive', 'live archive', 'testimonials'].includes(tab) && <h1>{({ equipment: 'Equipment', testimonials: 'Testimonials', media: 'Media library', meetings: 'Meetings' })[tab]}</h1>}<View key={tab} token={token} /></section>}
    </AdminWorkspace>
  );
}
