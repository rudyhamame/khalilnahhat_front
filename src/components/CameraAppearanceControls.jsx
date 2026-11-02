import { CAMERA_APPEARANCE_CONTROLS, CAMERA_APPEARANCE_PRESETS } from '../lib/cameraAppearance';

export default function CameraAppearanceControls({ value, onChange, disabled }) {
  return <section className="studio-appearance" aria-label="Camera beauty and lighting">
    <header><h3>Beauty & lighting</h3><span>Applied to outgoing video</span></header>
    <p>Natural whole-image softening and colour correction. No face reshaping or face tracking. Lighting adjusts exposure and contrast; it cannot recover detail lost in a dark or overexposed camera image.</p>
    <div className="studio-appearance-presets">{[['off','Off'],['natural','Natural'],['lowLight','Low light']].map(([key,label])=><button key={key} type="button" disabled={disabled} onClick={()=>onChange(CAMERA_APPEARANCE_PRESETS[key])}>{label}</button>)}</div>
    <fieldset disabled={disabled}><legend className="sr-only">Camera appearance adjustments</legend>{CAMERA_APPEARANCE_CONTROLS.map(({key,label,min,max})=><label key={key}><span>{label}<output>{value[key]}{key==='strength'?'%':''}</output></span><input type="range" aria-label={label} min={min} max={max} step="1" value={value[key]} onChange={event=>onChange({...value,[key]:Number(event.target.value)})}/></label>)}</fieldset>
    <p>Strength 0 turns beauty and lighting off. The DJ Khalil logo stays embedded in the browser camera video, including recordings and social outputs. Logo text stays readable when the camera is mirrored. Keep the studio tab visible; effects add graphics work.</p>
  </section>;
}
