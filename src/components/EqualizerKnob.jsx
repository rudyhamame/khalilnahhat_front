import { useRef } from 'react';

export default function EqualizerKnob({ label, frequency, value, onChange }) {
  const drag = useRef(null);
  const update = next => onChange(Math.max(-12, Math.min(12, Math.round(next))));
  return <div className="echo-eq-knob-field"><span className="echo-eq-knob-label">{label}<small>{frequency}</small></span>
    <button type="button" className="echo-eq-knob" role="slider" aria-label={`${label} equalizer gain`} aria-valuemin={-12} aria-valuemax={12} aria-valuenow={value} aria-valuetext={`${value > 0 ? '+' : ''}${value} decibels`} aria-orientation="vertical" title="Drag up or down · double-click to reset" style={{ '--knob-angle': `${value / 12 * 135}deg` }}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { y: event.clientY, value }; }}
      onPointerMove={event => { if (drag.current) update(drag.current.value + (drag.current.y - event.clientY) / 4); }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onDoubleClick={() => update(0)}
      onKeyDown={event => {
        const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 3, PageDown: -3 }[event.key];
        if (step) { event.preventDefault(); update(value + step); }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); update(event.key === 'Home' ? -12 : 12); }
      }}><span className="echo-eq-knob-ticks" aria-hidden="true" /><span className="echo-eq-knob-cap" aria-hidden="true"><i /></span></button>
    <output>{value > 0 ? '+' : ''}{value}<small> dB</small></output>
  </div>;
}
