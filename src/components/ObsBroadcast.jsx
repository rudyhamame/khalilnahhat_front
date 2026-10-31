import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './obsBroadcast.css';

export default function ObsBroadcast({ token, title, enabled, onUpdate }) {
  const [item, setItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const revisionRef = useRef(0);
  const [message, setMessage] = useState('');
  const [checkMessage, setCheckMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const updateRef = useRef(onUpdate);
  useEffect(() => { updateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timer;
    const refresh = async () => {
      const revision = revisionRef.current;
      try {
        const result = await apiRequest('/live-stream/obs', { token });
        if (!cancelled && revision === revisionRef.current) { setItem(result.item); updateRef.current(result.item); setCheckMessage(''); if (result.item?.obs?.error) setMessage(result.item.obs.error); }
      } catch (error) { if (!cancelled) setCheckMessage(error.message); }
      if (!cancelled) timer = setTimeout(refresh, 5000);
    };
    refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, token]);
  const obs = item?.obs;
  const saveRecording = obs?.saveRecording !== false;
  const changeRecording = async () => {
    revisionRef.current += 1;
    setSavingRecording(true); setMessage('');
    try {
      const result = await apiRequest('/live-stream/obs/recording', { token, method: 'PATCH', body: { saveRecording: !saveRecording } });
      revisionRef.current += 1;
      setItem(result.item); updateRef.current(result.item);
    } catch (error) { setMessage(error.message); }
    finally { revisionRef.current += 1; setSavingRecording(false); }
  };
  const act = async () => {
    revisionRef.current += 1;
    setBusy(true); setMessage(''); setShowKey(false);
    try {
      const result = await apiRequest(`/live-stream/obs/${obs?.roomName ? 'end' : 'prepare'}`, {
        token, method: 'POST', body: obs?.roomName ? { roomName: obs.roomName } : { title },
      });
      revisionRef.current += 1;
      setItem(result.item); updateRef.current(result.item);
    } catch (error) { setMessage(error.message); }
    finally { revisionRef.current += 1; setBusy(false); }
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
    {!obs?.roomName ? <p className="obs-help">{obs?.transport === 'ovh' ? 'OBS → Settings → Stream → WHIP. Paste the server URL and bearer token, then start streaming.' : 'OBS → Settings → Stream → Custom. Paste the server and key, then start streaming.'}</p> : null}
    {obs?.transport === 'ovh' ? <p className="obs-help">OVH · Direct WebRTC, no live remux or transcoding. Use H.264 Baseline video, no B-frames, Opus audio, and a 2-second keyframe interval. Start at 720p, 30 fps, 2,500–4,000 kbps.</p> : null}
    <div className="obs-recording-option">
      <div><strong>Save recording</strong><p className="obs-help" id="obs-recording-help">{savingRecording ? 'Saving preference…' : saveRecording ? 'Keep this broadcast in Live Recordings when it ends.' : 'Live only. No recording will be stored.'}{obs?.roomName ? ' Set before preparing the next connection.' : ''}</p></div>
      <button type="button" role="switch" aria-label="Save recording" aria-checked={saveRecording} aria-describedby="obs-recording-help" className="obs-recording-switch" disabled={!item || busy || savingRecording || Boolean(obs?.roomName) || Boolean(item?.isLive)} onClick={changeRecording}><span /></button>
    </div>
    <span className={`obs-status is-${obs?.state === 'live' ? 'live' : obs?.state === 'ending' ? 'waiting' : obs?.roomName ? 'waiting' : 'off'}`}><i aria-hidden="true" />{obs?.state === 'live' ? 'Receiving OBS · On air' : obs?.state === 'ending' ? 'Disconnecting OBS…' : obs?.roomName ? 'Waiting for OBS · Start within 2 minutes' : 'OBS disconnected'}</span>
    {obs?.streamKey && obs.state !== 'ending' ? <>
      <label>Server<div className="obs-field"><input aria-label="OBS server" value={obs.url} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS server" title="Copy server" onClick={() => copy(obs.url, 'Server')}><Copy size={14} aria-hidden="true" /></button></div></label>
      <label>{obs.transport === 'ovh' ? 'Bearer token' : 'Stream key'}<div className="obs-field"><input aria-label="OBS stream key" type={showKey ? 'text' : 'password'} value={obs.streamKey} readOnly onFocus={event => event.target.select()} /><button type="button" aria-label="Copy OBS stream key" title="Copy stream key" onClick={() => copy(obs.streamKey, 'Stream key')}><Copy size={14} aria-hidden="true" /></button></div></label>
      <button className="obs-reveal" type="button" onClick={() => setShowKey(value => !value)}>{showKey ? 'Hide key' : 'Show key'}</button>
      <p className="obs-help">Keep the key private. Prepare a new connection for each broadcast.</p>
    </> : null}
    <button type="button" className="admin-live-control admin-live-control-start" disabled={busy || savingRecording || !item || (item.isLive && !obs?.roomName)} onClick={act}>{busy ? 'Working…' : obs?.roomName ? 'Disconnect OBS' : 'Prepare OBS'}</button>
    {message || checkMessage ? <p className="obs-help" role="status">{message || checkMessage}</p> : null}
  </div>;
}
