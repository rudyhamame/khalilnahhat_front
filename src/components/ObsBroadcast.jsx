import { useState } from 'react';
import { Copy } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './obsBroadcast.css';
import ObsQualityGuide from './ObsQualityGuide';

export default function ObsBroadcast({ token, title, item, onUpdate, missing = [] }) {
  const detailsReady = !missing.length;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const obs = item?.obs;
  const act = async () => {
    setBusy(true); setMessage(''); setShowKey(false);
    try {
      const result = await apiRequest(`/live-stream/obs/${obs?.roomName ? 'end' : 'prepare'}`, {
        token, method: 'POST', body: obs?.roomName ? { roomName: obs.roomName } : { title },
      });
      onUpdate(result.item);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const copy = async (value, label) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        // LAN HTTP pages lack the secure Clipboard API. Copy during this user gesture.
        const previous = document.activeElement;
        const field = document.createElement('textarea');
        field.value = value; field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field); field.select();
        try { if (!document.execCommand('copy')) throw new Error('Copy unavailable'); }
        finally { field.remove(); previous?.focus(); }
      }
      setMessage(`${label} copied.`);
    }
    catch { setMessage('Select the field and copy it manually.'); }
  };
  return <div className="obs-controls">
    <div className="obs-session-toolbar">
      {(obs?.roomName||obs?.state==='ending')&&<span className={`obs-status is-${obs?.state === 'live' ? 'live' : obs?.state === 'ending' ? 'waiting' : obs?.roomName ? 'waiting' : 'off'}`}><i aria-hidden="true" />{obs?.state === 'live' ? 'Receiving OBS · On air' : obs?.state === 'ending' ? 'Disconnecting OBS…' : obs?.roomName ? 'Waiting for OBS · Start within 2 minutes' : 'OBS disconnected'}</span>}
      <button type="button" className="admin-live-control admin-live-control-start" disabled={busy || !item || (item.isLive && !obs?.roomName) || (!obs?.roomName && !detailsReady)} title={!obs?.roomName && !detailsReady ? `Add ${missing.join(", ")} first` : undefined} onClick={act}>{busy ? 'Working…' : obs?.roomName ? 'Disconnect OBS' : 'Prepare OBS'}</button>
      {!obs?.roomName && !detailsReady && <p className="obs-help" role="status">Prepare OBS unlocks once you add {missing.join(", ").replace(/, ([^,]*)$/, " and $1")} in Session details.</p>}
    </div>
    <div className="obs-disclosures">
    {obs?.streamKey && obs.state !== 'ending' ? <details className="obs-connection-details" open={obs.state !== 'live'}>
      <summary>Connection details</summary>
      <div className="obs-connection-fields">
        <label>Server<div className="obs-field"><input aria-label="OBS server" value={obs.url} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS server" title="Copy server" onClick={() => copy(obs.url, 'Server')}><Copy size={14} aria-hidden="true" /></button></div></label>
        <label>{obs.transport === 'ovh' ? 'Bearer token' : 'Stream key'}<div className="obs-field"><input aria-label="OBS stream key" type={showKey ? 'text' : 'password'} value={obs.streamKey} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS stream key" title="Copy stream key" onClick={() => copy(obs.streamKey, 'Stream key')}><Copy size={14} aria-hidden="true" /></button><button className="obs-reveal" type="button" onClick={() => setShowKey(value => !value)}>{showKey ? 'Hide' : 'Show'}</button></div></label>
      </div>
      <p className="obs-help">Keep the key private. Prepare a new connection for each live stream.</p>
    </details> : null}
    {obs?.transport === 'ovh' ? <details className="obs-setup-guide" aria-label="OBS Studio setup instructions"><summary>OBS Studio setup (720p and 1080p)</summary><ObsQualityGuide /></details> : !obs?.roomName ? <p className="obs-help">OBS → Settings → Stream → Custom. Paste the server and key, then start streaming.</p> : null}
    {message || obs?.error ? <p className="obs-help" role="status">{message || obs?.error}</p> : null}
    </div>
  </div>;
}
