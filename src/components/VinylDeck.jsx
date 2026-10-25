import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { recordSeekTime, recordTurnDelta } from '../lib/vinylTransport';

export default function VinylDeck({ track, playing, preparing = false, position, duration, onToggle, onSeek, integrated = false }) {
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const angleAt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2);
  };
  const finish = (event) => {
    if (!gesture.current) return;
    suppressClick.current = gesture.current.moved;
    gesture.current = null;
    setScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const Surface = integrated ? 'div' : 'section';
  return <Surface className={`echo-vinyl-card${playing ? ' is-playing' : ''}${scrubbing ? ' is-scrubbing' : ''}`} aria-labelledby={integrated ? undefined : "echo-vinyl-heading"}>
    {!integrated && <header><div><span>ECHO / ANALOG</span><h2 id="echo-vinyl-heading">Vinyl deck</h2></div><span className="echo-vinyl-speed">33⅓ RPM</span></header>}
    <div className="echo-vinyl-turntable">
      <button type="button" className="echo-vinyl-platter" disabled={!track} aria-label={preparing ? 'Cancel headphones preparation' : playing ? 'Pause vinyl record' : 'Play vinyl record'} title="Click to play or pause · drag clockwise or counterclockwise to seek" onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onToggle(); }}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          suppressClick.current = false;
          gesture.current = { angle: angleAt(event), total: 0, start: position, rotation, x: event.clientX, y: event.clientY, moved: false };
        }}
        onPointerMove={event => {
          const drag = gesture.current;
          if (!drag || !duration) return;
          const angle = angleAt(event);
          drag.total += recordTurnDelta(drag.angle, angle);
          drag.angle = angle;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
          if (!drag.moved) return;
          setScrubbing(true);
          setRotation(drag.rotation + drag.total * 180 / Math.PI);
          onSeek(recordSeekTime(drag.start, drag.total, duration));
        }}
        onPointerUp={finish} onPointerCancel={event => { finish(event); suppressClick.current = true; }} onLostPointerCapture={() => { gesture.current = null; setScrubbing(false); }}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onSeek(Math.max(0, Math.min(duration || 0, position + (event.key === 'ArrowLeft' ? -5 : 5)))); }
          if (event.key === 'Home') { event.preventDefault(); onSeek(0); }
        }}>
        <span className="echo-vinyl-rotation" style={{ transform: `rotate(${rotation}deg)` }}><span className="echo-vinyl-disc"><span className="echo-vinyl-runout" /><span className="echo-vinyl-label">{track?.coverImage ? <img src={track.coverImage} alt="" draggable="false" onError={event => { event.currentTarget.hidden = true; }} /> : null}<span>ECHO<small>SIDE A · STEREO</small></span></span></span></span><span className="echo-vinyl-spindle" />
      </button>
      <div className="echo-vinyl-tonearm" aria-hidden="true"><i /><span><b /></span></div>
    </div>
    <div className="echo-vinyl-footer"><span>{preparing ? 'Putting headphones on…' : scrubbing ? 'Seeking…' : playing ? 'Now spinning' : 'Click to play'}<small>Drag to seek · ← → 5 seconds</small></span><button type="button" disabled={!track || !duration} aria-label="Cue vinyl to start" title="Return to the start" onClick={() => onSeek(0)}><RotateCcw size={14} /><span>Cue</span></button></div>
  </Surface>;
}
