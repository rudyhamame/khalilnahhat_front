import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Play,Square,ChevronsDown} from 'lucide-react';
import {HEADER_INTRO_LANGUAGE_KEY} from './i18n';
import './heroIntroductionAudio.css';

function LanguageChooser({onChoose}){
 const ref=useRef(null);
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>{if(dialog.open)dialog.close();};},[]);
 return createPortal(<dialog ref={ref} className="hero-language-modal" aria-label="Choose your language / اختار لغتك" onCancel={event=>event.preventDefault()}>
  <div className="hero-language-modal-content">
   <div className="hero-language-modal-logos" aria-label="DJ Khalil Nahhat — Echo Event Entertainment">
    <img src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90"/>
    <img src="/echo/echo-event-entertainment-white-original.png" alt="Echo Event Entertainment" width="1392" height="1130"/>
   </div>
   <div className="hero-language-entry" role="group" aria-label="Choose your language / اختار لغتك" dir="ltr">
    <button type="button" lang="en" onClick={()=>onChoose('en')}><span className="hero-language-entry-title">Echo</span><span className="hero-language-entry-subtitle">in English</span></button>
    <button type="button" lang="ar" dir="rtl" onClick={()=>onChoose('ar')}><span className="hero-language-entry-title">إيكو</span><span className="hero-language-entry-subtitle">بالعربية</span></button>
   </div>
  </div>
 </dialog>,document.body);
}

export default function HeroHeadphoneControls({lang,playing=false,frame=0,onBegin,onLanguageSelect,onLanguageReset,onSkip,onStop,animationReady=true,animationFailed=false,onAnimationRetry}){
 const [chosen,setChosen]=useState(false);
 const root=useRef(null);
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
 useEffect(()=>{window.dispatchEvent(new CustomEvent('echo:hero-language-state',{detail:{selected:chosen}}));},[chosen]);
 useEffect(()=>{
  const reset=()=>{setChosen(false);onLanguageReset?.();root.current?.closest('.hero-introduction')?.scrollIntoView({block:'start',behavior:'instant'});};
  window.addEventListener('echo:hero-language-request',reset);
  return()=>window.removeEventListener('echo:hero-language-request',reset);
 },[onLanguageReset]);
 const choose=language=>{setChosen(true);lang.setLanguage(language);onLanguageSelect?.(language);try{sessionStorage.removeItem(HEADER_INTRO_LANGUAGE_KEY);}catch{/* Storage unavailable */}};
 const button=(label,action,content,disabled=false)=><button type="button" className="hero-intro-launch hero-intro-transport-button" onClick={action} disabled={disabled} aria-label={label} title={label}><span className="hero-intro-launch-face" aria-hidden="true">{content}</span></button>;
 return <div ref={root} className="hero-audio-introduction" data-room-entered={frame>0?'true':'false'}>
  {!chosen&&<LanguageChooser onChoose={choose}/>}
  <div className="hero-intro-player" aria-label={tr('Headphone animation','حركة سماعات الرأس')}>
   <div className="hero-intro-controls hero-intro-controls-inline" role="group" aria-label={tr('Animation controls','التحكم بالحركة')} aria-busy={playing} dir="ltr">
    {button(tr('Put on headphones','ارتداء سماعات الرأس'),onBegin,<Play size={25} fill="currentColor"/>,playing||!animationReady||frame>0)}
    {button(tr('Take off headphones','خلع سماعات الرأس'),onStop,<Square size={21} fill="currentColor"/>,!animationReady||frame===0)}
    {button(tr('Continue to the next section','المتابعة إلى القسم التالي'),onSkip,<ChevronsDown size={25}/>)}
   </div>
   {!animationReady&&<p className="hero-intro-preparing" role="status">{animationFailed?<>{tr('Animation could not load.','تعذّر تحميل الحركة.')} <button type="button" onClick={onAnimationRetry}>{tr('Retry','إعادة المحاولة')}</button></>:tr('Preparing animation…','جارٍ تجهيز الحركة…')}</p>}
  </div>
 </div>;
}
