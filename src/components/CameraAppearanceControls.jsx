import { Sun, X, ChevronDown, Sparkles, Moon, Power, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { CAMERA_APPEARANCE_CONTROLS, CAMERA_APPEARANCE_PRESETS } from '../lib/cameraAppearance';

const labels={strength:'Strength',smoothing:'Smoothing',brightness:'Exposure',contrast:'Contrast',warmth:'Warmth',tone:'Tone',sideLight:'Side light'};
const backgrounds=[['off','Off'],['blur','Blur'],['color','Colour'],['image','Image']];
const pickBackground=v=>({background:v.background,bgBlur:v.bgBlur,bgColor:v.bgColor,bgImage:v.bgImage,bgQuality:v.bgQuality});
const presets=[['off','Off',Power],['natural','Natural',Sparkles],['lowLight','Low light',Moon]];
const groups=[['Beauty',['strength','smoothing','tone']],['Lighting',['brightness','contrast','warmth','sideLight']]];
const same=(a,b)=>CAMERA_APPEARANCE_CONTROLS.every(({key})=>a[key]===(b[key]??0)||(key==='tone'&&a[key]===b[key]));
export default function CameraAppearanceControls({ value, onChange, disabled, onClose }) {
  const file=useRef(null);
  const set=patch=>onChange({...value,...patch});
  const controls=Object.fromEntries(CAMERA_APPEARANCE_CONTROLS.map(c=>[c.key,c]));
  return <section className="studio-appearance" aria-label="Camera beauty and lighting">
    <header><div className="studio-look-title"><Sun size={15} aria-hidden="true"/><div><h3>Beauty & lighting</h3><span><i className="studio-look-state" data-on={value.strength>0}/>{value.strength?'Live look on':'Live look off'}</span></div></div>{onClose&&<button type="button" className="studio-look-close" onClick={onClose} aria-label="Close beauty and lighting"><X size={15} aria-hidden="true"/></button>}</header>
    <div className="studio-appearance-presets" role="group" aria-label="Presets">{presets.map(([key,label,Icon])=><button key={key} type="button" disabled={disabled} aria-pressed={same(value,CAMERA_APPEARANCE_PRESETS[key])} onClick={()=>onChange({...CAMERA_APPEARANCE_PRESETS[key],...pickBackground(value)})}><Icon size={14} aria-hidden="true"/>{label}</button>)}</div>
    <div className="studio-look-group studio-look-background"><p>Background · AI cut-out</p>
      <div className="studio-bg-modes" role="group" aria-label="Background">{backgrounds.map(([key,label])=><button key={key} type="button" disabled={disabled} aria-pressed={value.background===key} onClick={()=>key==='image'&&!value.bgImage?file.current?.click():set({background:key})}>{label}</button>)}</div>
      {value.background==='blur'&&<label><span>Blur<output>{value.bgBlur}%</output></span><input type="range" aria-label="Background blur" min="0" max="100" step="1" disabled={disabled} value={value.bgBlur} style={{'--p':`${value.bgBlur}%`}} onChange={event=>set({bgBlur:Number(event.target.value)})}/></label>}
      {value.background==='color'&&<label className="studio-bg-row"><span>Colour</span><input type="color" aria-label="Background colour" disabled={disabled} value={value.bgColor} onChange={event=>set({bgColor:event.target.value})}/></label>}
      {value.background==='image'&&<button type="button" className="studio-bg-pick" disabled={disabled} onClick={()=>file.current?.click()}>{value.bgImage?'Change image':'Choose image'}</button>}
      <input ref={file} type="file" accept="image/*" hidden onChange={event=>{const f=event.target.files?.[0];event.target.value='';if(f)set({background:'image',bgImage:URL.createObjectURL(f)});}}/>
      {value.background!=='off'&&<div className="studio-bg-modes" role="group" aria-label="Edge quality">{[['fast','Fast edges'],['high','HD edges']].map(([key,label])=><button key={key} type="button" disabled={disabled} aria-pressed={value.bgQuality===key} title={key==='high'?'AI portrait matting for fine hair detail. Needs a capable GPU; falls back to Fast if too slow.':'Lightweight cut-out'} onClick={()=>set({bgQuality:key})}>{label}</button>)}</div>}
      {value.background!=='off'&&<small className="studio-bg-note">Runs in your browser (free). Needs a capable GPU.</small>}
    </div>
    <fieldset disabled={disabled}><legend className="sr-only">Camera appearance adjustments</legend>{groups.map(([title,keys])=><div className="studio-look-group" key={title}><p>{title}</p>{keys.map(key=>{const {label,min,max}=controls[key];const p=(value[key]-min)/(max-min)*100;return <label key={key}><span>{labels[key]}<output>{value[key]>0&&min<0?'+':''}{value[key]}{key==='strength'?'%':''}</output></span><input type="range" aria-label={label} min={min} max={max} step="1" value={value[key]} style={{'--p':`${p}%`,'--z':`${(0-min)/(max-min)*100}%`}} onChange={event=>onChange({...value,[key]:Number(event.target.value)})}/></label>;})}</div>)}</fieldset>
    <footer><span><span className="studio-look-output-dot" aria-hidden="true"/>Preview + outgoing video</span><button type="button" disabled={disabled||same(value,CAMERA_APPEARANCE_PRESETS.off)} onClick={()=>onChange({...CAMERA_APPEARANCE_PRESETS.off,...pickBackground(value)})}><RotateCcw size={11} aria-hidden="true"/>Reset</button></footer>
    <details className="studio-look-help"><summary>About these controls<ChevronDown size={12} aria-hidden="true"/></summary><p>Whole-image softening and colour correction; no face reshaping or tracking. Exposure cannot recover lost camera detail. Strength 0 turns effects off. The embedded logo stays readable when mirrored. Keep this tab visible and check performance with effects enabled.</p></details>
  </section>;
}
