import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const time = value => value ? new Date(value).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }) : '';

// What the audience writes in the live room, newest last. Comments belong to the running live session, so this refreshes while live.
export default function AdminAudienceComments({ live, token, sessionIdentity }) {
  const [items, setItems] = useState([]), [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(''), [draft, setDraft] = useState(''), [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    let stop = false, timer;
    setItems([]); setError('');
    if (!live || !token || !sessionIdentity) return undefined;
    const refresh = async () => {
      try { const data = await apiRequest(`/live-comments?session=${encodeURIComponent(sessionIdentity)}`,{token}); if (!stop && data.session===sessionIdentity) { setItems(data.items || []); setError(''); } }
      catch { if (!stop) setError('Comments are temporarily unavailable.'); }
      finally { if (!stop) timer = setTimeout(refresh, 6000); }
    };
    refresh();
    return () => { stop = true; clearTimeout(timer); };
  }, [live,token,sessionIdentity]);
  const sendReply = async (item) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await apiRequest(`/live-comments/${item.id}/reply`, { token, method: 'POST', body: { session: sessionIdentity, text: draft.trim() } });
      setItems(current => current.map(row => row.id === item.id ? result.item : row));
      setReplyingTo(''); setDraft('');
    } catch (problem) { setError(problem.message || 'Could not send the reply.'); }
    finally { setBusy(false); }
  };
  // The host can also write to the room directly, not only answer a comment.
  const sendNote = async (event) => {
    event.preventDefault();
    const text = note.trim();
    if (!text || busy || !sessionIdentity) return;
    setBusy(true); setError('');
    try {
      const result = await apiRequest('/live-comments', { token, method: 'POST', body: { session: sessionIdentity, text } });
      setItems(current => [...current.filter(row => row.id !== result.item.id), result.item]);
      setNote('');
    } catch (problem) { setError(problem.message || 'Could not send your comment.'); }
    finally { setBusy(false); }
  };
  const startReply = item => { setReplyingTo(item.id); setDraft(item.reply?.text || ''); };
  return (
    <div className="admin-audience-comments">
      <div className="admin-request-section-head">
        <h3>Audience comments <span>{items.length}</span></h3>
      </div>
      {error ? <p className="admin-request-feedback" role="status">{error}</p> : null}
      <form className="admin-comment-reply-form admin-comment-compose" onSubmit={sendNote}>
        <input aria-label="Comment to the room" placeholder={live ? 'Write a comment to everyone in the room…' : 'Comments open when you are live'} maxLength={280} enterKeyHint="send" value={note} onChange={event => setNote(event.target.value)} disabled={!live || !sessionIdentity} />
        <button type="submit" disabled={busy || !note.trim() || !live || !sessionIdentity}>Send</button>
      </form>
      {[...items].reverse().map(item => (
        <article key={item.id} className="admin-request-card admin-comment-card">
          <header><strong>{item.name || 'Guest'}</strong><span>{time(item.createdAt)}</span></header>
          <p className="admin-comment-text">{item.text}</p>
          {item.reply?.text && replyingTo !== item.id ? <p className="admin-comment-reply"><strong>You</strong>{item.reply.text}</p> : null}
          {replyingTo === item.id ? (
            <form className="admin-comment-reply-form" onSubmit={event => { event.preventDefault(); void sendReply(item); }}>
              <input autoFocus aria-label={`Reply to ${item.name || 'Guest'}`} placeholder="Reply to everyone in the room…" maxLength={280} enterKeyHint="send" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setReplyingTo(''); setDraft(''); } }} />
              <button type="submit" disabled={busy || (!draft.trim() && !item.reply?.text)}>{draft.trim() || !item.reply?.text ? 'Send' : 'Remove'}</button>
              <button type="button" className="is-quiet" onClick={() => { setReplyingTo(''); setDraft(''); }}>Cancel</button>
            </form>
          ) : <button type="button" className="admin-comment-reply-button" onClick={() => startReply(item)}>{item.reply?.text ? 'Edit reply' : 'Reply'}</button>}
        </article>
      ))}
    </div>
  );
}
