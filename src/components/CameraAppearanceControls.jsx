import { useRef } from 'react';
import { Sparkles, Moon, Power, RotateCcw } from 'lucide-react';
import { CAMERA_APPEARANCE_CONTROLS, CAMERA_APPEARANCE_PRESETS } from '../lib/cameraAppearance';

const labels={strength:'Strength',smoothing:'Smoothing',brightness:'Exposure',contrast:'Contrast',warmth:'Warmth',tone:'Tone',sideLight:'Side light'};
const presets=[['off','Off',Power],['natural','Natural',Sparkles],['lowLight','Low light',Moon]];
const groups=[['Beauty',['strength','smoothing','tone']],['Light',['brightness','contrast','warmth','sideLight']]];
const same=(a,b)=>CAMERA_APPEARANCE_CONTROLS.every(({key})=>a[key]===(b[key]??0)||(key==='tone'&&a[key]===b[key]));
const isOn=value=>value.strength>0||value.sideLight!==0;
// Beauty & lighting for the whole output, whatever the source is: camera, tab, image, video or the two-source picture.
export default function CameraAppearanceControls({ value, onChange, disabled }) {
  const lastOn=useRef(CAMERA_APPEARANCE_PRESETS.natural);
  if(isOn(value))lastOn.current=value;
  const controls=Object.fromEntries(CAMERA_APPEARANCE_CONTROLS.map(c=>[c.key,c]));
  const on=isOn(value);
  const resetGroup=keys=>onChange({...value,...Object.fromEntries(keys.map(key=>[key,CAMERA_APPEARANCE_PRESETS.off[key]]))});
  return <section className="look-panel" aria-label="Beauty and lighting">
    <div className="look-master">
      <span className="look-state" data-on={on} role="status"><i aria-hidden="true"/>{on?'Look on':'Look off'}</span>
      <button type="button" className="look-switch" role="switch" aria-checked={on} aria-label="Beauty and lighting on or off" disabled={disabled} onClick={()=>onChange(on?{...CAMERA_APPEARANCE_PRESETS.off}:{...lastOn.current})}><i/></button>
    </div>
    <div className="look-presets" role="group" aria-label="Presets">{presets.map(([key,label,Icon])=><button key={key} type="button" disabled={disabled} aria-pressed={same(value,CAMERA_APPEARANCE_PRESETS[key])} onClick={()=>onChange({...CAMERA_APPEARANCE_PRESETS[key]})}><Icon size={14} aria-hidden="true"/>{label}</button>)}</div>
    {groups.map(([title,keys])=><fieldset className="look-group" key={title} disabled={disabled}>
      <legend><span>{title}</span><button type="button" className="look-reset" disabled={disabled||keys.every(key=>value[key]===CAMERA_APPEARANCE_PRESETS.off[key])} onClick={()=>resetGroup(keys)} title={`Reset ${title.toLowerCase()}`} aria-label={`Reset ${title.toLowerCase()}`}><RotateCcw size={12} aria-hidden="true"/></button></legend>
      {keys.map(key=>{const {min,max}=controls[key],p=(value[key]-min)/(max-min)*100;return <label key={key} className="look-row"><span>{labels[key]}</span><input type="range" aria-label={labels[key]} min={min} max={max} step="1" value={value[key]} style={{'--p':`${p}%`}} onChange={event=>onChange({...value,[key]:Number(event.target.value)})} onDoubleClick={()=>onChange({...value,[key]:CAMERA_APPEARANCE_PRESETS.off[key]})}/><output>{value[key]>0&&min<0?'+':''}{value[key]}</output></label>;})}
    </fieldset>)}
    <p className="look-note"><i aria-hidden="true"/>Applied to the whole output, from any source. Double-click a slider to reset it.</p>
  </section>;
}
