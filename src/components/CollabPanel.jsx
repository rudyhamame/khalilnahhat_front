import {useEffect,useRef,useState} from 'react';
import {Square,Columns2,X} from 'lucide-react';
import AdminSelect from './AdminSelect';
import LiveSourcePicker from './LiveSourcePicker';
import AudioInputPicker from './AudioInputPicker';
import {OVERLAY_SIDES,MINI_HEIGHT} from '../lib/collabCompositor';
const Badge=({letter,tone=''})=><b className={`src-badge ${tone}`} aria-hidden="true">{letter}</b>;
// One framed block per source: badge, name, what is set now, then its controls.
export function SourceCard({letter,tone,title,state,children}){
  return <section className="source-card" aria-label={title}><header><Badge letter={letter} tone={tone}/><h4>{title}</h4>{state&&<span className="source-state">{state}</span>}</header>{children}</section>;
}
// A tiny diagram of the collab picture: gold is the landscape source, grey is the portrait window, full height on one edge.
export function OverlayGlyph({side='right'}){
  const mini=side.startsWith('mini'),h=mini?14*MINI_HEIGHT:14,w=mini?h*9/16:28/3,x=side==='left'||side==='mini-bl'?(mini?3:2):(mini?29-w:30-w),y=mini?16-h-1:2;
  return <svg className="layout-glyph is-landscape" viewBox="0 0 32 18" aria-hidden="true"><rect x=".5" y=".5" width="31" height="17" rx="2" fill="none" stroke="#ffffff30"/><rect x="2" y="2" width="28" height="14" rx="1.5" fill="#b99a67"/><rect x={x} y={y} width={w} height={h} rx="1" fill="#8d9893" stroke="#1b1c1f" strokeWidth=".6"/></svg>;
}
const Seg=({value,onChange,disabled,label,items})=><div className="seg" role="group" aria-label={label} style={{gridTemplateColumns:`repeat(${Math.min(items.length,2)},minmax(0,1fr))`}}>{items.map(([id,title,hint,Icon])=><button key={id} type="button" disabled={disabled} aria-pressed={value===id} onClick={()=>onChange(id)}>{Icon&&<Icon size={16} aria-hidden="true"/>}<span><strong>{title}</strong>{hint&&<small>{hint}</small>}</span></button>)}</div>;
// Source B, the combined landscape, and which source feeds each output. State lives in useCollabOutputs.
import {OUTPUT_FORMATS} from '../lib/outputFormat';
// The first decision: how many sources this live uses; with one source, which outputs it sends.
export function SourceCountChoice({count,onChange,locked,format,onFormat}){
  return <div className="studio-block"><h4 className="studio-label">Sources</h4>
    <Seg label="Number of sources" disabled={locked} value={String(count)} onChange={id=>onChange(Number(id))} items={[['1','One source','Camera, tab, file',Square],['2','Two sources','Landscape + portrait overlay',Columns2]]}/>
    {count===1&&<label className="studio-inputs collab-format"><span className="studio-label">Send</span><AdminSelect aria-label="Output format" disabled={locked} value={format} onChange={event=>onFormat(event.target.value)}>{OUTPUT_FORMATS.map(([id,text])=><option key={id} value={id}>{text}</option>)}</AdminSelect></label>}
  </div>;
}
export default function CollabPanel({collab,second,cameras=[],locked=false,onAudioChange}){
  const [deviceId,setDeviceId]=useState('');
  const label=id=>cameras.find(device=>device.deviceId===id)?.label||'Camera';
  return <div className="collab" aria-label="Second source and collab">
    <SourceCard letter="P" tone="is-portrait" title="Portrait Source" state={second.busy?'Opening…':second.stream?(second.label||second.kind):'Not set'}>
      <h4 className="studio-label">Video input</h4>
      <LiveSourcePicker label="Portrait source types" disabled={locked||second.busy} disabledTitle="The portrait source cannot change while you are live" value={second.kind}
        onSelect={(kind,file)=>{if(kind==='camera')void second.start('camera',{deviceId,label:label(deviceId)});else if(kind==='display')void second.start('display',{label:'Shared tab or window'});else void second.start(kind,{file});}}/>
      {(second.kind==='camera'||(!second.kind&&cameras.length>0))&&<label className="studio-inputs source-field"><span className="studio-label">Camera device</span><AdminSelect aria-label="Camera for the portrait source" disabled={locked||second.busy} value={deviceId} onChange={event=>{setDeviceId(event.target.value);if(second.kind==='camera')void second.start('camera',{deviceId:event.target.value,label:label(event.target.value)});}}><option value="">Default camera</option>{cameras.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||`Camera ${index+1}`}</option>)}</AdminSelect></label>}
      <h4 className="studio-label">Audio input</h4>
      <AudioInputPicker modes={['tab','file','none']} value={second.audioMode} videoKind={second.kind} disabled={locked||second.busy} disabledTitle="The portrait sound cannot change while you are live" onSelect={(mode,file)=>{void second.chooseAudio(mode,{file}).then(()=>onAudioChange?.());}}/>
      {second.audioError&&<p className="studio-help is-warning" role="status">{second.audioError}</p>}
      {second.error&&<p className="studio-help is-warning" role="status">{second.error}</p>}
      {second.kind==='camera'&&<p className="studio-help">The browser often cannot open the same camera twice. Pick a different camera than the landscape source.</p>}
      {second.stream&&!locked&&<button type="button" className="admin-live-control source-close" onClick={second.stop}><X size={14} aria-hidden="true"/>Close the portrait source</button>}
    </SourceCard>
    <section className="source-card" aria-label="Portrait overlay"><header><h4>Portrait overlay</h4><span className="source-state">16:9 output</span></header>
      <div className="layout-tiles" role="group" aria-label="Portrait overlay position">{OVERLAY_SIDES.map(([id,text])=><button key={id} type="button" aria-pressed={collab.side===id} onClick={()=>collab.setSide(id)}><span className="layout-glyphs"><OverlayGlyph side={id}/></span><span>{text}</span></button>)}</div>
      <p className="studio-help">The output is always one 16:9 picture. The portrait source overlays one third of the picture edge to edge, or sits minimized in a bottom corner.</p>
      {collab.issue&&<p className="studio-help is-warning" role="status">{collab.issue}</p>}
    </section>
  </div>;
}
// Sits over the landscape preview while Landscape = Collab, so the window shows what is actually sent.
export function CollabLandscapeOverlay({stream}){
  const ref=useRef(null);
  useEffect(()=>{const element=ref.current;if(!element)return undefined;element.srcObject=stream;void element.play().catch(()=>{});return()=>{element.srcObject=null;};},[stream]);
  return <video ref={ref} className="collab-landscape-overlay" autoPlay playsInline muted aria-label="Collab landscape output"/>;
}
