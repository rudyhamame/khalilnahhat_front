import { useState } from 'react';
import { Copy } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './obsBroadcast.css';

export default function ObsBroadcast({ token, title, item, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const obs = item?.obs;
  const saveRecording = obs?.saveRecording !== false;
  const changeRecording = async () => {
    setSavingRecording(true); setMessage('');
    try {
      const result = await apiRequest('/live-stream/obs/recording', { token, method: 'PATCH', body: { saveRecording: !saveRecording } });
      onUpdate(result.item);
    } catch (error) { setMessage(error.message); }
    finally { setSavingRecording(false); }
  };
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
      <span className={`obs-status is-${obs?.state === 'live' ? 'live' : obs?.state === 'ending' ? 'waiting' : obs?.roomName ? 'waiting' : 'off'}`}><i aria-hidden="true" />{obs?.state === 'live' ? 'Receiving OBS · On air' : obs?.state === 'ending' ? 'Disconnecting OBS…' : obs?.roomName ? 'Waiting for OBS · Start within 2 minutes' : 'OBS disconnected'}</span>
      <div className="obs-recording-option">
        <div><strong>Save recording</strong><p className="obs-help" id="obs-recording-help">{savingRecording ? 'Saving…' : saveRecording ? 'Keep in Live Recordings' : 'Live only'}{obs?.roomName ? ' · Set before next connection' : ''}</p></div>
        <button type="button" role="switch" aria-label="Save recording" aria-checked={saveRecording} aria-describedby="obs-recording-help" className="obs-recording-switch" disabled={!item || busy || savingRecording || Boolean(obs?.roomName) || Boolean(item?.isLive)} onClick={changeRecording}><span /></button>
      </div>
      <button type="button" className="admin-live-control admin-live-control-start" disabled={busy || savingRecording || !item || (item.isLive && !obs?.roomName)} onClick={act}>{busy ? 'Working…' : obs?.roomName ? 'Disconnect OBS' : 'Prepare OBS'}</button>
    </div>
    <div className="obs-disclosures">
    {obs?.streamKey && obs.state !== 'ending' ? <details className="obs-connection-details" open={obs.state !== 'live'}>
      <summary>Connection details</summary>
      <div className="obs-connection-fields">
        <label>Server<div className="obs-field"><input aria-label="OBS server" value={obs.url} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS server" title="Copy server" onClick={() => copy(obs.url, 'Server')}><Copy size={14} aria-hidden="true" /></button></div></label>
        <label>{obs.transport === 'ovh' ? 'Bearer token' : 'Stream key'}<div className="obs-field"><input aria-label="OBS stream key" type={showKey ? 'text' : 'password'} value={obs.streamKey} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS stream key" title="Copy stream key" onClick={() => copy(obs.streamKey, 'Stream key')}><Copy size={14} aria-hidden="true" /></button><button className="obs-reveal" type="button" onClick={() => setShowKey(value => !value)}>{showKey ? 'Hide' : 'Show'}</button></div></label>
      </div>
      <p className="obs-help">Keep the key private. Prepare a new connection for each broadcast.</p>
    </details> : null}
    {obs?.transport === 'ovh' ? <details className="obs-setup-guide" aria-label="OBS Studio setup instructions">
      <summary>OBS Studio setup</summary>
      <ol>
        <li><b>Stream:</b> Service <b>WHIP</b>. Paste the Server and Bearer token below. Prepare a fresh connection for every broadcast and start within 2 minutes.</li>
        <li><b>Output:</b> Output Mode <b>Simple</b>; Streaming Encoder <b>x264</b>; Video Bitrate <b>2,500–4,000 Kbps</b>. Enable <b>Advanced Encoder Settings</b> and set x264 Options to <code>profile=baseline bframes=0 keyint=60</code>. Keep audio as <b>Opus</b>.</li>
        <li><b>Video:</b> Output Resolution <b>1280×720</b>; Common FPS Values <b>30</b>. A keyframe interval of 60 frames is 2 seconds at 30 fps.</li>
      </ol>
      <p className="obs-help">This relay sends WebRTC directly and does not remux or transcode. These encoder settings are required.</p>
    </details> : !obs?.roomName ? <p className="obs-help">OBS → Settings → Stream → Custom. Paste the server and key, then start streaming.</p> : null}
    {message || obs?.error ? <p className="obs-help" role="status">{message || obs?.error}</p> : null}
    </div>
  </div>;
}
