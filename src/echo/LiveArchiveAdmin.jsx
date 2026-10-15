import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export default function LiveArchiveAdmin({ token }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try { const result = await apiRequest('/admin/live-recordings', { token }); setItems(result.items || []); }
    catch (error) { setNotice(error.message); }
  }, [token]);
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]);
  const action = async (item, name) => {
    if (name === 'publish' && !window.confirm('Publish this recording as a public video and add its audio to the music archive?')) return;
    setBusy(item.id); setNotice('');
    try {
      const result = await apiRequest(`/admin/live-recordings/${item.id}/${name}`, { token, method: name === 'download' ? 'GET' : 'POST', ...(name === 'download' ? {} : { body: {} }) });
      if (name === 'download') { const link = document.createElement('a'); link.href = result.url; link.rel = 'noopener'; link.click(); }
      else { await load(); setNotice(name === 'publish' ? 'Published. Select its audio in Player playlist to add it to the footer.' : 'Retry queued.'); }
    } catch (error) { setNotice(error.message); }
    finally { setBusy(''); }
  };
  return <section className="echo-playlist-admin"><h2>Live Archive</h2>
    <p>Completed broadcasts are saved privately to Cloudinary. Processing can take a few minutes after the live ends. Publish only the recordings you want to share.</p>
    {notice && <p role="status" className="echo-playlist-notice">{notice}</p>}
    {!items.length && <p>No recordings yet. Your next broadcast will appear here automatically.</p>}
    {items.map((item) => <article className="echo-admin-row" key={item.id}>
      <strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>
      <span>{item.status.replaceAll('_', ' ')}{item.published ? ' · Published' : ' · Private'}{item.bytes ? ` · ${(item.bytes / 1048576).toFixed(1)} MB` : ''}</span>
      {item.error && <p role="alert">{item.error}</p>}
      {item.status === 'ready' && <><button type="button" className="echo-btn" disabled={busy === item.id} onClick={() => action(item, 'download')}>DOWNLOAD RECORDING</button>{!item.published && <button type="button" className="echo-link" disabled={busy === item.id} onClick={() => action(item, 'publish')}>Publish to website archive</button>}</>}
      {['failed', 'upload_failed'].includes(item.status) && <button type="button" className="echo-btn" disabled={busy === item.id} onClick={() => action(item, 'retry')}>RETRY TRANSFER</button>}
    </article>)}
  </section>;
}
