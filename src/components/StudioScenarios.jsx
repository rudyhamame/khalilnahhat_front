import {Camera,Image,Film,AudioLines,Mic,Layers} from 'lucide-react';
import {STUDIO_SCENARIOS,scenarioById} from '../lib/studioScenarios';
const ICON={camera:Camera,image:Image,video:Film};
// Scenario picker plus only the inputs that scenario uses: the camera list, the photo, the mixer device. The voice microphone is optional
// everywhere and lives on the MIC channel beside the preview. Videos are chosen in the video player.
export default function StudioScenarios({value,disabled,onScenario,cameras=[],cameraId='',onCamera,mixers=[],mixerId='',onMixer,photoName='',onPhoto,disabledTitle='Close private preview or end live before changing the scenario'}){
  const scenario=scenarioById(value),device=(item,index,kind)=>item.label||`${kind} ${index+1}`;
  return <div className="studio-scenarios">
    <div className="studio-label-row"><h4 className="studio-label">Scenario</h4><small className="studio-scenario-later">Two video sources: coming later</small></div>
    <div className="studio-scenario-grid" role="radiogroup" aria-label="Studio scenario">{STUDIO_SCENARIOS.map(item=>{const Icon=ICON[item.video];return <button key={item.id} type="button" role="radio" aria-checked={value===item.id} disabled={disabled} title={disabled?disabledTitle:item.title} onClick={()=>onScenario(item)}>
      <span className="ss-icon"><Icon size={18} aria-hidden="true"/>{item.mixer&&<AudioLines size={14} aria-hidden="true"/>}</span>
      <strong>{item.title}</strong>
      <ul>{item.parts.map(part=><li key={part} className={part==='Optional mic'?'is-optional':''}>{part}</li>)}</ul>
    </button>;})}</div>
    {scenario&&<div className="studio-scenario-inputs">
      {scenario.video==='camera'&&<div className="ss-block"><h5><Camera size={14} aria-hidden="true"/>Camera</h5>
        {cameras.length?<div className="ss-list" role="radiogroup" aria-label="Camera">{cameras.map((item,index)=><button key={item.deviceId||index} type="button" role="radio" aria-checked={(cameraId||cameras[0].deviceId)===item.deviceId} disabled={disabled} onClick={()=>onCamera(item.deviceId)}>{device(item,index,'Camera')}</button>)}</div>:<p className="studio-help">Allow camera access to list your cameras.</p>}</div>}
      {scenario.video==='image'&&<div className="ss-block"><h5><Image size={14} aria-hidden="true"/>Photo viewer</h5>
        <label className={`ss-file${disabled?' is-disabled':''}`}>{photoName||'Choose a photo'}<input type="file" accept="image/*" hidden disabled={disabled} onChange={event=>{const file=event.target.files?.[0];if(file)onPhoto(file);event.target.value='';}}/></label></div>}
      {scenario.video==='video'&&<div className="ss-block"><h5><Film size={14} aria-hidden="true"/>Video viewer</h5><p className="studio-help">Choose the videos in the video player below. Nothing plays until you press Play.</p></div>}
      {scenario.mixer&&<div className="ss-block"><h5><AudioLines size={14} aria-hidden="true"/>Mixer</h5>
        {mixers.length?<div className="ss-list" role="radiogroup" aria-label="Mixer">{mixers.map((item,index)=><button key={item.deviceId||index} type="button" role="radio" aria-checked={(mixerId||mixers[0].deviceId)===item.deviceId} disabled={disabled} onClick={()=>onMixer(item.deviceId)}>{device(item,index,'Audio device')}</button>)}</div>:<p className="studio-help">Allow microphone access to list your audio devices.</p>}</div>}
      <p className="ss-mic"><Mic size={13} aria-hidden="true"/>Microphone is optional: switch it on with the MIC channel beside the preview.</p>
    </div>}
  </div>;
}
