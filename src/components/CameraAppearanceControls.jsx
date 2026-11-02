import { Sun, X, ChevronDown } from 'lucide-react';
import { CAMERA_APPEARANCE_CONTROLS, CAMERA_APPEARANCE_PRESETS } from '../lib/cameraAppearance';

const shortLabels={strength:'Strength',smoothing:'Smoothing',brightness:'Exposure',contrast:'Contrast',warmth:'Warmth',tone:'Tone'};
export default function CameraAppearanceControls({ value, onChange, disabled, onClose }) {
  return <section className="studio-appearance" aria-label="Camera beauty and lighting">
    <header><div className="studio-look-title"><Sun size={15} aria-hidden="true"/><div><h3>Beauty & lighting</h3><span>LIVE LOOK · {value.strength?'ON':'OFF'}</span></div></div><button type="button" className="studio-look-close" onClick={onClose} aria-label="Close beauty and lighting"><X size={15} aria-hidden="true"/></button></header>
    <div className="studio-appearance-presets">{[['off','Off'],['natural','Natural'],['lowLight','Low light']].map(([key,label])=><button key={key} type="button" disabled={disabled} onClick={()=>onChange(CAMERA_APPEARANCE_PRESETS[key])}>{label}</button>)}</div>
    <fieldset disabled={disabled}><legend className="sr-only">Camera appearance adjustments</legend>{CAMERA_APPEARANCE_CONTROLS.map(({key,label,min,max})=><label key={key}><span>{shortLabels[key]}<output>{value[key]}{key==='strength'?'%':''}</output></span><input type="range" aria-label={label} min={min} max={max} step="1" value={value[key]} onChange={event=>onChange({...value,[key]:Number(event.target.value)})}/></label>)}</fieldset>
    <footer><span className="studio-look-output-dot" aria-hidden="true"/>Preview + outgoing video</footer>
    <details className="studio-look-help"><summary>About these controls<ChevronDown size={12} aria-hidden="true"/></summary><p>Whole-image softening and colour correction; no face reshaping or tracking. Exposure cannot recover lost camera detail. Strength 0 turns effects off. The embedded logo stays readable when mirrored. Keep this tab visible and check performance with effects enabled.</p></details>
  </section>;
}
