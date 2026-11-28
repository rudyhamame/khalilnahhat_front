import {useEffect,useId,useRef,useState} from 'react';
import {Settings2,X} from 'lucide-react';
import MeetingDeviceSettings from './MeetingDeviceSettings';

export default function MeetingDevicePopover(props){
 const [open,setOpen]=useState(false),id=useId(),toggle=useRef(null),panel=useRef(null);
 const label=props.ar?'إعدادات الكاميرا والميكروفون':'Camera and microphone settings';
 const close=()=>{setOpen(false);toggle.current?.focus();};
 useEffect(()=>{
  if(!open)return;
  panel.current?.querySelector('button')?.focus();
  const escape=event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);toggle.current?.focus();}};
  const outside=event=>{if(!panel.current?.contains(event.target)&&!toggle.current?.contains(event.target))setOpen(false);};
  document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};
 },[open]);
 return <div className="meeting-room-device-popover">
  <button ref={toggle} type="button" className="meeting-room-device-toggle" aria-label={label} title={label} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)}><Settings2 size={17} aria-hidden="true"/></button>
  {open&&<div ref={panel} id={id} className="meeting-room-device-overlay" role="group" aria-label={label}>
   <button type="button" className="meeting-room-device-close" aria-label={props.ar?'إغلاق الإعدادات':'Close device settings'} onClick={close}><X size={16} aria-hidden="true"/></button>
   <MeetingDeviceSettings {...props}/>
  </div>}
 </div>;
}
