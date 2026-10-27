import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eye, EyeOff, MessageSquare, Plus, RefreshCw, Search, Send, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './testimonials.css';

function ReviewCard({ review, token, onSaved }) {
  const [reply, setReply] = useState(review.reply || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = reply.trim() !== (review.reply || '');
  async function save(body) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest(`/content/testimonials/${encodeURIComponent(review.id)}`, { method: 'PATCH', token, body });
      if (!result.item?.id) throw new Error('The update could not be confirmed. Please try again.');
      onSaved(result.item); setEditing(false); setNotice('Changes saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <article className="tr-card">
    <header><div className="tr-person"><span className="tr-avatar" aria-hidden="true">{review.name.trim().slice(0, 1).toUpperCase()}</span><div><h2>{review.name}</h2><span>{review.eventType || 'Client review'}</span></div></div><span className={`tr-badge ${review.isPublished ? 'tr-published' : ''}`}>{review.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}{review.isPublished ? 'Published' : 'Hidden'}</span></header>
    <blockquote dir="auto">{review.text}</blockquote>
    {review.textAr && <p className="tr-translation" dir="rtl" lang="ar">{review.textAr}</p>}
    {review.reply && !editing && <div className="tr-response"><div><MessageSquare size={14} /><strong>Echo’s response</strong>{review.repliedAt && <time dateTime={review.repliedAt}>{new Date(review.repliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>}</div><p dir="auto">{review.reply}</p></div>}
    {editing && <form className="tr-composer" onSubmit={(e) => { e.preventDefault(); save({ reply: reply.trim() }); }}>
      <label htmlFor={`reply-${review.id}`}>{review.reply ? 'Edit your response' : 'Write a personal response'}</label>
      <textarea id={`reply-${review.id}`} dir="auto" rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank your client or follow up on their experience…" disabled={busy} required />
      <div className="tr-compose-footer"><small>{reply.length}/2000 · {review.isPublished ? 'Visible on the Reviews page once saved' : 'Visible when this review is published'}</small><button className="tr-button tr-primary" disabled={busy || !dirty || !reply.trim()}><Send size={14} />{busy ? 'Saving…' : review.reply ? 'Save response' : 'Publish response'}</button></div>
      {editing && <button className="tr-text-button" type="button" disabled={busy} onClick={() => { setReply(review.reply || ''); setEditing(false); }}>Cancel edit</button>}
    </form>}
    <footer><span className="tr-status">{review.reply ? <><Check size={14} /> Replied</> : <><MessageSquare size={14} /> Awaiting your reply</>}</span><div>{!editing && <button type="button" className="tr-text-button" disabled={busy} onClick={() => setEditing(true)}>{review.reply ? 'Edit response' : 'Reply to review'}</button>}<button type="button" className="tr-text-button" disabled={busy || dirty} title={dirty ? 'Save or cancel your reply first' : undefined} onClick={() => save({ isPublished: !review.isPublished })}>{review.isPublished ? 'Hide review' : 'Publish review'}</button></div></footer>
    {error && <p role="alert" className="echo-error">{error}</p>}<span className="tr-notice" role="status">{notice}</span>
  </article>;
}

export default function TestimonialsAdmin({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await apiRequest('/content/testimonials/admin', { token });
      if (!Array.isArray(result.items)) throw new Error('Reviews could not be loaded.');
      if (current === generation.current) setItems(result.items);
    } catch (e) { if (current === generation.current) setError(e.message); }
    finally { if (current === generation.current) setLoading(false); }
  }, [token]);
  useEffect(() => { load(); return () => { generation.current++; }; }, [load]);
  async function add(e) {
    e.preventDefault(); if (saving) return;
    const form = e.currentTarget;
    setSaving(true); setAddError('');
    try {
      const body = Object.fromEntries(new FormData(form));
      const result = await apiRequest('/content/testimonials', { method: 'POST', token, body: { ...body, isPublished: false } });
      if (!result.item?.id) throw new Error('The review could not be confirmed.');
      setItems((old) => [result.item, ...old]); setAdding(false);
    } catch (err) { setAddError(err.message); } finally { setSaving(false); }
  }
  const pending = items.filter((r) => !r.reply).length;
  const shown = items.filter((r) => (filter === 'all' || (filter === 'pending' ? !r.reply : filter === 'replied' ? Boolean(r.reply) : !r.isPublished)) && [r.name, r.eventType, r.text, r.textAr, r.reply].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="tr-workspace">
    <header className="tr-heading"><div><span className="tr-eyebrow">CLIENT RELATIONSHIPS</span><h1>Testimonials</h1><p>Every experience deserves to be heard. Make every reply personal.</p></div><button className="tr-button" type="button" onClick={() => { setAdding(!adding); setAddError(''); }}>{adding ? <X size={15} /> : <Plus size={15} />}{adding ? 'Close form' : 'Add a review'}</button></header>
    <div className="tr-metrics"><div><span>Total reviews</span><strong>{loading && !items.length ? '—' : items.length}</strong><small>Your clients’ experiences</small></div><div><span>Awaiting reply</span><strong>{loading && !items.length ? '—' : pending}</strong><small>A little appreciation goes a long way</small></div><div><span>Published</span><strong>{loading && !items.length ? '—' : items.filter((r) => r.isPublished).length}</strong><small>Visible on your website</small></div></div>

    <div className="tr-toolbar"><div className="tr-filters" role="group" aria-label="Filter reviews">{[['all', 'All reviews'], ['pending', 'Needs reply'], ['replied', 'Replied'], ['hidden', 'Hidden']].map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}{key === 'pending' && <span>{pending}</span>}</button>)}</div><label className="tr-search"><Search size={15} /><input aria-label="Search reviews" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients or reviews" /></label></div>
    <div className="tr-scroll">
    {adding && <form className="tr-add" onSubmit={add}><h2>Add a client review</h2><p>Use a real review shared by your client. New entries stay hidden until you publish them.</p><div className="tr-add-fields"><label>Client name<input name="name" maxLength={120} required /></label><label>Event type<input name="eventType" maxLength={80} placeholder="e.g. Wedding" /></label></div><label>Review<textarea name="text" dir="auto" rows={4} maxLength={2000} required /></label><label>Arabic version <small>(optional)</small><textarea name="textAr" dir="rtl" rows={3} maxLength={2000} /></label>{addError && <p className="echo-error" role="alert">{addError}</p>}<button className="tr-button tr-primary" disabled={saving}>{saving ? 'Saving…' : 'Save hidden review'}</button></form>}
    {error && <div className="tr-error" role="alert">{error}<button type="button" className="tr-text-button" onClick={load}><RefreshCw size={14} /> Try again</button></div>}
    {loading && <p role="status" className="tr-empty">Loading client reviews…</p>}
    {!loading && !error && !shown.length && <div className="tr-empty"><MessageSquare size={28} /><h2>{items.length ? 'No matching reviews' : 'Your next great review starts here'}</h2><p>{items.length ? 'Try another search or filter.' : 'Client testimonials will appear here. Add a review shared by a client to get started.'}</p></div>}
    <div className="tr-list">{shown.map((review) => <ReviewCard key={review.id} review={review} token={token} onSaved={(item) => setItems((old) => old.map((r) => r.id === item.id ? item : r))} />)}</div>
    </div>
  </div>;
}
