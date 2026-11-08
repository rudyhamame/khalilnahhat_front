import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUpRight,Globe2,X} from 'lucide-react';

export default function HeroLanguageDialog({onChoose,onClose}){
 const ref=useRef(null),timer=useRef(null),id=useId();
 const [leaving,setLeaving]=useState(false);
 useEffect(()=>{
  const dialog=ref.current,previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.showModal();
  return()=>{clearTimeout(timer.current);dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 const close=()=>{setLeaving(true);timer.current=setTimeout(onClose,180);};
 const choose=language=>{
  if(leaving)return;
  // Keep the audio play call in this trusted click, before animations/timers.
  onChoose(language);setLeaving(true);timer.current=setTimeout(onClose,180);
 };
 return createPortal(<dialog ref={ref} className="hero-language-dialog" data-leaving={leaving||undefined} aria-labelledby={`hero-language-${id}`} onCancel={event=>{event.preventDefault();close();}}>
  <button type="button" className="hero-language-close" onClick={close} aria-label="Close language selection / إغلاق"><X size={18}/></button>
  <span className="hero-language-symbol"><Globe2 size={25}/></span>
  <p className="hero-language-eyebrow">WELCOME TO ECHO · أهلاً وسهلاً</p>
  <h2 id={`hero-language-${id}`}>Make yourself at home.<br/><span lang="ar" dir="rtl">أهلاً فيكن… اختاروا لغتكن.</span></h2>
  <p className="hero-language-subtitle">Choose your app language.<br/><span lang="ar" dir="rtl">اختاروا لغة التطبيق لنبلّش.</span></p>
  <div className="hero-language-options">
   <button type="button" onClick={()=>choose('ar')} disabled={leaving} lang="ar" dir="rtl"><span><strong>العربية</strong><small>أهلاً وسهلاً فيكن</small></span><ArrowUpRight size={21}/></button>
   <button type="button" onClick={()=>choose('en')} disabled={leaving}><span><strong>English</strong><small>Welcome to Echo</small></span><ArrowUpRight size={21}/></button>
  </div>
 </dialog>,document.body);
}
