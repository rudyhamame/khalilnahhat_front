import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Music2 } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';

export default function FooterPlaylistAdmin({ token }) {
  const [archive, setArchive] = useState([]);
  const [ids, setIds] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [library, playlist] = await Promise.all([apiRequest('/admin/archive', { token }), apiRequest('/admin/player-playlist', { token })]);
      setArchive(library.items || []); setIds(playlist.item.archiveIds || []); setEnabled(playlist.item.enabled);
    } catch (error) { setNotice(error.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setBusy(true); setNotice('');
    try { await apiRequest('/admin/player-playlist', { method: 'PUT', token, body: { enabled, archiveIds: ids } }); setNotice('Playlist saved. The website player refreshes within 30 seconds.'); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  const move = (index, direction) => setIds((current) => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  const upload = async (event) => {
    event.preventDefault(); setBusy(true); setNotice('Uploading audio to Cloudinary…');
    const form = event.currentTarget;
    try {
      const file = form.elements.audio.files[0];
      if (!file) throw new Error('Choose an audio recording.');
      const data = new FormData(); data.append('file', file);
      const response = await fetch(`${apiBaseUrl}/content/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Upload failed.');
      await apiRequest('/archive-items', { method: 'POST', token, body: { title: form.elements.title.value, artist: form.elements.artist.value, category: form.elements.category.value || 'mix', audioUrl: result.url, duration: result.durationSec ? `${Math.floor(result.durationSec / 60)}:${String(result.durationSec % 60).padStart(2, '0')}` : '', mediaType: 'audio' } });
      form.reset(); await load(); setNotice('Recording added to the archive. Select it below to put it in the footer playlist.');
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  return <div className="echo-playlist-admin">
    <h2>Website player playlist</h2><p>Choose the archive recordings available in the thin music player. Drag-free order controls work on desktop and mobile. Uploads here are public music files.</p>
    {notice && <p role="status" className="echo-playlist-notice">{notice}</p>}
    <div className="echo-playlist-columns"><section><h3>Play order</h3>
      <label className="echo-check"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Show player on the website</label>
      <ol className="echo-playlist-order">{ids.map((id, index) => <li key={id}>
        <span>{index + 1}</span><strong>{archive.find((track) => track.id === id)?.title || 'Missing archive item'}</strong>
        <button type="button" aria-label={`Move track ${index + 1} up`} disabled={!index} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
        <button type="button" aria-label={`Move track ${index + 1} down`} disabled={index === ids.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
        <button type="button" aria-label={`Remove track ${index + 1} from playlist`} onClick={() => setIds((current) => current.filter((value) => value !== id))}>×</button>
      </li>)}</ol>
      {!ids.length && <p>No recordings selected yet.</p>}
      <button type="button" className="echo-btn" disabled={busy} onClick={save}>{busy ? 'WORKING…' : 'SAVE PLAYER PLAYLIST'}</button>
    </section><section><h3>Archive library</h3><input className="echo-playlist-search" aria-label="Search archive recordings" placeholder="Search title or artist" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="echo-playlist-library">{archive.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(query.toLowerCase())).map((track) => {
        const available = track.playerEligible === true;
        return <label key={track.id}><input type="checkbox" disabled={!available && !ids.includes(track.id)} checked={ids.includes(track.id)} onChange={(event) => setIds((current) => event.target.checked ? [...current, track.id] : current.filter((id) => id !== track.id))} /><Music2 size={18} /><span><strong>{track.title}</strong><small>{available ? track.artist || 'DJ Khalil' : 'Upload audio to Cloudinary before selecting'}</small></span></label>;
      })}</div>{!archive.length && <p>The archive has no recordings yet.</p>}
    </section></div>
    <form className="echo-form" onSubmit={upload}><fieldset><legend>Upload an archive recording</legend>
      <label>Title<input name="title" required /></label><label>Artist<input name="artist" defaultValue="DJ Khalil" /></label><label>Category<input name="category" defaultValue="mix" /></label><label>Audio file<input name="audio" type="file" accept="audio/*" required /></label>
    </fieldset><button className="echo-btn" disabled={busy}>{busy ? 'UPLOADING…' : 'UPLOAD TO CLOUDINARY & ADD TO ARCHIVE'}</button></form>
  </div>;
}
