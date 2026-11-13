import {Camera,Image,Images,Upload,Film,AudioLines,Mic,Check} from 'lucide-react';
import {STUDIO_SCENARIOS,scenarioById} from '../lib/studioScenarios';
const ICON={camera:Camera,image:Image,video:Film};
// Scenario picker plus only the inputs that scenario uses: the camera list, the photo, the mixer device. The voice microphone is optional
// everywhere and lives on the MIC channel beside the preview. Videos are chosen in the video player.
// A device name without the vendor/product id the browser appends, e.g. "HP IR Camera (04f2:b6d0)" -> "HP IR Camera" + "04f2:b6d0".
const describe=(item,index,kind)=>{const raw=item.label||`${kind} ${index+1}`,match=raw.match(/^(.*?)\s*\(([0-9a-f]{4}:[0-9a-f]{4})\)\s*$/i);return {name:(match?match[1]:raw).replace(/^Default\s*-\s*/i,''),detail:item.deviceId==='default'||/^default\b/i.test(raw)?'System default':match?match[2]:''};};
function DeviceList({label,kind,Icon,devices,selected,disabled,onPick}){
  const current=selected||devices[0]?.deviceId;
  return <div className="ss-devices" role="radiogroup" aria-label={label}>{devices.map((item,index)=>{const info=describe(item,index,kind),on=current===item.deviceId;
    return <button key={item.deviceId||index} type="button" role="radio" aria-checked={on} disabled={disabled} title={info.name} onClick={()=>onPick(item.deviceId)}>
      <span className="ss-device-icon"><Icon size={17} aria-hidden="true"/></span>
      <span className="ss-device-text"><strong>{info.name}</strong>{info.detail&&<small>{info.detail}</small>}</span>
      <span className="ss-device-state" aria-hidden="true">{on?<><b>Selected</b><Check size={14}/></>:<i/>}</span>
    </button>;})}</div>;
}
export default function StudioScenarios({value,disabled,onScenario,cameras=[],cameraId='',onCamera,mixers=[],mixerId='',onMixer,photoName='',onPhoto,onGallery,disabledTitle='Close private preview or end live before changing the scenario'}){
  const scenario=scenarioById(value);
  return <div className="studio-scenarios">
    <div className="studio-label-row"><h4 className="studio-label">Scenario</h4><small className="studio-scenario-later">Two video sources: coming later</small></div>
    <div className="studio-scenario-grid" role="radiogroup" aria-label="Studio scenario">{STUDIO_SCENARIOS.map(item=>{const Icon=ICON[item.video];return <button key={item.id} type="button" role="radio" aria-checked={value===item.id} disabled={disabled} title={disabled?disabledTitle:value===item.id?`${item.title}: click again to deselect and turn the preview off`:item.title} onClick={()=>onScenario(item)}>
      {value===item.id&&<span className="ss-picked" aria-hidden="true"><Check size={12}/>Selected</span>}
      <span className="ss-icon"><Icon size={18} aria-hidden="true"/>{item.mixer&&<AudioLines size={14} aria-hidden="true"/>}</span>
      <strong>{item.title}</strong>
      <ul>{item.parts.map(part=><li key={part} className={part==='Optional mic'?'is-optional':''}>{part}</li>)}</ul>
    </button>;})}</div>
    {scenario&&<div className="studio-scenario-inputs">
      {scenario.video==='camera'&&<div className="ss-block"><h5><Camera size={14} aria-hidden="true"/>Camera<em>{cameras.length?`${cameras.length} found`:''}</em></h5>
        {cameras.length?<DeviceList label="Camera" kind="Camera" Icon={Camera} devices={cameras} selected={cameraId} disabled={disabled} onPick={onCamera}/>:<p className="studio-help">Allow camera access to list your cameras.</p>}</div>}
      {scenario.video==='image'&&<div className="ss-block"><h5><Image size={14} aria-hidden="true"/>Photo viewer{photoName&&<em>{photoName}</em>}</h5>
        <div className="ss-photo-sources"><button type="button" disabled={disabled} onClick={onGallery}><Images size={15} aria-hidden="true"/><span><strong>Gallery</strong><small>Photos from your site gallery</small></span></button>
        <label className={disabled?'is-disabled':''}><Upload size={15} aria-hidden="true"/><span><strong>From this device</strong><small>Choose an image file</small></span><input type="file" accept="image/*" hidden disabled={disabled} onChange={event=>{const file=event.target.files?.[0];if(file)onPhoto(file);event.target.value='';}}/></label></div></div>}
      {scenario.video==='video'&&<div className="ss-block"><h5><Film size={14} aria-hidden="true"/>Video viewer</h5><p className="studio-help">Choose the videos in the video player below. Nothing plays until you press Play.</p></div>}
      {scenario.mixer&&<div className="ss-block"><h5><AudioLines size={14} aria-hidden="true"/>Mixer<em>{mixers.length?`${mixers.length} found`:''}</em></h5>
        {mixers.length?<DeviceList label="Mixer" kind="Audio device" Icon={AudioLines} devices={mixers} selected={mixerId} disabled={disabled} onPick={onMixer}/>:<p className="studio-help">Allow microphone access to list your audio devices.</p>}</div>}
      <p className="ss-mic"><Mic size={13} aria-hidden="true"/>Microphone is optional: switch it on with the MIC channel beside the preview.</p>
    </div>}
  </div>;
}
