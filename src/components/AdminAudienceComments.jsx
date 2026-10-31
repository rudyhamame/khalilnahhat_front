import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const time = value => value ? new Date(value).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }) : '';

// What the audience writes in the live room, newest last. Comments belong to the running live session, so this refreshes while live.
export default function AdminAudienceComments({ live }) {
  const [items, setItems] = useState([]), [error, setError] = useState('');
  useEffect(() => {
    let stop = false, timer;
    setItems([]); setError('');
    if (!live) return undefined;
    const refresh = async () => {
      try { const data = await apiRequest('/live-comments'); if (!stop) { setItems(data.items || []); setError(''); } }
      catch { if (!stop) setError('Comments are temporarily unavailable.'); }
      finally { if (!stop) timer = setTimeout(refresh, 6000); }
    };
    refresh();
    return () => { stop = true; clearTimeout(timer); };
  }, [live]);
  return (
    <div className="admin-audience-comments">
      <div className="admin-request-section-head">
        <h3>Audience comments <span>{items.length}</span></h3>
      </div>
      {error ? <p className="admin-request-feedback" role="status">{error}</p> : null}
      {[...items].reverse().map(item => (
        <article key={item.id} className="admin-request-card admin-comment-card">
          <header><strong>{item.name || 'Guest'}</strong><span>{time(item.createdAt)}</span></header>
          <p className="admin-comment-text">{item.text}</p>
        </article>
      ))}
    </div>
  );
}
