import {useRef} from 'react';
import {Camera,Monitor,Image,Film} from 'lucide-react';

const SOURCES=[['camera','Camera',Camera],['display','Tab / window',Monitor],['image','Image',Image],['video','Video',Film]];
export default function LiveSourcePicker({value,disabled,onSelect}) {
 const fileInput=useRef(null),fileKind=useRef(null);
 const choose=kind=>{
  if(disabled)return;
  if(kind==='image'||kind==='video'){
   fileKind.current=kind;fileInput.current.accept=kind+'/*';fileInput.current.value='';fileInput.current.click();
  }else onSelect(kind);
 };
 return <div className="studio-source-grid" role="group" aria-label="Live source types">
  {SOURCES.map(([kind,label,Icon])=><button key={kind} type="button" aria-label={label} aria-pressed={value===kind} disabled={disabled} title={disabled?'Close private preview or end live before changing the source':label} onClick={()=>choose(kind)}><Icon size={18} aria-hidden="true"/><span>{label}</span></button>)}
  <input ref={fileInput} type="file" hidden onChange={event=>{const file=event.target.files?.[0];if(file&&!disabled)onSelect(fileKind.current,file);}}/>
 </div>;
}
