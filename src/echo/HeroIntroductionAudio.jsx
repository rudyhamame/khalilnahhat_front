import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Square,RotateCcw,RotateCw,ChevronsDown} from 'lucide-react';
import {keepLanguageChooserOpen} from './languageChooser';
import arabicNarration from './data/heroIntroduction.ar.json';
import englishNarration from './data/heroIntroduction.en.json';
import {createLiveAudioFocus} from '../lib/liveAudioFocus';
import {archivePlayerCommand,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import './heroIntroductionAudio.css';
import {HERO_EQUIPMENT_TIMELINE} from './heroEquipmentCues';
import {HEADER_INTRO_LANGUAGE_KEY} from './i18n';
// The visitor's explicit language choice is remembered in this browser, so a refresh does not ask again.
const LANGUAGE_CHOSEN_KEY='echo-lang-chosen';
const rememberedLanguage=()=>{try{const value=localStorage.getItem(LANGUAGE_CHOSEN_KEY);return value==='ar'||value==='en'?value:null;}catch{return null;}};
const rememberLanguage=value=>{try{if(value)localStorage.setItem(LANGUAGE_CHOSEN_KEY,value);else localStorage.removeItem(LANGUAGE_CHOSEN_KEY);}catch{/* Storage unavailable */}};

const introClock=seconds=>{const total=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;};
function wordAt(narration,time){
 let low=0,high=narration.words.length;
 while(low<high){const mid=(low+high)>>1;if(narration.words[mid].start<=time)low=mid+1;else high=mid;}
 return Math.max(0,low-1);
}

function FullscreenLanguageChooser({onChoose}) {
 const dialog=useRef(null);
 useLayoutEffect(()=>keepLanguageChooserOpen(dialog.current),[]);
 return createPortal(<dialog ref={dialog} className="hero-language-modal" aria-label="Choose your language / اختار لغتك" onCancel={event=>event.preventDefault()}>
  <div className="hero-language-modal-content">
   <div className="hero-language-modal-logos" aria-label="DJ Khalil Nahhat — Echo Event Entertainment">
    <img src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90"/>
    <img src="/echo/echo-event-entertainment-white-original.png" alt="Echo Event Entertainment" width="1392" height="1130"/>
   </div>
   <div className="hero-language-entry" role="group" aria-label="Choose your introduction language / اختار لغة المقدّمة" dir="ltr">
    <button type="button" lang="en" onClick={()=>onChoose('en')}><span className="hero-language-entry-title">Echo</span><span className="hero-language-entry-subtitle">in English</span></button>
    <button type="button" lang="ar" dir="rtl" onClick={()=>onChoose('ar')}><span className="hero-language-entry-title">إيكو</span><span className="hero-language-entry-subtitle">بالعربية</span></button>
   </div>
  </div>
 </dialog>,document.body);
}

export default function HeroIntroductionAudio({lang,onBegin,animationComplete=0,onTransportState,onLanguageSelect,onLanguageReset,onSkip,onStop,animationReady=true,animationFailed=false,onAnimationRetry}){
 const [headerIntroLanguage]=useState(()=>{try{const value=sessionStorage.getItem(HEADER_INTRO_LANGUAGE_KEY);return value==='ar'||value==='en'?value:null;}catch{return null;}});
 const chooseLanguageRef=useRef(null);
 const [selectedLanguage,setSelectedLanguage]=useState(null);
 const [languageChosen,setLanguageChosen]=useState(()=>Boolean(rememberedLanguage()));
 const [chosenLanguage,setChosenLanguage]=useState(()=>headerIntroLanguage||rememberedLanguage()||lang.lang);
 const languageChosenRef=useRef(languageChosen),chosenLanguageRef=useRef(chosenLanguage);
 languageChosenRef.current=languageChosen;chosenLanguageRef.current=chosenLanguage;
 // A remembered language skips the chooser, but the rest of the page (Live, tree, ...) opens on the language choice, so announce it once.
 useEffect(()=>{const saved=rememberedLanguage();if(saved)onLanguageSelect?.(saved);},[]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{window.dispatchEvent(new CustomEvent('echo:hero-language-state',{detail:{selected:languageChosen}}));},[languageChosen]);
 const activeLanguage=selectedLanguage||lang.lang;
 const ar=activeLanguage==='ar';
 const narration=ar?arabicNarration:englishNarration;
 const initialAudioSource=useRef(narration.audio),activeNarration=useRef(narration);activeNarration.current=narration;
 const [phase,setPhase]=useState('idle');
 const [roomEntered,setRoomEntered]=useState(false);
 const phaseRef=useRef('idle'),stagingRef=useRef(false),pendingGreeting=useRef(null),priming=useRef(Promise.resolve());
 const [staging,setStaging]=useState(false);
 const audio=useRef(null),root=useRef(null),focus=useRef(null),request=useRef(0),id=useId();
 const [playing,setPlaying]=useState(false),[waiting,setWaiting]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(narration.duration),[error,setError]=useState('');
 const transportPosition=Math.floor(position*20)/20;
 useEffect(()=>{onTransportState?.({playing:playing&&!waiting&&!staging,language:selectedLanguage});},[playing,waiting,staging,selectedLanguage,onTransportState]);
 // Keep timeline ticks local to the showcase instead of re-rendering the whole homepage.
 useEffect(()=>{window.dispatchEvent(new CustomEvent(HERO_EQUIPMENT_TIMELINE,{detail:{playing:playing&&!waiting&&!staging,language:selectedLanguage,position:transportPosition,started:phase==='started'&&!staging}}));},[playing,waiting,staging,selectedLanguage,transportPosition,phase]);
 const tr=(en,arabic)=>ar?arabic:en;
 const activeWord=wordAt(narration,position);
 const cueIndex=narration.cues.findIndex(cue=>activeWord>=cue.from&&activeWord<cue.to);
 const cue=narration.cues[Math.max(0,cueIndex)];
 const sync=()=>{
  const player=audio.current;if(!player)return;
  const offset=activeNarration.current.playbackOffset||0;
  // Keep even a long image-loading delay inside the silent lead-in.
  if(stagingRef.current){if(offset&&player.currentTime>=offset/2)player.currentTime=0;return;}
  setPosition(Math.max(0,player.currentTime-offset));
 };
 useEffect(()=>{setDuration(narration.duration);setPosition(0);},[narration]);
 useEffect(()=>{
  focus.current=createLiveAudioFocus({onLoseFocus:()=>audio.current?.pause()});
  const unsubscribe=subscribeArchivePlayerState(event=>{if(event.detail?.playing)audio.current?.pause();});
  const hidden=()=>{if(document.hidden)audio.current?.pause();};
  document.addEventListener('visibilitychange',hidden);
  const player=audio.current;
  return()=>{request.current++;player?.pause();focus.current?.close();unsubscribe();document.removeEventListener('visibilitychange',hidden);};
 },[]);
 useEffect(()=>{
  if(!playing)return;
  let frame;
  const tick=()=>{sync();frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing]);
 const startPlayback=async()=>{
  const player=audio.current;if(!player)return;
  const attempt=++request.current;
  setError('');setWaiting(true);
  try{
   if(player.error)player.load();
   const offset=activeNarration.current.playbackOffset||0;
   if(player.readyState>0&&(player.ended||player.currentTime<offset))player.currentTime=offset;
   player.muted=false;player.volume=1;
   focus.current?.claim();archivePlayerCommand('pause');
   await player.play();
   if(attempt!==request.current)player.pause();else{
    if(player.currentTime<offset)player.currentTime=offset;
    setPlaying(!player.paused);sync();
   }
  }catch(e){if(attempt===request.current&&e.name!=='AbortError')setError(tr('The introduction could not play. Please try again.','ما قدرنا نشغّل المقدّمة. جرّب مرّة تانية.'));}
  finally{if(attempt===request.current)setWaiting(false);}
 };
 const pausePlayback=()=>{request.current++;audio.current?.pause();setPlaying(false);setWaiting(false);};
 // Starting playback releases the entry scroll lock. Keep that layout
 // transition at the hero origin instead of restoring a hidden body offset.
 // After a refresh on a later chapter the page restores that chapter; resetting to the hero here would throw the visitor back to VP1 and scroll them down a second time.
 const restoredChapter=()=>{try{const saved=sessionStorage.getItem('echo-home-section');return Boolean(saved&&saved!=='home');}catch{return false;}};
 useLayoutEffect(()=>{if(phase==='started'&&!restoredChapter())window.scrollTo({top:0,behavior:'instant'});},[phase]);
 const chooseLanguage=language=>{
  rememberLanguage(language);setLanguageChosen(true);onLanguageSelect?.(language);
  try{sessionStorage.removeItem(HEADER_INTRO_LANGUAGE_KEY);}catch{/* Storage unavailable */}
  const attempt=++request.current;
  const nextNarration=language==='ar'?arabicNarration:englishNarration;
  activeNarration.current=nextNarration;
  phaseRef.current='started';setPhase('started');
  setRoomEntered(true);
  setChosenLanguage(language);setSelectedLanguage(language);lang.setLanguage(language);setPosition(0);setError('');
  stagingRef.current=true;setStaging(true);pendingGreeting.current={language,attempt};
  const player=audio.current;
  if(player){
   // Start the actual, unmuted media element in the start gesture. Its silent
   // lead-in holds playback until the character is ready. Safari therefore
   // needs neither a later unmute nor a second user gesture to hear the voice.
   player.pause();player.src=nextNarration.audio;player.load();
   player.muted=false;player.volume=1;
   priming.current=player.play().then(()=>{}).catch(()=>{});
  }else{priming.current=Promise.resolve();}
  setPlaying(false);setWaiting(false);
  onBegin?.(language);
 };
 chooseLanguageRef.current=chooseLanguage;
 useEffect(()=>{
  if(!animationComplete||!pendingGreeting.current)return;
  const pending=pendingGreeting.current;
  let cancelled=false;
  priming.current.then(()=>{
   if(cancelled||pendingGreeting.current!==pending||request.current!==pending.attempt)return;
   pendingGreeting.current=null;stagingRef.current=false;setStaging(false);
   if(audio.current){if(audio.current.readyState>0)audio.current.currentTime=activeNarration.current.playbackOffset||0;audio.current.volume=1;}
   void startPlayback();
  });
  return()=>{cancelled=true;};
 },[animationComplete]);
 useEffect(()=>{
  if(window.location.hash||restoredChapter())return;
  window.scrollTo({top:0,behavior:'instant'});
 },[]);
 useEffect(()=>{
  let queuedTouchLanguage=null;
  const enter=event=>{
   if(event?.type==='echo:hero-language-request'){
    request.current++;pendingGreeting.current=null;stagingRef.current=false;setStaging(false);
    audio.current?.pause();setPlaying(false);setWaiting(false);setPosition(0);setError('');
    rememberLanguage(null);setLanguageChosen(false);setSelectedLanguage(null);setRoomEntered(false);
    phaseRef.current='idle';setPhase('idle');onLanguageReset?.();
    try{sessionStorage.removeItem(HEADER_INTRO_LANGUAGE_KEY);}catch{/* Storage unavailable */}
    root.current?.closest('.hero-introduction')?.scrollIntoView({block:'start',behavior:'instant'});
    requestAnimationFrame(()=>document.querySelector('.hero-language-modal .hero-language-entry button')?.focus({preventScroll:true}));
    return;
   }
   if(event?.target?.closest?.('.echo-project-chat'))return;
   if(!languageChosenRef.current)return;
   if(root.current?.dataset.welcomePending!=='true'||document.querySelector('dialog[open]'))return;
   if(event?.cancelable)event.preventDefault();event?.stopImmediatePropagation?.();
   window.scrollTo({top:0,behavior:'instant'});
   // iPad grants media activation on touchend, not during touchmove.
   if(event?.type==='touchmove'){queuedTouchLanguage=chosenLanguageRef.current;setRoomEntered(true);return;}
   chooseLanguageRef.current?.(chosenLanguageRef.current);
  };
  const wheel=event=>{if(document.documentElement.classList.contains('echo-nav-only-scroll'))return;if(!event.ctrlKey&&event.deltaY>0&&Math.abs(event.deltaY)>=Math.abs(event.deltaX))enter(event);};
  const key=event=>{if(document.documentElement.classList.contains('echo-nav-only-scroll'))return;if(['ArrowDown','PageDown'].includes(event.key)||event.key===' '&&!event.shiftKey)enter(event);};
  let y=null;
  const touchStart=event=>{y=event.target.closest?.('.echo-project-chat')?null:event.touches[0]?.clientY??null;};
  const touchMove=event=>{if(document.documentElement.classList.contains('echo-nav-only-scroll'))return;if(y!==null&&y-event.touches[0].clientY>8)enter(event);};
  const touchEnd=()=>{y=null;if(queuedTouchLanguage){const language=queuedTouchLanguage;queuedTouchLanguage=null;chooseLanguageRef.current?.(language);}};
  const touchCancel=()=>{y=null;queuedTouchLanguage=null;};
  window.addEventListener('echo:hero-language-request',enter);
  window.addEventListener('wheel',wheel,{capture:true,passive:false});
  window.addEventListener('keydown',key,true);
  window.addEventListener('touchstart',touchStart,{capture:true,passive:true});
  window.addEventListener('touchmove',touchMove,{capture:true,passive:false});
  window.addEventListener('touchend',touchEnd,true);window.addEventListener('touchcancel',touchCancel,true);
  return()=>{window.removeEventListener('echo:hero-language-request',enter);window.removeEventListener('wheel',wheel,true);window.removeEventListener('keydown',key,true);window.removeEventListener('touchstart',touchStart,true);window.removeEventListener('touchmove',touchMove,true);window.removeEventListener('touchend',touchEnd,true);window.removeEventListener('touchcancel',touchCancel,true);};
 },[]);
 const seek=value=>{if(audio.current&&Number.isFinite(value)){audio.current.currentTime=(narration.playbackOffset||0)+Math.max(0,Math.min(duration,value));sync();}};
 return <div ref={root} className="hero-audio-introduction" data-room-entered={roomEntered?'true':'false'} data-welcome-pending={phase==='idle'?'true':undefined} data-started={position>0||playing?true:undefined}>
  {/* The curved lyrics over the record are removed; the sentence now shows as a subtitle above the player. */}
  {!languageChosen&&<FullscreenLanguageChooser onChoose={language=>{rememberLanguage(language);setChosenLanguage(language);lang.setLanguage(language);setLanguageChosen(true);onLanguageSelect?.(language);}}/>}
  <div className="hero-intro-player" aria-label={tr('Echo introduction — English','مقدّمة إيكو — بالعربي')}>
   <div className="hero-intro-meta"><span>{tr('ECHO GREETING','ترحيب إيكو')}</span><time dir="ltr">{introClock(position)} / {introClock(duration)}</time></div>
   <p className={`hero-intro-subtitle${phase==='started'&&!staging&&(playing||position>0)&&cue?'':' is-idle'}`} dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'} aria-hidden="true">{phase==='started'&&!staging&&(playing||position>0)&&cue?narration.words.slice(cue.from,cue.to).map((word,offset)=>{const index=cue.from+offset;return <span key={index} className={index===activeWord?'is-active':index<activeWord?'is-said':undefined}>{word.text} </span>;}):tr('Press play to hear Echo’s greeting.','اضغط تشغيل لسماع ترحيب إيكو.')}</p>
   <input type="range" className="hero-intro-seek" aria-label={tr('Greeting position','موضع الترحيب')} min="0" max={duration||1} step="0.1" value={Math.min(position,duration||1)} disabled={staging||phase!=='started'} style={{'--seek':`${duration?Math.min(100,position/duration*100):0}%`}} onChange={event=>seek(Number(event.target.value))}/>
   <div className="hero-intro-controls hero-intro-controls-inline" role="group" aria-label={tr('Introduction playback','التحكم بالمقدّمة')} aria-busy={staging||waiting} dir="ltr">
   <button type="button" className="hero-intro-launch hero-intro-transport-button" disabled={staging||waiting||!animationReady} aria-controls={`intro-audio-${id}`} aria-busy={staging||waiting||!animationReady} aria-label={chosenLanguage==='ar'?(playing&&chosenLanguage===selectedLanguage?'إيقاف المقدّمة مؤقتاً':'تشغيل المقدّمة بالعربية'):(playing&&chosenLanguage===selectedLanguage?'Pause introduction':'Play introduction in English')} onClick={()=>{if(selectedLanguage!==chosenLanguage||phase!=='started')chooseLanguage(chosenLanguage);else if(playing)pausePlayback();else void startPlayback();}}>
    <span className="hero-intro-launch-face" aria-hidden="true">
     <svg viewBox="0 0 100 100" focusable="false">
      <defs><linearGradient id={`intro-gold-${id}`} x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#fff0ba"/><stop offset=".35" stopColor="#d9b46e"/><stop offset=".7" stopColor="#ab7c3e"/><stop offset="1" stopColor="#e3c184"/></linearGradient></defs>
      {playing&&chosenLanguage===selectedLanguage?<g fill={`url(#intro-gold-${id})`} stroke="#f2d79b" strokeWidth="1.4"><rect x="30" y="24" width="14" height="52" rx="4"/><rect x="57" y="24" width="14" height="52" rx="4"/></g>:<path d="M34 21 Q29 18 29 25 L29 75 Q29 82 35 79 L78 55 Q85 50 78 46 Z" fill={`url(#intro-gold-${id})`} stroke="#f2d79b" strokeWidth="1.4"/>}
     </svg>
    </span>
   </button>
    <button type="button" className="hero-intro-launch hero-intro-transport-button" disabled={staging||phase!=='started'} onClick={()=>seek((audio.current?.currentTime||0)-(narration.playbackOffset||0)-10)} aria-label={tr('Rewind 10 seconds','رجوع ١٠ ثواني')} title={tr('Rewind 10 seconds','رجوع ١٠ ثواني')}><span className="hero-intro-launch-face" aria-hidden="true"><span className="hero-intro-control-symbol"><RotateCcw size={25}/><span className="hero-intro-skip-seconds">10</span></span></span></button>
    <button type="button" className="hero-intro-launch hero-intro-transport-button" disabled={staging||phase!=='started'} onClick={()=>{pendingGreeting.current=null;pausePlayback();seek(0);phaseRef.current='idle';setPhase('idle');onStop?.();}} aria-label={tr('Stop introduction','إيقاف المقدّمة')} title={tr('Stop','إيقاف')}><span className="hero-intro-launch-face" aria-hidden="true"><span className="hero-intro-control-symbol"><Square size={21} fill="currentColor"/></span></span></button>
    <button type="button" className="hero-intro-launch hero-intro-transport-button" disabled={staging||phase!=='started'} onClick={()=>seek((audio.current?.currentTime||0)-(narration.playbackOffset||0)+10)} aria-label={tr('Forward 10 seconds','تقديم ١٠ ثواني')} title={tr('Forward 10 seconds','تقديم ١٠ ثواني')}><span className="hero-intro-launch-face" aria-hidden="true"><span className="hero-intro-control-symbol"><RotateCw size={25}/><span className="hero-intro-skip-seconds">10</span></span></span></button>
    {/* The skip arrow sits at the bottom of the greeting viewport, bobbing downwards to invite a click. */}
    {(()=>{const button=<button type="button" className="hero-intro-launch hero-intro-transport-button hero-intro-skip-down" onClick={()=>{pendingGreeting.current=null;stagingRef.current=false;setStaging(false);pausePlayback();/* Skipping also leaves the entry screen: its scroll lock must be released before the page moves on. */if(phaseRef.current==='idle'){phaseRef.current='started';setPhase('started');setRoomEntered(true);}requestAnimationFrame(()=>requestAnimationFrame(()=>onSkip?.()));}} aria-label={tr('Skip introduction','تخطّي المقدّمة')} title={tr('Skip introduction','تخطّي المقدّمة')}><span className="hero-intro-launch-face" aria-hidden="true"><span className="hero-intro-control-symbol"><ChevronsDown size={34} strokeWidth={2.4}/></span></span></button>;const host=typeof document!=='undefined'?document.querySelector('.echo-artist-sequence'):null;return host?createPortal(button,host):button;})()}
   </div>
   {/* No "Preparing animation…" line while it loads; only a real failure is shown, with a retry. */}{!animationReady&&animationFailed&&<p className="hero-intro-preparing" role="status">{tr('Animation could not load.','تعذّر تحميل الحركة.')} <button type="button" onClick={onAnimationRetry}>{tr('Retry','إعادة المحاولة')}</button></p>}
   {error&&<p role="alert" className="hero-intro-error">{error}</p>}
  </div>
  {phase==='started'&&!staging&&<p className="curved-intro-accessible" dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'} aria-live="polite" aria-atomic="true">{cue.text}</p>}
  <audio id={`intro-audio-${id}`} ref={audio} preload="auto" playsInline src={initialAudioSource.current} lang={ar?'ar':'en'} onLoadedMetadata={()=>{const value=audio.current.duration-(activeNarration.current.playbackOffset||0);if(Number.isFinite(value))setDuration(value);}} onTimeUpdate={sync} onSeeked={sync} onPlaying={()=>{if(!stagingRef.current){setPlaying(true);setWaiting(false);}}} onPause={()=>{if(!stagingRef.current){setPlaying(false);setWaiting(false);sync();}}} onWaiting={()=>{if(!stagingRef.current)setWaiting(true);}} onEnded={()=>{setPlaying(false);setWaiting(false);sync();}} onError={()=>{if(!stagingRef.current){setPlaying(false);setWaiting(false);setError(tr('The introduction is unavailable. Please try again.','المقدّمة مو متاحة هلّق. جرّبوا مرّة تانية.'));}}}/>
 </div>;
}
