import {useRef} from 'react';
import {Mic,Monitor,Film,VolumeX} from 'lucide-react';
const OPTIONS=[['mic','Microphone',Mic,'Mic or aux device'],['tab','Tab / window',Monitor,'Sound of a shared tab'],['file','File',Film,'Sound of a media file'],['none','None',VolumeX,'No audio']];
export default function AudioInputPicker({value,videoKind,disabled,onSelect,modes=['mic','tab','file','none'],label='Audio input types',disabledTitle='Close private preview or end live before changing the audio'}){
  const fileInput=useRef(null);
  const current=value==='auto'?'':value; // 'auto' is not a choice the user made: nothing is highlighted
  const choose=mode=>{
    if(disabled)return;
    // A file that is not already the picture needs to be chosen here.
    if(mode==='file'&&videoKind!=='video'){fileInput.current.value='';fileInput.current.click();}
    else onSelect(mode);
  };
  return <div className="studio-source-grid" role="group" aria-label={label}>
    {OPTIONS.filter(([id])=>modes.includes(id)).map(([id,text,Icon,description])=><button key={id} type="button" aria-label={text} aria-pressed={current===id} disabled={disabled} title={disabled?disabledTitle:text} onClick={()=>choose(id)}><Icon size={20} aria-hidden="true"/><span><strong>{text}</strong><small>{description}</small></span><i aria-hidden="true"/></button>)}
    <input ref={fileInput} type="file" accept="audio/*,video/*" hidden onChange={event=>{const file=event.target.files?.[0];if(file&&!disabled)onSelect('file',file);}}/>
  </div>;
}
