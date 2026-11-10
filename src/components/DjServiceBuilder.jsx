import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Disc3, Pause, Play, Plus, Save, Search, Trash2, Music2, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { fetchMusicArchiveCatalog } from '../lib/musicArchiveCatalog';
import './djServiceBuilder.css';
import {uuid} from '../lib/uuid.js';

const makeSegment = (index = 0) => ({ id: uuid(), title: ['Guest arrival', 'Dinner', 'Dancing'][index] || `Set ${index + 1}`, startsAt: '', endsAt: '', recordingIds: [], notes: '' });
const freshSet = () => ({ segments: [makeSegment(0)], notes: '' });
const eventOf = booking => booking?.order?.event || booking?.event || {};
const dateOf = booking => eventOf(booking).eventDate || eventOf(booking).date || '';
const venueOf = booking => { const venue = eventOf(booking).venue; return eventOf(booking).venueName || (typeof venue === 'string' ? venue : venue?.name || venue?.address) || eventOf(booking).city || venue?.city || ''; };
const timeOf = booking => [eventOf(booking).startTime, eventOf(booking).endTime].filter(Boolean).join('–');
const eventTypeOf = booking => eventOf(booking).type || eventOf(booking).eventType || '';
const durationOf = row => Number(row.durationSeconds || row.audio?.durationSeconds || 0);
const formatDuration = value => value ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}` : 'Duration not set';
const initialSet = booking => {
  const saved = booking?.planning?.djSet;
  return saved?.segments?.length ? structuredClone(saved) : freshSet();
};

export default function DjServiceBuilder({ token }) {
  const [bookings, setBookings] = useState([]), [recordings, setRecordings] = useState([]);
  const [bookingId, setBookingId] = useState(''), [draft, setDraft] = useState(null);
  const [query, setQuery] = useState(''), [workType, setWorkType] = useState('ALL');
  const [busy, setBusy] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [playingId, setPlayingId] = useState('');
  const audio = useRef(null);
  const booking = bookings.find(row => row.id === bookingId) || null;
  const segments = draft?.segments || [];

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [requestData, archive] = await Promise.all([
        apiRequest('/service-requests/admin', { token }), fetchMusicArchiveCatalog(),
      ]);
      const confirmed = (requestData.items || []).filter(row => row.status === 'confirmed');
      setBookings(confirmed);
      setRecordings((archive.recordings || archive.songs || []).filter(row => row.published !== false && row.audioUrl && row.archivalStatus !== 'ARCHIVED' && row.publicationStatus !== 'WITHDRAWN'));
      setBookingId(current => confirmed.some(row => row.id === current) ? current : confirmed[0]?.id || '');
    } catch (e) { setError(e.message || 'Could not load confirmed bookings and recordings.'); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { load(); const player = audio; return () => player.current?.pause(); }, [load]);
  useEffect(() => {
    const selected = bookings.find(row => row.id === bookingId);
    if (!selected) { setDraft(null); return; }
    setDraft(initialSet(selected)); setNotice(''); setError('');
  }, [bookingId, bookings]);

  const availableTypes = useMemo(() => [...new Set(recordings.map(row => row.recordingType || row.workType).filter(Boolean))].sort(), [recordings]);
  const visibleRecordings = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return recordings.filter(row => (workType === 'ALL' || (row.recordingType || row.workType) === workType) && (!needle || `${row.title} ${row.artist || ''} ${row.recordingType || row.workType || ''} ${row.work?.title || ''}`.toLocaleLowerCase().includes(needle)));
  }, [recordings, query, workType]);
  const recordingById = useMemo(() => new Map(recordings.map(row => [row.id, row])), [recordings]);
  const updateSet = patch => setDraft(current => ({ ...current, ...patch }));
  const updateSegment = (id, patch) => updateSet({ segments: segments.map(segment => segment.id === id ? { ...segment, ...patch } : segment) });
  const addToSegment = (segmentId, recordingId) => {
    const segment = segments.find(row => row.id === segmentId);
    if (segment && !segment.recordingIds.includes(recordingId)) updateSegment(segmentId, { recordingIds: [...segment.recordingIds, recordingId] });
  };
  const moveTrack = (segment, index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= segment.recordingIds.length) return;
    const recordingIds = [...segment.recordingIds];
    [recordingIds[index], recordingIds[target]] = [recordingIds[target], recordingIds[index]];
    updateSegment(segment.id, { recordingIds });
  };
  const togglePreview = row => {
    const node = audio.current;
    if (!node || !row.audioUrl) return;
    if (playingId === row.id) { node.pause(); node.removeAttribute('src'); setPlayingId(''); return; }
    node.pause(); node.src = row.audioUrl;
    node.play().then(() => setPlayingId(row.id)).catch(() => { setPlayingId(''); setError('This recording could not be previewed. Check its audio file and try again.'); });
  };
  const save = async () => {
    if (!booking || !draft) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await apiRequest(`/admin/dj-service-builder/${encodeURIComponent(booking.id)}`, { token, method: 'PUT', body: { djSet: draft } });
      setBookings(current => current.map(row => row.id === booking.id ? { ...row, planning: result.item?.planning || { ...row.planning, djSet: result.djSet || draft } } : row));
      setNotice('Set plan saved to this confirmed booking.');
    } catch (e) { setError(e.message || 'The set plan could not be saved. Your edits are still here.'); }
    finally { setSaving(false); }
  };

  if (busy) return <section className="dj-builder"><div className="dj-builder-loading"><span className="dj-builder-pulse"/><p>Loading confirmed bookings and recordings…</p></div></section>;

  return <section className="dj-builder" aria-labelledby="dj-builder-title">
    <header className="dj-builder-heading"><div><p className="dj-builder-eyebrow">ECHO / EVENT PREPARATION</p><h1 id="dj-builder-title">DJ Service Builder</h1><p>Choose a confirmed booking, then shape its music into a set plan for the event.</p></div><button type="button" className="dj-builder-refresh" onClick={load} disabled={saving}><span>Refresh bookings</span></button></header>
    {(error || notice) && <p className={`dj-builder-message${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    {!bookings.length ? <div className="dj-builder-empty-state"><CalendarDays size={28}/><h2>No confirmed bookings to plan yet</h2><p>When a booking is confirmed, it will appear here. You can review client requests in <a href="/admin/services">Booking requests</a>.</p></div> : <>
      <div className="dj-builder-booking-select"><label htmlFor="dj-builder-booking">Booking to plan</label><div className="dj-builder-select-wrap"><select id="dj-builder-booking" value={bookingId} onChange={e => setBookingId(e.target.value)}>{bookings.map(row => <option key={row.id} value={row.id}>{row.requestNumber || row.id} · {row.customerName} · {dateOf(row) || 'Date not set'}</option>)}</select><ChevronDown size={17}/></div></div>
      {booking && draft && <div className="dj-builder-layout">
        <aside className="dj-builder-event-panel"><div className="dj-builder-booking-status"><span className="dj-builder-status-dot"/> CONFIRMED BOOKING</div><h2>{booking.customerName || 'Client event'}</h2><p className="dj-builder-reference">{booking.requestNumber || booking.id}</p><div className="dj-builder-event-facts"><div><CalendarDays size={16}/><span><small>Event date</small><strong>{dateOf(booking) || 'Not provided'}</strong></span></div>{timeOf(booking)&&<div><Clock3 size={16}/><span><small>Event time</small><strong>{timeOf(booking)}</strong></span></div>}<div><Music2 size={16}/><span><small>Event type</small><strong>{eventTypeOf(booking) || 'Not specified'}</strong></span></div>{(eventOf(booking).guestCount||eventOf(booking).guests)&&<div><Users size={16}/><span><small>Guest count</small><strong>{eventOf(booking).guestCount||eventOf(booking).guests}</strong></span></div>}<div><Disc3 size={16}/><span><small>Venue</small><strong>{venueOf(booking) || 'Not provided'}</strong></span></div></div><div className="dj-builder-client-request"><h3>Booked services</h3>{booking.items?.length ? <ul>{booking.items.map(item => <li key={item.serviceId}>{item.name} <span>× {item.quantity}</span></li>)}</ul> : <p>No service details are attached to this booking.</p>}<a href="/admin/services">Open Booking requests ↗</a></div><label className="dj-builder-notes">Event music notes<textarea rows={5} value={draft.notes || ''} onChange={e => updateSet({ notes: e.target.value })} placeholder="Client preferences, cues, transitions, or reminders for the event…"/></label></aside>
        <main className="dj-builder-workspace">
          <div className="dj-builder-workspace-head"><div><span className="dj-builder-section-kicker">01 / THE RUN OF SHOW</span><h2>Build the event timeline</h2><p>Add moments in order and choose the recordings for each part of the event.</p></div><button type="button" className="dj-builder-add-segment" onClick={() => updateSet({ segments: [...segments, makeSegment(segments.length)] })}><Plus size={16}/> Add event moment</button></div>
          <div className="dj-builder-segments">{segments.map((segment, index) => <article className="dj-builder-segment" key={segment.id}><div className="dj-builder-segment-top"><span className="dj-builder-step">{String(index + 1).padStart(2, '0')}</span><input aria-label={`Event moment ${index + 1} name`} value={segment.title} onChange={e => updateSegment(segment.id, { title: e.target.value })} placeholder="Name this moment"/><label><Clock3 size={14}/><input aria-label={`${segment.title} start time`} type="time" value={segment.startsAt} onChange={e => updateSegment(segment.id, { startsAt: e.target.value })}/></label><span className="dj-builder-time-divider">to</span><label><input aria-label={`${segment.title} end time`} type="time" value={segment.endsAt} onChange={e => updateSegment(segment.id, { endsAt: e.target.value })}/></label><button type="button" className="dj-builder-remove-moment" aria-label={`Remove ${segment.title}`} onClick={() => updateSet({ segments: segments.filter(row => row.id !== segment.id) })}><Trash2 size={15}/></button></div>
            <div className="dj-builder-queue">{segment.recordingIds.map((id, trackIndex) => { const row = recordingById.get(id); if (!row) return null; return <div className="dj-builder-queue-track" key={`${id}-${trackIndex}`}><button type="button" className="dj-builder-play" aria-label={`${playingId === id ? 'Pause' : 'Preview'} ${row.title}`} onClick={() => togglePreview(row)}>{playingId === id ? <Pause size={14}/> : <Play size={14}/>}</button><span className="dj-builder-track-index">{String(trackIndex + 1).padStart(2, '0')}</span><span className="dj-builder-track-title"><strong>{row.title}</strong><small>{row.recordingType || row.workType || 'Recording'} · {formatDuration(durationOf(row))}</small></span><button type="button" aria-label={`Move ${row.title} up`} disabled={trackIndex === 0} onClick={() => moveTrack(segment, trackIndex, -1)}><ChevronUp size={15}/></button><button type="button" aria-label={`Move ${row.title} down`} disabled={trackIndex === segment.recordingIds.length - 1} onClick={() => moveTrack(segment, trackIndex, 1)}><ChevronDown size={15}/></button><button type="button" aria-label={`Remove ${row.title} from ${segment.title}`} onClick={() => updateSegment(segment.id, { recordingIds: segment.recordingIds.filter(value => value !== id) })}><Trash2 size={14}/></button></div>; })}{!segment.recordingIds.length && <p className="dj-builder-queue-empty">No recordings in this moment yet. Add them from your work library.</p>}</div><label className="dj-builder-moment-note">Moment notes<input value={segment.notes || ''} onChange={e => updateSegment(segment.id, { notes: e.target.value })} placeholder="Cue, announcement, transition…"/></label>
          </article>)}</div>
          <section className="dj-builder-library"><div className="dj-builder-library-head"><div><span className="dj-builder-section-kicker">02 / RECORDING MUSIC</span><h2>Your playable recordings</h2><p>Preview tracks and add them to a moment in the run of show.</p></div><span className="dj-builder-recording-count">{visibleRecordings.length} tracks</span></div><div className="dj-builder-library-filters"><label className="dj-builder-search"><Search size={16}/><input aria-label="Search recordings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a recording or artist"/></label><label className="dj-builder-type-filter"><span className="sr-only">Filter by work type</span><select value={workType} onChange={e => setWorkType(e.target.value)}><option value="ALL">All work types</option>{availableTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label></div><div className="dj-builder-library-list">{visibleRecordings.map(row => <article className="dj-builder-library-row" key={row.id}><button type="button" className="dj-builder-play" aria-label={`${playingId === row.id ? 'Pause' : 'Preview'} ${row.title}`} onClick={() => togglePreview(row)}>{playingId === row.id ? <Pause size={14}/> : <Play size={14}/>}</button><div className="dj-builder-art"><Music2 size={18}/></div><div className="dj-builder-recording-info"><strong>{row.title}</strong><small>{row.recordingType || row.workType || 'Recording'} · {formatDuration(durationOf(row))}</small></div><div className="dj-builder-add-controls">{segments.length ? <select aria-label={`Choose event moment for ${row.title}`} defaultValue={segments[0].id} key={`${row.id}-${segments.map(s => s.id).join(',')}`}>{segments.map(segment => <option key={segment.id} value={segment.id}>{segment.title}</option>)}</select> : <span>Add a moment first</span>}<button type="button" disabled={!segments.length || segments.every(segment => segment.recordingIds.includes(row.id))} onClick={event => { const select = event.currentTarget.parentElement.querySelector('select'); addToSegment(select.value, row.id); }}><Plus size={14}/> Add</button></div></article>)}{!visibleRecordings.length && <p className="dj-builder-empty">{recordings.length ? 'No recordings match your search.' : <>No playable recordings are available. Add and publish recordings in <a href="/admin/archive">Recordings</a>.</>}</p>}</div></section>
          <footer className="dj-builder-savebar"><span>{segments.length} moments · {segments.reduce((count, segment) => count + segment.recordingIds.length, 0)} placements</span><button type="button" className="dj-builder-save" disabled={saving} onClick={save}><Save size={16}/>{saving ? 'Saving plan…' : 'Save event plan'}</button></footer>
        </main>
      </div>}
      <audio ref={audio} preload="none" onEnded={() => setPlayingId('')} onPause={() => setPlayingId('')}/>
    </>}
  </section>;
}
