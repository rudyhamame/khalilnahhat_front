import AdminsList from '../components/AdminsList';
import ServiceOperationsGuide from './ServiceOperationsGuide';
import './meetingSlotForm.css';
import BookingAtomTree from './BookingAtomTree';
import SeasonalThemeAdmin from './SeasonalThemeAdmin';
import Testimonials from './TestimonialsAdmin';
import EquipmentQuantityField from '../components/EquipmentQuantityField';
import AiConfigurationAdmin from './AiConfigurationAdmin';
import AdminAvailability from './AdminAvailability';
import AdminVouchers from './AdminVouchers';
import MeetingRoom from './MeetingRoom';
import AiBillingAdmin from './AiBillingAdmin';
import ConceptMapAdmin from './ConceptMapAdmin';
import AiAdministrator from './AiAdministrator';
import AdminSelect from '../components/AdminSelect';
import AdminWorkspace from '../components/AdminWorkspace';
import { useCallback, useEffect, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import MusicArchiveAdmin from './MusicArchiveAdmin';
import DjWorkTypesAdmin from './DjWorkTypesAdmin';
import WorkElementsAdmin from './WorkElementsAdmin';
import LiveArchiveAdmin from './LiveArchiveAdmin';
import GalleryAdmin from './GalleryAdmin';
import NotificationEmailsAdmin from './NotificationEmailsAdmin';
import AdminEmail from './AdminEmail';
import './live.css';

const TABS = ['admins', 'email', 'service overview operations guide', 'data atom tree', 'notifications', 'vouchers', 'availability', 'seasonal theme', 'ai administrator', 'ai configuration', 'ai billing', 'concept map', 'music archive', 'live archive', 'gallery', 'equipment', 'testimonials', 'meetings', 'work elements', 'dj work type'];

function useAdminList(path, token) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(() => apiRequest(path, { token }).then((r) => setItems(r.items)).catch((e) => setError(e.message)), [path, token]);
  useEffect(() => { load(); }, [load]);
  return { items, error, load, setError };
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
  const { items, error, load, setError } = useAdminList('/equipment/admin', token);
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
            <button type="button" className="echo-link" onClick={() => apiRequest(`/equipment/${i.id}`, { method: 'DELETE', token }).then(load).catch(error=>{if(!error.cancelled)setError(error.message);})}>Delete</button>
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


function Meetings({ token }) {
  const { items, error, load, setError } = useAdminList('/meetings/admin', token);
  const [msg, setMsg] = useState('');
  const [roomId, setRoomId] = useState('');
  // Open time slots: pick a date and a time, press Add time (repeat for as many as you like), choose the length and the way, then ADD SLOTS.
  const [picked, setPicked] = useState([]), [date, setDate] = useState(''), [time, setTime] = useState('14:00'), [durationMin, setDurationMin] = useState(30), [mode, setMode] = useState('online'), [link, setLink] = useState(''), [location, setLocation] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const stamp = (value) => new Date(value).toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const addTime = () => {
    if (!date || !time) { setMsg('Choose a date and a time first.'); return; }
    const value = `${date}T${time}`;
    if (new Date(value) <= new Date()) { setMsg('Choose a time in the future.'); return; }
    setMsg(''); setPicked((list) => (list.includes(value) ? list : [...list, value].sort()));
  };
  const shiftDate = (days) => { const base = date ? new Date(`${date}T12:00`) : new Date(); base.setDate(base.getDate() + days); setDate(base.toLocaleDateString('en-CA')); };
  const add = async (e) => {
    e.preventDefault();
    if (!picked.length) { setMsg('Add at least one date and time.'); return; }
    try {
      await apiRequest('/meetings/slots', { method: 'POST', token, body: { starts: picked.map((value) => new Date(value).toISOString()), durationMin, mode, link, location } });
      setPicked([]); setMsg(''); load();
    } catch (err) { setMsg(err.message); }
  };
  const fmt = (d) => new Date(d).toLocaleString('en-CA');
  return (
    <>
      {roomId && <MeetingRoom meetingId={roomId} token={token} onClose={() => setRoomId('')} />}
      {(error || msg) && <p role="alert" className="echo-error">{error || msg}</p>}
      {items.map((m) => (
        <div className="echo-admin-row" key={m.id}>
          <strong>{fmt(m.start)}</strong>
          <span>{m.status === 'booked' ? `${m.bookedByName} (${m.bookedByEmail}) — ${m.topic || 'no topic'}` : 'open'}</span>
          {m.status === 'booked' && m.mode === 'online' && <button type="button" className="echo-btn" onClick={() => setRoomId(m.id)}>Open room</button>}
          {m.status === 'booked'
            ? <button type="button" className="echo-link" onClick={() => window.confirm('Cancel this meeting?') && apiRequest(`/meetings/${m.id}/cancel`, { method: 'POST', token }).then(load)}>Cancel</button>
            : <button type="button" className="echo-link" onClick={() => apiRequest(`/meetings/slots/${m.id}`, { method: 'DELETE', token }).then(load).catch(error=>{if(!error.cancelled)setError(error.message);})}>Remove</button>}
        </div>
      ))}
      <form className="meeting-slot-form" onSubmit={add}>
        <h3>Add open times <small>Toronto time</small></h3>
        <div className="msf-pick">
          <label>Date<input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Time<input type="time" value={time} step="900" onChange={(e) => setTime(e.target.value)} /></label>
          <button type="button" className="msf-add" onClick={addTime}>+ Add time</button>
        </div>
        <div className="msf-quick" role="group" aria-label="Quick dates">
          <button type="button" onClick={() => setDate(today)}>Today</button>
          <button type="button" onClick={() => shiftDate(1)}>+1 day</button>
          <button type="button" onClick={() => shiftDate(7)}>+1 week</button>
          {['09:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)}>{new Date(`2000-01-01T${t}`).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}</button>)}
        </div>
        <div className="msf-chips" aria-live="polite">{picked.length ? picked.map((value) => <span key={value}>{stamp(value)}<button type="button" aria-label={`Remove ${stamp(value)}`} onClick={() => setPicked((list) => list.filter((item) => item !== value))}>×</button></span>) : <em>No times added yet. Pick a date and a time, then press “Add time”.</em>}</div>
        <div className="msf-group"><span>Length</span><div role="group" aria-label="Length">{[15, 30, 45, 60, 90].map((n) => <button key={n} type="button" aria-pressed={durationMin === n} onClick={() => setDurationMin(n)}>{n} min</button>)}</div></div>
        <div className="msf-group"><span>How we meet</span><div role="group" aria-label="How we meet">{[['online', 'Online'], ['phone', 'Phone call'], ['whatsapp-voice', 'WhatsApp voice'], ['whatsapp-video', 'WhatsApp video'], ['in-person', 'In person']].map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div></div>
        {mode === 'online' && <label className="msf-extra">Meeting link (optional)<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></label>}
        {mode === 'in-person' && <label className="msf-extra">Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where we meet" /></label>}
        <button className="echo-btn msf-submit" disabled={!picked.length}>ADD {picked.length || ''} {picked.length === 1 ? 'SLOT' : 'SLOTS'}</button>
      </form>
    </>
  );
}

export default function EchoAdmin({ user, token, isSessionReady, onLogout, search = '' }) {
  const requestedTab = new URLSearchParams(search).get('tab')?.replaceAll('-', ' ');
  const tab = requestedTab === 'emails' ? 'notifications' : TABS.includes(requestedTab) ? requestedTab : 'music archive';
  // Equipment now lives with its services under Business, Events, Services & Equipment.
  useEffect(() => { if (requestedTab === 'equipment') { window.history.replaceState({}, '', '/admin/prices'); window.dispatchEvent(new PopStateEvent('popstate')); } }, [requestedTab]);
  if (requestedTab === 'equipment') return null;
  if (!isSessionReady) return null;
  if (!user?.isAdmin) return <section className="echo-section"><p>Admin sign-in required. <a href="/login">Sign in</a></p></section>;
  const View = { admins:AdminsList, email: AdminEmail, 'service overview operations guide': ServiceOperationsGuide, 'data atom tree': BookingAtomTree, notifications: NotificationEmailsAdmin, vouchers: AdminVouchers, availability: AdminAvailability, 'seasonal theme': SeasonalThemeAdmin, 'ai configuration': AiConfigurationAdmin, 'ai billing': AiBillingAdmin, 'concept map': ConceptMapAdmin, 'ai administrator': AiAdministrator, 'music archive': MusicArchiveAdmin, 'live archive': LiveArchiveAdmin, gallery: GalleryAdmin, equipment: Equipment, testimonials: Testimonials, meetings: Meetings, 'work elements': WorkElementsAdmin, 'dj work type': DjWorkTypesAdmin }[tab];
  return (
    <AdminWorkspace token={token} activeKey={tab.replaceAll(' ', '-')} username={user.email || user.username} onLogout={onLogout}>
      {['email'].includes(tab) ? <View key={tab} user={user} token={token} fullPage /> : ['admins', 'email', 'service overview operations guide', 'data atom tree', 'notifications', 'project chat', 'vouchers', 'availability', 'seasonal theme', 'testimonials', 'music archive', 'ai administrator', 'ai configuration', 'ai billing', 'concept map', 'gallery', 'work elements', 'dj work type'].includes(tab) ? <View key={tab} token={token} search={search} /> : <section className="admin-panel aw-cms-panel">{!['music archive', 'live archive', 'testimonials'].includes(tab) && <h1>{({ equipment: 'Equipment', testimonials: 'Testimonials', meetings: 'Meetings' })[tab]}</h1>}<View key={tab} token={token} search={search} /></section>}
    </AdminWorkspace>
  );
}
