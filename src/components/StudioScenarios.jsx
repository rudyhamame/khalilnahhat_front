import {useEffect,useState} from 'react';
import {Camera,Image,Images,Upload,Film,AudioLines,Mic,Check,PictureInPicture2,Crop} from 'lucide-react';
import StudioOverlayEditor from './StudioOverlayEditor';
import {CropStage} from './PausePhotoPicker';
import {DEFAULT_CROP} from '../lib/pausePhoto';
import {STUDIO_SCENARIOS,scenarioById} from '../lib/studioScenarios';
import './studioScenarioInputs.css';
const ICON={camera:Camera,cameras:PictureInPicture2,image:Image,video:Film};
// Scenario picker plus only the inputs that scenario uses: the camera list, the photo, the mixer device. The voice microphone is optional
// everywhere and lives on the MIC channel beside the preview. Videos are chosen in the video player.
// A device name without the vendor/product id the browser appends, e.g. "HP IR Camera (04f2:b6d0)" -> "HP IR Camera" + "04f2:b6d0".
const describe=(item,index,kind)=>{const raw=item.label||`${kind} ${index+1}`,match=raw.match(/^(.*?)\s*\(([0-9a-f]{4}:[0-9a-f]{4})\)\s*$/i);return {name:(match?match[1]:raw).replace(/^Default\s*-\s*/i,''),detail:item.deviceId==='default'||/^default\b/i.test(raw)?'System default':match?match[2]:''};};
function DeviceList({label,kind,Icon,devices,selected,disabled,onPick}){
  const current=devices.some(item=>item.deviceId===selected)?selected:devices[0]?.deviceId;
  const navigate=event=>{
    if(disabled)return;
    const buttons=[...event.currentTarget.querySelectorAll('[role=radio]')],index=buttons.indexOf(document.activeElement);
    let next;
    if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%buttons.length;
    else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index-1+buttons.length)%buttons.length;
    else return;
    event.preventDefault();buttons[next]?.focus();buttons[next]?.click();
  };
  return <div className="ss-devices" role="radiogroup" aria-label={label} onKeyDown={navigate}>{devices.map((item,index)=>{const info=describe(item,index,kind),on=current===item.deviceId;
    return <button key={item.deviceId||index} type="button" role="radio" aria-checked={on} tabIndex={on?0:-1} disabled={disabled} title={info.name} onClick={()=>onPick(item.deviceId)}>
      <span className="ss-device-icon"><Icon size={17} aria-hidden="true"/></span>
      <span className="ss-device-text"><strong>{info.name}</strong>{info.detail&&<small>{info.detail}</small>}</span>
      <span className="ss-device-state" aria-hidden="true">{on?<><b>Selected</b><Check size={14}/></>:<i/>}</span>
    </button>;})}</div>;
}
// Photo viewer: one framed 16:9 stage. Empty = pick a photo; with a photo = position it exactly like the pause screen
// (mouse or touch only: drag to pan, wheel or pinch to zoom, magnet grid snaps to the thirds and centre).
function PhotoViewer({file,name,crop,onCrop,disabled,onGallery,onPhoto}){
  const [url,setUrl]=useState('');
  useEffect(()=>{if(!file){setUrl('');return undefined;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
  const sources=<>
    <button type="button" disabled={disabled} onClick={onGallery}><Images size={16} aria-hidden="true"/><span>Gallery</span></button>
    <label className={disabled?'is-disabled':''}><Upload size={16} aria-hidden="true"/><span>This device</span><input type="file" aria-label="Choose a photo from this device" accept="image/*" disabled={disabled} onChange={event=>{const picked=event.target.files?.[0];if(picked)onPhoto(picked);event.target.value='';}}/></label></>;
  return <div className="ss-pv">
    <div className="ss-pv-head"><Image size={14} aria-hidden="true"/><strong>Photo viewer</strong>{name&&<em title={name}>{name}</em>}</div>
    <div className="ss-pv-stage" inert={disabled?true:undefined}>
      {url?<CropStage item={{mediaUrl:url}} crop={crop} onCrop={onCrop} message={null} tool="crop" onMessage={()=>{}} grid/>
        :<div className="ss-pv-empty"><span className="ss-photo-placeholder"><Image size={28} strokeWidth={1.2} aria-hidden="true"/></span><strong>Your photo on air</strong><p>Choose an image, then adjust its framing.</p><div className="ss-pv-sources">{sources}</div></div>}
    </div>
    {url&&<>
      <div className="ss-pv-foot"><span>Drag to pan · scroll or pinch to zoom · double-click to reset</span><div className="ss-pv-sources is-small">{sources}</div></div>
    </>}
  </div>;
}
export default function StudioScenarios({value,disabled,onScenario,cameras=[],cameraId='',onCamera,overlayCameraId='',onOverlayCamera=()=>{},overlay,onOverlay=()=>{},getOverlayVideo,previewing=false,mixers=[],mixerId='',onMixer,photoName='',photoView=DEFAULT_CROP,onPhotoView=()=>{},photoFile=null,onPhoto,onGallery,disabledTitle='Close private preview or end live before changing the scenario'}){
  const scenario=scenarioById(value);
  return <div className="studio-scenarios">
    <div className="studio-label-row"><h4 className="studio-label">Scenario</h4></div>
    <div className="studio-scenario-grid" role="radiogroup" aria-label="Studio scenario">{STUDIO_SCENARIOS.map(item=>{const Icon=ICON[item.video];return <button key={item.id} type="button" role="radio" aria-checked={value===item.id} disabled={disabled} title={disabled?disabledTitle:value===item.id?`${item.title}: click again to deselect and turn the preview off`:item.title} onClick={()=>onScenario(item)}>
      {value===item.id&&<span className="ss-picked" aria-hidden="true"><Check size={12}/>Selected</span>}
      <span className="ss-icon"><Icon size={18} aria-hidden="true"/>{(item.mixer||item.audioFile)&&<AudioLines size={14} aria-hidden="true"/>}</span>
      <strong>{item.title}</strong>
      <ul>{item.parts.map(part=><li key={part} className={part==='Optional mic'?'is-optional':''}>{part}</li>)}</ul>
    </button>;})}</div>
    {scenario&&<div className="studio-scenario-inputs" aria-label="Scenario inputs" aria-disabled={disabled}>
      <header className="ss-setup-heading"><div><span className="ss-eyebrow">INPUT SETUP</span><h4>{scenario.title}</h4></div><span className={`ss-setup-status${disabled?' is-locked':''}`}>{disabled?'Controls locked':'Configure sources'}</span></header>
      <div className="ss-input-grid">
        {scenario.video==='cameras'&&<>
          <InputCard Icon={Camera} title="Camera 1 · landscape" category="MAIN PICTURE · FILLS THE 16:9 FRAME" count={cameras.length}>
            {cameras.length?<DeviceList label="Camera 1" kind="Camera" Icon={Camera} devices={cameras.filter(item=>item.deviceId!==overlayCameraId)} selected={cameraId} disabled={disabled} onPick={onCamera}/>:<div className="ss-input-empty"><Camera size={22}/><strong>No cameras available</strong><p>Allow camera access to see your devices here.</p></div>}
          </InputCard>
          <InputCard Icon={PictureInPicture2} title="Camera 2 · overlay" category="OVERLAY · CUT AS YOU LIKE" count={cameras.length}>
            {cameras.length>1?<DeviceList label="Camera 2" kind="Camera" Icon={Camera} devices={cameras.filter(item=>item.deviceId!==cameraId)} selected={overlayCameraId} disabled={disabled} onPick={onOverlayCamera}/>:<div className="ss-input-empty"><PictureInPicture2 size={22}/><strong>A second camera is needed</strong><p>Connect another camera, then allow access. Two different cameras are used in this scenario.</p></div>}
          </InputCard>
          {overlay&&<InputCard className="ss-input-card--wide" Icon={Crop} title="Overlay · cut and place" category="OUTPUT 16:9 · CHANGES APPLY LIVE"><StudioOverlayEditor overlay={overlay} onOverlay={onOverlay} getOverlayVideo={getOverlayVideo} previewing={previewing}/></InputCard>}
        </>}
        {scenario.video!=='cameras'&&<InputCard Icon={ICON[scenario.video]} title={scenario.video==='camera'?'Camera':scenario.video==='image'?'Photo':'Video player'} category="VIDEO SOURCE" count={scenario.video==='camera'?cameras.length:undefined}>
          {scenario.video==='camera'&&(cameras.length?<DeviceList label="Camera" kind="Camera" Icon={Camera} devices={cameras} selected={cameraId} disabled={disabled} onPick={onCamera}/>:<div className="ss-input-empty"><Camera size={22}/><strong>No cameras available</strong><p>Allow camera access to see your devices here.</p></div>)}
          {scenario.video==='image'&&<PhotoViewer file={photoFile} name={photoName} crop={photoView} onCrop={onPhotoView} disabled={disabled} onGallery={onGallery} onPhoto={onPhoto}/>}
          {scenario.video==='video'&&<><ol className="ss-source-steps"><li><span>1</span><div><strong>Add your videos</strong><p>Choose files in the video player below.</p></div></li><li><span>2</span><div><strong>Play when you’re ready</strong><p>Playback starts only when you press Play.</p></div></li></ol>{!scenario.mixer&&<p className="ss-source-note"><AudioLines size={14}/>The video’s sound feeds the audio input.</p>}</>}
        </InputCard>}
        {scenario.mixer&&<InputCard Icon={AudioLines} title="Mixer / audio interface" category="AUDIO SOURCE" count={mixers.length}>
          {mixers.length?<DeviceList label="Mixer" kind="Audio device" Icon={AudioLines} devices={mixers} selected={mixerId} disabled={disabled} onPick={onMixer}/>:<div className="ss-input-empty"><AudioLines size={22}/><strong>No audio devices available</strong><p>Allow microphone access to see your mixer or interface.</p></div>}
        </InputCard>}
        {scenario.audioFile&&<InputCard Icon={AudioLines} title="Audio player" category="AUDIO SOURCE"><ol className="ss-source-steps"><li><span>1</span><div><strong>Set your photo</strong><p>Choose an image, then open the preview.</p></div></li><li><span>2</span><div><strong>Add your soundtrack</strong><p>Add audio files in the player below. Press Play to start.</p></div></li></ol></InputCard>}
      </div>
      <footer className="ss-mic"><span className="ss-mic-icon"><Mic size={16} aria-hidden="true"/></span><div><strong>Add your voice</strong><p>Turn on the MIC channel beside the preview whenever you need it.</p></div><span className="ss-optional-badge">Optional</span></footer>
    </div>}
  </div>;
}

function InputCard({Icon,title,category,count,children,className=''}){
 return <section className={`ss-input-card${className?' '+className:''}`}><header className="ss-input-card-heading"><span className="ss-input-card-icon"><Icon size={18} aria-hidden="true"/></span><div><span className="ss-eyebrow">{category}</span><h5>{title}</h5></div>{count!==undefined&&<span className="ss-device-count">{count} found</span>}</header><div className="ss-input-card-body">{children}</div></section>;
}
