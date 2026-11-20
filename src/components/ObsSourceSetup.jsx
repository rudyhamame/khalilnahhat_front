import {Camera,AudioLines,Check} from 'lucide-react';
import './studioScenarioInputs.css';
const OBS=/obs|virtual/i;
// A device name without the vendor/product id the browser appends, e.g. "HP IR Camera (04f2:b6d0)" -> "HP IR Camera" + "04f2:b6d0".
const describe=(item,index,kind)=>{const raw=item.label||`${kind} ${index+1}`,match=raw.match(/^(.*?)\s*\(([0-9a-f]{4}:[0-9a-f]{4})\)\s*$/i);return {name:(match?match[1]:raw).replace(/^Default\s*-\s*/i,''),detail:item.deviceId==='default'||/^default\b/i.test(raw)?'System default':match?match[2]:''};};
function DeviceList({label,kind,Icon,devices,selected,disabled,onPick}){
  // 'none' = this window has no device (its device was given to the other window).
  const current=devices.some(item=>item.deviceId===selected)?selected:null;
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
      <span className="ss-device-text"><strong>{info.name}</strong>{info.detail&&<small>{info.detail}</small>}{OBS.test(info.name)&&<small className="ss-device-used">OBS Virtual Camera · recommended</small>}</span>
      <span className="ss-device-state" aria-hidden="true">{on?<><b>Selected</b><Check size={14}/></>:<i/>}</span>
    </button>;})}</div>;
}
// The Studio has one source: OBS. The camera is the OBS Virtual Camera (OBS composes one or two cameras); the audio input is optional because the voice microphone has its own channel.
export default function ObsSourceSetup({disabled,cameras=[],cameraId='',onCamera,mixers=[],mixerId='',onMixer}){
  const hasObs=cameras.some(item=>OBS.test(item.label||''));
  return <div className="studio-scenario-inputs" aria-label="Source setup" aria-disabled={disabled}>
    <header className="ss-setup-heading"><div><span className="ss-eyebrow">SOURCE</span><h4>OBS</h4></div><span className={`ss-setup-status${disabled?' is-locked':''}`}>{disabled?'Controls locked':hasObs?'OBS Virtual Camera found':'Start OBS Virtual Camera'}</span></header>
    <div className="ss-input-grid">
      <InputCard Icon={Camera} title="OBS Virtual Camera" category="VIDEO · PICTURE FROM OBS" count={cameras.length}>
        {!hasObs&&<p className="ss-input-hint">Start OBS, click Start Virtual Camera, then reload this page so the camera appears here. OBS composes one or two cameras and records the live.</p>}
        {cameras.length?<DeviceList label="Camera" kind="Camera" Icon={Camera} devices={cameras} selected={cameraId} disabled={disabled} onPick={onCamera}/>:<div className="ss-input-empty"><Camera size={22}/><strong>No cameras available</strong><p>Allow camera access to see your devices here.</p></div>}
      </InputCard>
      <InputCard Icon={AudioLines} title="Audio input" category="AUDIO · MIXER OR INTERFACE (OPTIONAL)" count={mixers.length}>
        <DeviceList label="Audio input" kind="Audio device" Icon={AudioLines} devices={[{deviceId:'',label:'No audio input · voice MIC only'},...mixers]} selected={mixerId} disabled={disabled} onPick={onMixer}/>
      </InputCard>
    </div>
  </div>;
}
function InputCard({Icon,title,category,count,children,className=''}){
 return <section className={`ss-input-card${className?' '+className:''}`}><header className="ss-input-card-heading"><span className="ss-input-card-icon"><Icon size={18} aria-hidden="true"/></span><div><span className="ss-eyebrow">{category}</span><h5>{title}</h5></div>{count!==undefined&&<span className="ss-device-count">{count} found</span>}</header><div className="ss-input-card-body">{children}</div></section>;
}
