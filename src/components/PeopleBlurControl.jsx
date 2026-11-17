import { useEffect, useReducer } from 'react';
import { ScanFace, UserCheck } from 'lucide-react';
import { peopleBlur, setPeopleBlur, subscribePeopleBlur } from '../lib/peopleBlur';
import './peopleBlurControl.css';
// Live: blur everyone except DJ Khalil. "Pick DJ" lets the host click his face in the preview (otherwise the biggest face is assumed).
export default function PeopleBlurControl() {
  const [, bump] = useReducer(n => n + 1, 0);
  useEffect(() => subscribePeopleBlur(bump), []);
  const { enabled, pick, boxes, error, anchor } = peopleBlur;
  const isDj = b => anchor && Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy) < Math.max(b.w, anchor.w);
  return <>
    <div className="people-blur-bar">
      <button type="button" aria-pressed={enabled} onClick={() => setPeopleBlur({ enabled: !enabled, pick: false })} title="Blur everyone except DJ Khalil (runs on this device, free)"><ScanFace size={14} />Blur others{enabled ? ' · on' : ''}</button>
      {enabled && <button type="button" aria-pressed={pick} onClick={() => setPeopleBlur({ pick: !pick })} title="Click the DJ's face in the preview"><UserCheck size={14} />{pick ? 'Click the DJ…' : 'Pick DJ'}</button>}
      {error && <small role="status">{error}</small>}
    </div>
    {enabled && !pick && <div className="people-blur-boxes" aria-hidden="true">{boxes.map((b, i) => <span key={i} className={isDj(b) ? 'is-dj' : 'is-blurred'} style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />)}</div>}
    {enabled && pick && <div className="people-blur-pick" aria-label="Choose DJ Khalil">{boxes.map((b, i) => <button key={i} type="button" aria-label="This is DJ Khalil" style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} onClick={() => setPeopleBlur({ anchor: { cx: b.cx, cy: b.cy, w: b.w }, pick: false })} />)}</div>}
  </>;
}
