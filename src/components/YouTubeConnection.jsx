import { useEffect, useState } from 'react';
import { Play, RefreshCw, ExternalLink, KeyRound, LogOut, ArrowUpRight } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';

const youtubeGoogleSignInUrl = 'https://accounts.google.com/AccountChooser?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Faccount';

export default function YouTubeConnection({ token, sourceUrl, refreshSignal, workspace = false, sourceField }) {
  const [connection, setConnection] = useState(null);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest('/admin/youtube-session', { token }).then(result => { if (active) setConnection(result.item); })
      .catch(error => { if (active) setNotice(error.status === 401 ? 'Your dashboard sign-in is no longer valid. Sign in to the dashboard again.' : error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, refreshSignal, reload]);
  const run = async (action) => {
    setBusy(true); setNotice('');
    try { const result = await action(); setConnection(result.item); return true; }
    catch (error) { if (error.payload?.item) setConnection(error.payload.item); setNotice(error.message || 'YouTube connection could not be updated.'); return false; }
    finally { setBusy(false); }
  };
  const connect = async () => {
    if (!file || !label.trim()) { setNotice('Enter an account label and choose a YouTube cookies.txt session file.'); return; }
    const data = new FormData(); data.append('accountLabel', label.trim()); data.append('sessionFile', file);
    const saved = await run(async () => {
      const response = await fetch(`${apiBaseUrl}/admin/youtube-session`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Session could not be connected.');
      return payload;
    });
    if (saved) { setEditing(false); setFile(null); setLabel(''); }
  };
  const publicAccess = connection?.publicAccess;
  const status = !connection ? (loading ? 'Loading connection…' : 'Connection status unavailable')
    : publicAccess?.status === 'ready' ? 'Public access · conversion verified'
      : publicAccess?.status === 'blocked' ? 'Public download blocked by YouTube'
        : publicAccess?.status === 'error' ? 'Public video conversion failed' : 'Public links · no account used';
  const checkButton = <button className="youtube-check-button" type="button" disabled={busy || !sourceUrl.trim()} onClick={() => run(() => apiRequest('/admin/youtube-session/check', { token, method: 'POST', body: { sourceUrl } }))}>{busy ? 'Checking…' : 'Check access'}<ArrowUpRight size={15} aria-hidden="true" /></button>;
  return <div className={`archive-youtube-connection${workspace ? ' youtube-workspace' : ''}`} aria-label="YouTube account connection" aria-busy={busy}>
    <div className="youtube-identity">
      <div className="youtube-provider-heading"><span className="youtube-provider-icon"><Play size={24} strokeWidth={1.5} aria-hidden="true" /></span><div><small>Connected service</small><h3>YouTube</h3></div></div>
      <p className={`youtube-status${publicAccess?.status === 'ready' ? ' is-ready' : ''}`}>{status}</p>
      {connection?.connected && <p className="youtube-account-name">Saved session (not used for public imports): {connection.accountLabel}</p>}
      {connection?.processingLocation === 'admin-computer' && <p className="admin-helper-copy">Conversion runs on your admin computer through a private connection. Keep it online while importing. Finished tracks stay in the archive when it goes offline.</p>}
      <p className="admin-helper-copy youtube-status-detail">{publicAccess?.message || 'Public music links are converted without signing in. If YouTube blocks access from the server, upload an audio file instead.'}</p>
      {publicAccess?.lastCheckedAt && <small className="youtube-last-checked">Last checked {new Date(publicAccess.lastCheckedAt).toLocaleString()}</small>}
    </div>
    <div className="youtube-connection-actions">
      <a className="primary-button youtube-sign-in-button" href={youtubeGoogleSignInUrl} target="_blank" rel="noopener noreferrer" onClick={() => setNotice('Complete YouTube sign-in in the Google tab. This is optional; public music imports do not use your account.')}><span>Sign in to YouTube with Google</span><ExternalLink size={14} aria-hidden="true" /></a>
      <p className="admin-helper-copy youtube-browser-sign-in-note">Optional browser sign-in. Public music imports do not use a Google account or saved session.</p>
      <button type="button" disabled={busy || loading} onClick={() => { setNotice(''); setReload(value => value + 1); }}><RefreshCw size={14} aria-hidden="true" /><span>Refresh status</span></button>
      <button type="button" disabled={busy || !connection?.configured} aria-expanded={editing} onClick={() => setEditing(!editing)}><KeyRound size={14} aria-hidden="true" /><span>{connection?.connected ? 'Replace session' : 'Connect session'}</span></button>
      {connection?.connected && <button type="button" disabled={busy} onClick={() => run(() => apiRequest('/admin/youtube-session', { token, method: 'DELETE' }))}><LogOut size={14} aria-hidden="true" /><span>Sign out of converter</span></button>}
      {!workspace && checkButton}
    </div>
    {workspace && <div className="youtube-access-check"><div><h3>Video access</h3><p>Check a video before adding it to your library.</p></div><div className="youtube-access-field">{sourceField}{checkButton}</div><a className="youtube-library-link" href="/admin/archive">Open Recordings Archive <ArrowUpRight size={14} aria-hidden="true" /></a></div>}
    {editing && <div className="youtube-session-editor">
      <h3>{connection?.connected ? 'Replace server session' : 'Connect server session'}</h3>
      <p className="admin-helper-copy">Use “Sign in to YouTube with Google” to choose your account, then import its Netscape cookies.txt session file here. Signing in on YouTube alone does not update this server. Session cookies are sign-in credentials; only connect an account you authorize this private server to use.</p>
      <label><span>Account label (name or email)</span><input value={label} maxLength={120} onChange={event => setLabel(event.target.value)} disabled={busy} autoComplete="off" /></label>
      <label><span>YouTube session file</span><input type="file" accept=".txt" disabled={busy} onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      <button type="button" disabled={busy || !file || !label.trim()} onClick={connect}>Save server session</button>
    </div>}
    <details className="youtube-connection-note"><summary>About this connection</summary><p className="admin-helper-copy">Music imports use public access only and ignore saved sessions. Google handles optional YouTube browser sign-in in its own tab. The account shown here identifies the converter session you supplied; the dashboard cannot read which Google account is signed in to your browser. Signing out removes the server session and leaves your browser account signed in.</p></details>
    {notice && <p className="youtube-connection-notice" role="status">{notice}</p>}
  </div>;
}
