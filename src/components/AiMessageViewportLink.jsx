import {aiMessageViewport} from '../lib/aiMessageViewport';
import {APP_VIEWPORT_TARGETS,scrollToAppSection,scrollToBookingField} from '../lib/bookingViewport';
import {ArrowUpRight} from 'lucide-react';
import './aiMessageViewportLink.css';

export default function AiMessageViewportLink({message,ar=false}){
 const target=aiMessageViewport(message,ar);
 if(!target)return null;
 return <footer className="ai-message-viewport-footer"><a href={target.href} onClick={event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!document.querySelector(APP_VIEWPORT_TARGETS[target.section]))return;
  event.preventDefault();
  if(target.fieldPath)scrollToBookingField(target.fieldPath,{source:'assistant-link'});
  else{
   if(target.section==='booking')window.dispatchEvent(new CustomEvent('echo:booking-form-show'));
   scrollToAppSection(target.section,{source:'assistant-link',face:target.face});
  }
 }}>{target.label}<ArrowUpRight size={12} aria-hidden="true"/></a></footer>;
}
