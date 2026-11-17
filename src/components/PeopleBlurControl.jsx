import { useEffect, useReducer } from 'react';
import { Crosshair, ScanFace, UserCheck } from 'lucide-react';
import { peopleBlur, setPeopleBlur, subscribePeopleBlur } from '../lib/peopleBlur';
import './peopleBlurControl.css';
// Live: blur everyone except DJ Khalil. "Pick DJ" lets the host click his face in the preview (otherwise the biggest face is assumed).
export default function PeopleBlurControl() {
  const [, bump] = useReducer(n => n + 1, 0);
  useEffect(() => subscribePeopleBlur(bump), []);
  const { enabled, follow, pick, boxes, error, anchor } = peopleBlur, active = enabled || follow;
  const isDj = b => anchor && Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy) < Math.max(b.w, anchor.w);
  return <>
    <div className="people-blur-bar">
      <button type="button" aria-pressed={enabled} onClick={() => setPeopleBlur({ enabled: !enabled, pick: false })} title="Blur everyone except DJ Khalil (runs on this device, free)"><ScanFace size={14} />Blur others{enabled ? ' · on' : ''}</button>
      {active && <button type="button" aria-pressed={pick} onClick={() => setPeopleBlur({ pick: !pick })} title="Click the DJ's face in the preview"><UserCheck size={14} />{pick ? 'Click the DJ…' : 'Pick DJ'}</button>}
      {error && <small role="status">{error}</small>}
    </div>
    {active && !pick && <div className="people-blur-boxes" aria-hidden="true">{boxes.map((b, i) => <span key={i} className={isDj(b) ? 'is-dj' : 'is-blurred'} style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />)}</div>}
    {active && pick && <div className="people-blur-pick" aria-label="Choose DJ Khalil">{boxes.map((b, i) => <button key={i} type="button" aria-label="This is DJ Khalil" style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} onClick={() => setPeopleBlur({ anchor: { cx: b.cx, cy: b.cy, w: b.w }, pick: false })} />)}</div>}
  </>;
}

// The same Follow DJ switch, placed in the portrait window's header (the crop it steers). The DJ is picked in the landscape preview.
export function FollowDjButton() {
  const [, bump] = useReducer(n => n + 1, 0);
  useEffect(() => subscribePeopleBlur(bump), []);
  const { follow, error } = peopleBlur;
  return <button type="button" className="studio-follow-dj" aria-pressed={follow} onClick={() => setPeopleBlur({ follow: !follow, pick: false })} title={error || "Auto-crop: keep DJ Khalil's face centered here. Pick the DJ first with Pick DJ in the landscape preview."}><Crosshair size={13} />Auto crop{follow ? ' · on' : ''}</button>;
}
