import {useEffect,useRef,useState} from 'react';
import {Archive,AudioLines,ChevronDown,Download,Layers} from 'lucide-react';
import './recordingDownloadMenu.css';

const LABELS={vocals:'Vocals',drums:'Drums',bass:'Bass',other:'Other'};
const HUES={vocals:330,drums:35,bass:210,other:150};
// Download ▾  →  1. Channel-merged audio · 2. Channel-split audio (2.1 All channels, then each channel).
export default function RecordingDownloadMenu({busy,disabled,channels=[],mergedInfo='',onMerged,onChannel}){
 const [open,setOpen]=useState(false),root=useRef(null);
 useEffect(()=>{
  if(!open)return undefined;
  const away=event=>{if(!root.current?.contains(event.target))setOpen(false);},key=event=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('pointerdown',away);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',key);};
 },[open]);
 const run=action=>{setOpen(false);action();};
 const split=channels.length>0;
 return <div className="recording-download" ref={root}>
  <button type="button" className="ontology-page-download" aria-haspopup="menu" aria-expanded={open} disabled={disabled||busy} onClick={()=>setOpen(value=>!value)}><Download size={14} aria-hidden="true"/><span>{busy?'Preparing…':'Download'}</span><ChevronDown size={13} aria-hidden="true" className="rd-chevron"/></button>
  {open&&<div className="recording-download-menu" role="menu">
   <p className="rd-label">Channel-merged audio</p>
   <button type="button" role="menuitem" className="rd-item" onClick={()=>run(onMerged)}><span className="rd-icon" aria-hidden="true"><AudioLines size={17}/></span><span className="rd-text"><strong>Full mix</strong><small>All channels together</small></span>{mergedInfo&&<em className="rd-meta">{mergedInfo}</em>}</button>
   <p className="rd-label">Channel-split audio{split&&<span>{channels.length}</span>}</p>
   {split?<>
    <button type="button" role="menuitem" className="rd-item" onClick={()=>run(()=>onChannel('all'))}><span className="rd-icon" aria-hidden="true"><Archive size={17}/></span><span className="rd-text"><strong>All channels</strong><small>One ZIP with every channel</small></span><em className="rd-meta">ZIP · FLAC</em></button>
    {channels.map(name=><button key={name} type="button" role="menuitem" className="rd-item rd-channel" style={{'--lane':`hsl(${HUES[name]} 55% 60%)`}} onClick={()=>run(()=>onChannel(name))}><span className="rd-icon" aria-hidden="true"><i/></span><span className="rd-text"><strong>{LABELS[name]||name}</strong></span><em className="rd-meta">FLAC</em></button>)}
   </>:<div className="rd-empty"><span className="rd-icon" aria-hidden="true"><Layers size={17}/></span><p>Split the channels first with the layers button on the waveform, then download them here.</p></div>}
  </div>}
 </div>;
}
