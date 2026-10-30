import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { fetchMusicArchiveCatalog } from '../lib/musicArchiveCatalog';
import './djServiceBuilder.css';

const blank = () => ({ id: crypto.randomUUID(), title: 'New DJ event', date: '', venue: '', workIds: [], segments: [{ id: crypto.randomUUID(), title: 'Opening', startsAt: '18:00', endsAt: '19:00', recordingIds: [] }] });

export default function DjServiceBuilder({ token }) {
  const [plans, setPlans] = useState([]), [draft, setDraft] = useState(null), [recordings, setRecordings] = useState([]);
  const [busy, setBusy] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([apiRequest('/admin/dj-service-builder', { token }), fetchMusicArchiveCatalog()])
      .then(([saved, archive]) => { if (!alive) return; setPlans(saved.plans || []); setRecordings((archive.recordings || archive.songs || []).filter(row => row.published !== false && row.audioUrl)); })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [token]);
  const selected = useMemo(() => new Map(recordings.map(row => [row.id, row])), [recordings]);
  const update = patch => setDraft(current => ({ ...current, ...patch }));
  const save = async () => {
    if (!draft?.title.trim()) { setError('Add an event name before saving.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const next = [...plans.filter(plan => plan.id !== draft.id), draft];
      const result = await apiRequest('/admin/dj-service-builder', { token, method: 'PUT', body: { plans: next } });
      setPlans(result.plans); setDraft(result.plans.find(plan => plan.id === draft.id)); setNotice('DJ event catalog saved.');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const remove = async id => {
    const next = plans.filter(plan => plan.id !== id);
    setSaving(true); setError('');
    try { const result = await apiRequest('/admin/dj-service-builder', { token, method: 'PUT', body: { plans: next } }); setPlans(result.plans); if (draft?.id === id) setDraft(null); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const toggleWork = (id, checked) => update({ workIds: checked ? [...new Set([...draft.workIds, id])] : draft.workIds.filter(value => value !== id), segments: draft.segments.map(segment => ({ ...segment, recordingIds: checked ? segment.recordingIds : segment.recordingIds.filter(value => value !== id) })) });
  const setSegment = (id, patch) => update({ segments: draft.segments.map(segment => segment.id === id ? { ...segment, ...patch } : segment) });
  if (busy) return <section className="dj-builder"><p>Loading your DJ event catalogs…</p></section>;
  return <section className="dj-builder">
    <div className="dj-builder-toolbar"><button type="button" className="dj-builder-primary" onClick={() => setDraft(blank())}><Plus size={17}/> New event</button></div>
    {(error || notice) && <p className={error ? 'dj-builder-message is-error' : 'dj-builder-message'} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    <div className="dj-builder-layout"><aside className="dj-builder-events"><h2>Your DJ events <span>{plans.length}</span></h2>{plans.length ? plans.map(plan => <button key={plan.id} type="button" className={`dj-builder-event${draft?.id === plan.id ? ' is-active' : ''}`} onClick={() => { setDraft(structuredClone(plan)); setError(''); setNotice(''); }}><strong>{plan.title}</strong><small>{plan.date || 'Date not set'}{plan.venue ? ` · ${plan.venue}` : ''}</small></button>) : <p className="dj-builder-empty">Create an event catalog to get started.</p>}</aside>
      {draft ? <div className="dj-builder-editor"><div className="dj-builder-event-fields"><label>Event name<input value={draft.title} onChange={e => update({ title: e.target.value })} placeholder="e.g. Summer wedding"/></label><label><CalendarDays size={15}/> Event date<input type="date" value={draft.date} onChange={e => update({ date: e.target.value })}/></label><label>Venue<input value={draft.venue} onChange={e => update({ venue: e.target.value })} placeholder="Venue or location"/></label></div>
        <section className="dj-builder-section"><div className="dj-builder-section-title"><div><h2>My work</h2><p>Select the recordings you offer for this DJ service.</p></div><span>{draft.workIds.length} selected</span></div><div className="dj-builder-recordings">{recordings.map(row => <label key={row.id} className="dj-builder-recording"><input type="checkbox" checked={draft.workIds.includes(row.id)} onChange={e => toggleWork(row.id, e.target.checked)}/><span><strong>{row.title}</strong><small>{row.artist || 'DJ Khalil'}</small></span></label>)}{!recordings.length && <p className="dj-builder-empty">No published recordings are available. Add and publish recordings in <a href="/admin/archive">Recordings</a>.</p>}</div></section>
        <section className="dj-builder-section"><div className="dj-builder-section-title"><div><h2>Event catalog</h2><p>Plan what plays during each part of the event.</p></div><button type="button" className="dj-builder-secondary" onClick={() => update({ segments: [...draft.segments, { id: crypto.randomUUID(), title: `Segment ${draft.segments.length + 1}`, startsAt: '', endsAt: '', recordingIds: [] }] })}><Plus size={15}/> Add time segment</button></div>
          <div className="dj-builder-segments">{draft.segments.map((segment, index) => <article className="dj-builder-segment" key={segment.id}><div className="dj-builder-segment-head"><strong>{String(index + 1).padStart(2, '0')}</strong><input aria-label="Segment name" value={segment.title} onChange={e => setSegment(segment.id, { title: e.target.value })}/><button type="button" aria-label={`Remove ${segment.title}`} onClick={() => update({ segments: draft.segments.filter(row => row.id !== segment.id) })}><Trash2 size={16}/></button></div><div className="dj-builder-time-fields"><label>Start time<input type="time" value={segment.startsAt} onChange={e => setSegment(segment.id, { startsAt: e.target.value })}/></label><label>End time<input type="time" value={segment.endsAt} onChange={e => setSegment(segment.id, { endsAt: e.target.value })}/></label></div><div className="dj-builder-segment-tracks">{draft.workIds.length ? draft.workIds.map(id => { const row = selected.get(id); if (!row) return null; return <label key={id}><input type="checkbox" checked={segment.recordingIds.includes(id)} onChange={e => setSegment(segment.id, { recordingIds: e.target.checked ? [...segment.recordingIds, id] : segment.recordingIds.filter(value => value !== id) })}/>{row.title}</label>; }) : <small>Select recordings under My work to add them to the segments.</small>}</div></article>)}</div>
        </section><footer className="dj-builder-actions"><button type="button" className="dj-builder-primary" disabled={saving} onClick={save}><Save size={16}/>{saving ? 'Saving…' : 'Save event catalog'}</button>{plans.some(plan => plan.id === draft.id) && <button type="button" className="dj-builder-delete" disabled={saving} onClick={() => remove(draft.id)}>Delete event</button>}</footer>
      </div> : <div className="dj-builder-start"><div><CalendarDays size={27}/><h2>Build an event catalog</h2><p>Set up your DJ work and organize the music into the event’s timeline.</p><button type="button" className="dj-builder-primary" onClick={() => setDraft(blank())}><Plus size={16}/> Create first event</button></div></div>}
    </div>
  </section>;
}
