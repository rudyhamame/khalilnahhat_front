import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, X } from 'lucide-react';
import { useVocalCorrection } from '../hooks/useVocalCorrection';
import { VOCAL_NOTES, vocalNote } from '../lib/vocalPitch';
import './vocalCorrection.css';

export default function VocalCorrectionControl() {
  const dialog = useRef(null);
  const titleId = useId();
  const { settings, setSettings, status, pitch } = useVocalCorrection();
  return <>
    <button type="button" className={`echo-vocal-icon${settings.enabled ? ' is-active' : ''}`} aria-label="Autotune settings" aria-haspopup="dialog" title={`Autotune · ${settings.enabled ? 'on' : 'off'}`} onClick={() => dialog.current?.showModal()}><AudioLines size={15} /><span className="echo-vocal-dot" /></button>
    {createPortal(<dialog ref={dialog} className="echo-vocal-dialog" aria-labelledby={titleId}>
      <header><div><small>MICROPHONE FX</small><h2 id={titleId}>Vocal tune</h2></div><button type="button" aria-label="Close autotune settings" onClick={() => dialog.current.close()}><X size={19} /></button></header>
      <p>Pitch correction for the browser live-broadcast microphone.</p>
      <label className="echo-vocal-enable"><span>Enable autotune</span><input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ enabled: event.target.checked })} /></label>
      <div className="echo-vocal-selects"><label>Key<select value={settings.key} disabled={settings.scale === 'chromatic'} onChange={event => setSettings({ key: Number(event.target.value) })}>{VOCAL_NOTES.map((note, index) => <option key={note} value={index}>{note}</option>)}</select></label><label>Scale<select value={settings.scale} onChange={event => setSettings({ scale: event.target.value })}><option value="chromatic">Chromatic</option><option value="major">Major</option><option value="minor">Minor</option></select></label></div>
      <label className="echo-vocal-range"><span>Correction <output>{Math.round(settings.amount * 100)}%</output></span><input type="range" aria-label="Pitch correction amount" min="0" max="1" step=".01" value={settings.amount} onChange={event => setSettings({ amount: Number(event.target.value) })} /></label>
      <label className="echo-vocal-range"><span>Retune speed <output>{settings.speed} ms</output></span><input type="range" aria-label="Retune speed" min="10" max="300" step="5" value={settings.speed} onChange={event => setSettings({ speed: Number(event.target.value) })} /><small>Fast &amp; robotic ← → Slow &amp; gentle</small></label>
      <div className="echo-vocal-status" role="status">{status || (settings.enabled ? 'Ready for your next browser broadcast.' : 'Off · your natural microphone signal.')}{settings.enabled && pitch?.frequency > 0 && <span>{Math.round(pitch.frequency)} Hz → {vocalNote(pitch.targetMidi)}</span>}</div>
      <p className="echo-vocal-note">Use a solo vocal signal. Processing adds a short delay and can color your voice. These controls apply to the live broadcast; the channel’s local Monitor mic preview stays dry.</p>
    </dialog>, document.body)}
  </>;
}
