import { useEffect, useReducer } from 'react';
import { ScanFace, UserCheck } from 'lucide-react';
import { peopleBlur, portraitBlur, setPeopleBlur, setPortraitBlur, subscribePeopleBlur } from '../lib/peopleBlur';
import './peopleBlurControl.css';
// The two blur buttons live in the studio's preview header; the boxes below are drawn over the preview itself.
export function PeopleBlurToggle() {
  const [, bump] = useReducer(n => n + 1, 0);
  useEffect(() => subscribePeopleBlur(bump), []);
  const { enabled, pick, error } = peopleBlur, active = enabled;
  return <div className="people-blur-bar">
      <button type="button" aria-pressed={enabled} onClick={() => setPeopleBlur({ enabled: !enabled, pick: false })} title="Blur everyone except DJ Khalil (runs on this device, free)"><ScanFace size={14} />Blur others{enabled ? ' · on' : ''}</button>
      {active && <button type="button" aria-pressed={pick} onClick={() => setPeopleBlur({ pick: !pick })} title="Click the DJ's face in the preview"><UserCheck size={14} />{pick ? 'Click the DJ…' : 'Pick DJ'}</button>}
      {error && <small role="status">{error}</small>}
  </div>;
}
// Live: blur everyone except DJ Khalil. "Pick DJ" lets the host click his face in the preview (otherwise the biggest face is assumed).
export default function PeopleBlurControl() {
  const [, bump] = useReducer(n => n + 1, 0);
  useEffect(() => subscribePeopleBlur(bump), []);
  const { enabled, pick, boxes, error, anchor } = peopleBlur, active = enabled;
  const isDj = b => anchor && Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy) < Math.max(b.w, anchor.w);
  return <>
    {active && !pick && <div className="people-blur-boxes" aria-hidden="true">{boxes.map((b, i) => <span key={i} className={isDj(b) ? 'is-dj' : 'is-blurred'} style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}><Pct b={b} /></span>)}</div>}
    {active && pick && <div className="people-blur-pick" aria-label="Choose DJ Khalil">{boxes.map((b, i) => <button key={i} type="button" aria-label="This is DJ Khalil" style={{ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} onClick={() => setPeopleBlur({ anchor: { cx: b.cx, cy: b.cy, w: b.w, score: b.score }, pick: false })}><Pct b={b} /></button>)}</div>}
  </>;
}


// The portrait camera's own DJ pick for the blur (2 windows). Button in the portrait header, boxes over the portrait picture.
function useBlurState() { const [, bump] = useReducer(n => n + 1, 0); useEffect(() => subscribePeopleBlur(bump), []); }
export function PortraitBlurButton() {
  useBlurState();
  if (!peopleBlur.enabled) return null;
  return <button type="button" className="studio-follow-dj" aria-pressed={portraitBlur.pick} onClick={() => setPortraitBlur({ pick: !portraitBlur.pick })} title="Click the DJ's face on the portrait camera, so everyone else there is blurred"><UserCheck size={13} />{portraitBlur.pick ? 'Click the DJ…' : 'Pick DJ (blur)'}</button>;
}
// Capture clarity: how sure the face detector is about this face.
export const Pct = ({ b }) => b?.score != null ? <em className="blur-pct">{Math.round(b.score * 100)}%</em> : null;

export function PortraitBlurBoxes() {
  useBlurState();
  if (!peopleBlur.enabled) return null;
  const { pick, boxes, anchor } = portraitBlur, isDj = b => anchor && Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy) < Math.max(b.w, anchor.w);
  const place = b => ({ left: `${(b.cx - b.w / 2) * 100}%`, top: `${(b.cy - b.h / 2) * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });
  return pick
    ? <div className="people-blur-pick" aria-label="Choose DJ Khalil on the portrait camera">{boxes.map((b, i) => <button key={i} type="button" aria-label="This is DJ Khalil" style={place(b)} onPointerDown={e => e.stopPropagation()} onClick={() => setPortraitBlur({ anchor: { cx: b.cx, cy: b.cy, w: b.w, score: b.score }, pick: false })}><Pct b={b} /></button>)}</div>
    : <div className="people-blur-boxes" aria-hidden="true">{boxes.map((b, i) => <span key={i} className={isDj(b) ? 'is-dj' : 'is-blurred'} style={place(b)}><Pct b={b} /></span>)}</div>;
}
