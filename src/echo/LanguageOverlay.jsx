import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import './heroIntroductionAudio.css';

const LANGUAGE_CHOSEN_KEY='echo-lang-chosen';

// The same Echo / إيكو chooser as the entry screen, laid over whatever page is open. Choosing only switches the app language;
// the page, its scroll position and its state stay as they are.
export default function LanguageOverlay({current,onChoose,onClose}){
 const dialog=useRef(null);
 useEffect(()=>{
  const node=dialog.current,previous=document.activeElement;
  node.showModal();
  node.querySelector(`button[lang="${current}"]`)?.focus({preventScroll:true});
  return()=>{if(node.open)node.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);// eslint-disable-line react-hooks/exhaustive-deps
 const choose=language=>{try{localStorage.setItem(LANGUAGE_CHOSEN_KEY,language);}catch{/* Storage unavailable */}onChoose(language);onClose();};
 return createPortal(<dialog ref={dialog} className="hero-language-modal hero-language-overlay" aria-label="Choose your language / اختار لغتك"
   onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===dialog.current)onClose();}}>
  <button type="button" className="hero-language-overlay-close" onClick={onClose} aria-label="Close / إغلاق"><X size={22}/></button>
  <div className="hero-language-modal-content">
   <div className="hero-language-modal-logos" aria-label="DJ Khalil Nahhat — Echo Event Entertainment">
    <img src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90"/>
    <img src="/echo/echo-event-entertainment-white-original.png" alt="Echo Event Entertainment" width="1392" height="1130"/>
   </div>
   <div className="hero-language-entry" role="group" aria-label="Choose your language / اختار لغتك" dir="ltr">
    <button type="button" lang="en" aria-pressed={current==='en'} onClick={()=>choose('en')}><span className="hero-language-entry-title">Echo</span><span className="hero-language-entry-subtitle">in English</span></button>
    <button type="button" lang="ar" dir="rtl" aria-pressed={current==='ar'} onClick={()=>choose('ar')}><span className="hero-language-entry-title">إيكو</span><span className="hero-language-entry-subtitle">بالعربية</span></button>
   </div>
  </div>
 </dialog>,document.body);
}
