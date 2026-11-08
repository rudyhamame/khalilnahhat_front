import {useEffect,useId,useRef,useState} from 'react';
import {Layers,Camera,Monitor,Image,Film} from 'lucide-react';

const SOURCES=[['camera','Camera',Camera],['display','Tab / window',Monitor],['image','Image',Image],['video','Video',Film]];

export default function LiveSourcePicker({value,disabled,onSelect}) {
 const [open,setOpen]=useState(false),id=useId();
 const root=useRef(null),trigger=useRef(null),fileInput=useRef(null),fileKind=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const dismiss=event=>{if(!root.current?.contains(event.target))setOpen(false);};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[open]);
 const choose=kind=>{
  if(disabled)return;
  if(kind==='image'||kind==='video'){
   fileKind.current=kind;fileInput.current.accept=kind+'/*';fileInput.current.value='';fileInput.current.click();
  }else{onSelect(kind);setOpen(false);trigger.current?.focus();}
 };
 return <div className="studio-source-picker" ref={root}>
  <button ref={trigger} type="button" className="admin-live-fullscreen studio-source-toggle" aria-label="Sources" title="Sources" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Layers size={18} aria-hidden="true"/></button>
  <div id={id} className="studio-source-options" data-open={open} aria-hidden={!open} inert={!open} role="group" aria-label="Live source types">
   {SOURCES.map(([kind,label,Icon])=><button key={kind} type="button" aria-label={label} aria-pressed={value===kind} disabled={disabled} title={disabled?'Close private preview or end live before changing the source':label} onClick={()=>choose(kind)}><Icon size={19} aria-hidden="true"/><span>{label}</span></button>)}
  </div>
  <input ref={fileInput} type="file" hidden onChange={event=>{const file=event.target.files?.[0];if(!file||disabled)return;onSelect(fileKind.current,file);setOpen(false);trigger.current?.focus();}}/>
 </div>;
}
